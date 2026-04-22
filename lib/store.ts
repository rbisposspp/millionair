import { FieldValue, Firestore } from "@google-cloud/firestore";
import { resolveAssetUrl } from "./media";
import { seedQuestions } from "./question-bank";
import type {
  CreateSessionResponse,
  LifelineType,
  PublicQuestion,
  Question,
  QuestionAttempt,
  SessionInput,
  SessionState,
  SessionSummary,
} from "./types";

interface SessionStore {
  createSession(input: SessionInput): Promise<CreateSessionResponse>;
  getSession(id: string): Promise<SessionState>;
  getQuestion(id: string): Promise<Question>;
  getCurrentQuestion(id: string): Promise<PublicQuestion>;
  recordAnswer(id: string, attempt: QuestionAttempt): Promise<SessionState>;
  useFiftyFifty(id: string, questionId: string): Promise<{ session: SessionState; removedOptionId: string }>;
  markLifelineUsed(id: string, type: LifelineType): Promise<SessionState>;
  skipQuestion(id: string, questionId: string): Promise<SessionState>;
  addActivity(id: string, activity: string): Promise<SessionState>;
  saveSummary(id: string, summary: SessionSummary): Promise<SessionState>;
}

const sessionsCollection = "bobbyLiveSessions";
const questionsCollection = "questions";
const levelOrder = ["A1", "A2", "B1", "B2", "C1"] as const;
const questionsPerLevel = 5;
const totalQuestionCount = levelOrder.length * questionsPerLevel;
const prizeLabel = "BIG Corn Milhao";
const memorySessions = new Map<string, SessionState>();
const memoryQuestions = new Map(seedQuestions.map((question) => [question.id, question]));

function now(): string {
  return new Date().toISOString();
}

function createId(): string {
  return crypto.randomUUID();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function pickLeastUsedRandom(candidates: Question[], selectedIds: Set<string>): Question | undefined {
  const available = candidates.filter((question) => !selectedIds.has(question.id));
  if (!available.length) {
    return undefined;
  }

  const sorted = [...available].sort((left, right) => left.timesUsed - right.timesUsed);
  const lowestUsage = sorted[0].timesUsed;
  const leastUsed = sorted.filter((question) => question.timesUsed <= lowestUsage + 1);
  return shuffle(leastUsed)[0];
}

function selectGameQuestions(candidates: Question[]): Question[] {
  const selected: Question[] = [];
  const selectedIds = new Set<string>();

  levelOrder.forEach((level) => {
    const levelCandidates = candidates.filter((question) => question.level === level);
    if (levelCandidates.length < questionsPerLevel) {
      throw new Error(`Question bank needs at least ${questionsPerLevel} active questions for ${level}.`);
    }

    for (let index = 0; index < questionsPerLevel; index += 1) {
      const picked = pickLeastUsedRandom(levelCandidates, selectedIds);
      if (!picked) {
        throw new Error(`Not enough unique active questions to build the ${level} block.`);
      }

      selected.push(picked);
      selectedIds.add(picked.id);
    }
  });

  return selected;
}

async function toPublicQuestion(question: Question, session?: SessionState): Promise<PublicQuestion> {
  return {
    ...question,
    assetUrl: await resolveAssetUrl(question.asset),
    eliminatedOptionIds: session?.eliminatedOptions[question.id] ?? [],
  };
}

function createSessionState(input: SessionInput, selectedQuestions: Question[]): SessionState {
  const timestamp = now();
  return {
    ...input,
    id: createId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    totalQuestions: totalQuestionCount,
    currentQuestionIndex: 0,
    selectedQuestionIds: selectedQuestions.map((question) => question.id),
    usedLifelines: [],
    eliminatedOptions: {},
    activities: ["Game started"],
    languageNotes: [],
    attempts: [],
    prizeLabel,
    status: "active",
  };
}

function advanceSession(session: SessionState, activity: string, status: SessionState["status"] = "active"): SessionState {
  const nextIndex = session.currentQuestionIndex + 1;
  const didFinish = nextIndex >= session.totalQuestions;
  return {
    ...session,
    currentQuestionIndex: didFinish ? session.totalQuestions - 1 : nextIndex,
    activities: [...session.activities, activity],
    updatedAt: now(),
    status: didFinish ? "completed" : status,
  };
}

function assertCurrentQuestion(session: SessionState, questionId: string): void {
  const currentId = session.selectedQuestionIds[session.currentQuestionIndex];
  if (currentId !== questionId) {
    throw new Error("This action only works on the current question.");
  }
}

function chooseWrongOptionToRemove(question: Question, removedOptionIds: string[]): string {
  const wrongOptions = question.options.filter(
    (option) => option.id !== question.correctOptionId && !removedOptionIds.includes(option.id),
  );

  if (!wrongOptions.length) {
    throw new Error("No more wrong options can be removed for this question.");
  }

  return shuffle(wrongOptions)[0].id;
}

class MemorySessionStore implements SessionStore {
  async createSession(input: SessionInput): Promise<CreateSessionResponse> {
    const candidates = [...memoryQuestions.values()].filter((question) => question.active);
    const selectedQuestions = selectGameQuestions(candidates);
    selectedQuestions.forEach((question) => {
      const current = memoryQuestions.get(question.id);
      if (current) {
        memoryQuestions.set(question.id, { ...current, timesUsed: current.timesUsed + 1, updatedAt: now() });
      }
    });

    const session = createSessionState(input, selectedQuestions);
    memorySessions.set(session.id, session);
    return {
      session: clone(session),
      question: await toPublicQuestion(selectedQuestions[0], session),
    };
  }

  async getSession(id: string): Promise<SessionState> {
    const session = memorySessions.get(id);
    if (!session) {
      throw new Error("Session not found.");
    }

    return clone(session);
  }

  async getQuestion(id: string): Promise<Question> {
    const question = memoryQuestions.get(id);
    if (!question) {
      throw new Error("Question not found.");
    }

    return clone(question);
  }

  async getCurrentQuestion(id: string): Promise<PublicQuestion> {
    const session = await this.getSession(id);
    const questionId = session.selectedQuestionIds[session.currentQuestionIndex];
    if (!questionId) {
      throw new Error("This session has no current question.");
    }

    return toPublicQuestion(await this.getQuestion(questionId), session);
  }

  async recordAnswer(id: string, attempt: QuestionAttempt): Promise<SessionState> {
    const session = await this.getSession(id);
    assertCurrentQuestion(session, attempt.questionId);
    const nextSession: SessionState = attempt.wasCorrect
      ? advanceSession(
          {
            ...session,
            attempts: [...session.attempts, attempt],
            languageNotes: [...session.languageNotes, attempt.languageNote ?? ""].filter(Boolean),
          },
          `Answered correctly: ${attempt.questionId}`,
        )
      : {
          ...session,
          attempts: [...session.attempts, attempt],
          activities: [...session.activities, `Answered incorrectly: ${attempt.questionId}`],
          languageNotes: [...session.languageNotes, attempt.languageNote ?? ""].filter(Boolean),
          updatedAt: now(),
          status: "lost",
        };

    memorySessions.set(id, nextSession);
    return clone(nextSession);
  }

  async useFiftyFifty(id: string, questionId: string): Promise<{ session: SessionState; removedOptionId: string }> {
    const session = await this.getSession(id);
    assertCurrentQuestion(session, questionId);
    if (session.usedLifelines.includes("fifty_fifty")) {
      throw new Error("Cut One Wrong Option has already been used.");
    }

    const question = await this.getQuestion(questionId);
    const removedOptionId = chooseWrongOptionToRemove(question, session.eliminatedOptions[questionId] ?? []);
    const updated: SessionState = {
      ...session,
      usedLifelines: [...session.usedLifelines, "fifty_fifty"],
      eliminatedOptions: {
        ...session.eliminatedOptions,
        [questionId]: [...(session.eliminatedOptions[questionId] ?? []), removedOptionId],
      },
      activities: [...session.activities, `Lifeline: ${questionId}/fifty_fifty`],
      updatedAt: now(),
    };

    memorySessions.set(id, updated);
    return { session: clone(updated), removedOptionId };
  }

  async markLifelineUsed(id: string, type: LifelineType): Promise<SessionState> {
    const session = await this.getSession(id);
    if (session.usedLifelines.includes(type)) {
      throw new Error(`${type} has already been used.`);
    }

    const updated: SessionState = {
      ...session,
      usedLifelines: [...session.usedLifelines, type],
      activities: [...session.activities, `Lifeline used: ${type}`],
      updatedAt: now(),
    };

    memorySessions.set(id, updated);
    return clone(updated);
  }

  async skipQuestion(id: string, questionId: string): Promise<SessionState> {
    const session = await this.getSession(id);
    assertCurrentQuestion(session, questionId);
    if (session.usedLifelines.includes("skip")) {
      throw new Error("Skip Question has already been used.");
    }

    const updated = advanceSession(
      {
        ...session,
        usedLifelines: [...session.usedLifelines, "skip"],
      },
      `Skipped question: ${questionId}`,
    );
    memorySessions.set(id, updated);
    return clone(updated);
  }

  async addActivity(id: string, activity: string): Promise<SessionState> {
    const session = await this.getSession(id);
    const updated = {
      ...session,
      activities: [...session.activities, activity],
      updatedAt: now(),
    };
    memorySessions.set(id, updated);
    return clone(updated);
  }

  async saveSummary(id: string, summary: SessionSummary): Promise<SessionState> {
    const session = await this.getSession(id);
    const updated = {
      ...session,
      summary,
      status: "summarized" as const,
      updatedAt: now(),
    };
    memorySessions.set(id, updated);
    return clone(updated);
  }
}

class FirestoreSessionStore implements SessionStore {
  private readonly firestore = new Firestore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    databaseId: process.env.FIRESTORE_DATABASE_ID || undefined,
  });

  async createSession(input: SessionInput): Promise<CreateSessionResponse> {
    const snapshot = await this.firestore.collection(questionsCollection).where("active", "==", true).get();
    const candidates = snapshot.docs.map((doc) => doc.data() as Question);
    const selectedQuestions = selectGameQuestions(candidates);
    const session = createSessionState(input, selectedQuestions);
    const batch = this.firestore.batch();

    batch.set(this.firestore.collection(sessionsCollection).doc(session.id), session);
    selectedQuestions.forEach((question) => {
      batch.update(this.firestore.collection(questionsCollection).doc(question.id), {
        timesUsed: FieldValue.increment(1),
        updatedAt: now(),
      });
    });

    await batch.commit();
    return {
      session,
      question: await toPublicQuestion(selectedQuestions[0], session),
    };
  }

  async getSession(id: string): Promise<SessionState> {
    const snapshot = await this.firestore.collection(sessionsCollection).doc(id).get();
    if (!snapshot.exists) {
      throw new Error("Session not found.");
    }

    return snapshot.data() as SessionState;
  }

  async getQuestion(id: string): Promise<Question> {
    const snapshot = await this.firestore.collection(questionsCollection).doc(id).get();
    if (!snapshot.exists) {
      throw new Error("Question not found.");
    }

    return snapshot.data() as Question;
  }

  async getCurrentQuestion(id: string): Promise<PublicQuestion> {
    const session = await this.getSession(id);
    const questionId = session.selectedQuestionIds[session.currentQuestionIndex];
    if (!questionId) {
      throw new Error("This session has no current question.");
    }

    return toPublicQuestion(await this.getQuestion(questionId), session);
  }

  async recordAnswer(id: string, attempt: QuestionAttempt): Promise<SessionState> {
    const session = await this.getSession(id);
    assertCurrentQuestion(session, attempt.questionId);
    const nextIndex = session.currentQuestionIndex + 1;
    const didFinish = nextIndex >= session.totalQuestions;
    const ref = this.firestore.collection(sessionsCollection).doc(id);

    await ref.update({
      attempts: FieldValue.arrayUnion(attempt),
      activities: FieldValue.arrayUnion(
        attempt.wasCorrect ? `Answered correctly: ${attempt.questionId}` : `Answered incorrectly: ${attempt.questionId}`,
      ),
      languageNotes: attempt.languageNote ? FieldValue.arrayUnion(attempt.languageNote) : session.languageNotes,
      currentQuestionIndex: attempt.wasCorrect ? (didFinish ? session.totalQuestions - 1 : nextIndex) : session.currentQuestionIndex,
      status: attempt.wasCorrect ? (didFinish ? "completed" : "active") : "lost",
      updatedAt: now(),
    });

    return this.getSession(id);
  }

  async useFiftyFifty(id: string, questionId: string): Promise<{ session: SessionState; removedOptionId: string }> {
    const session = await this.getSession(id);
    assertCurrentQuestion(session, questionId);
    if (session.usedLifelines.includes("fifty_fifty")) {
      throw new Error("Cut One Wrong Option has already been used.");
    }

    const question = await this.getQuestion(questionId);
    const removedOptionId = chooseWrongOptionToRemove(question, session.eliminatedOptions[questionId] ?? []);
    const ref = this.firestore.collection(sessionsCollection).doc(id);
    await ref.update({
      usedLifelines: FieldValue.arrayUnion("fifty_fifty"),
      [`eliminatedOptions.${questionId}`]: FieldValue.arrayUnion(removedOptionId),
      activities: FieldValue.arrayUnion(`Lifeline: ${questionId}/fifty_fifty`),
      updatedAt: now(),
    });

    return { session: await this.getSession(id), removedOptionId };
  }

  async markLifelineUsed(id: string, type: LifelineType): Promise<SessionState> {
    const session = await this.getSession(id);
    if (session.usedLifelines.includes(type)) {
      throw new Error(`${type} has already been used.`);
    }

    const ref = this.firestore.collection(sessionsCollection).doc(id);
    await ref.update({
      usedLifelines: FieldValue.arrayUnion(type),
      activities: FieldValue.arrayUnion(`Lifeline used: ${type}`),
      updatedAt: now(),
    });
    return this.getSession(id);
  }

  async skipQuestion(id: string, questionId: string): Promise<SessionState> {
    const session = await this.getSession(id);
    assertCurrentQuestion(session, questionId);
    if (session.usedLifelines.includes("skip")) {
      throw new Error("Skip Question has already been used.");
    }

    const nextIndex = session.currentQuestionIndex + 1;
    const didFinish = nextIndex >= session.totalQuestions;
    const ref = this.firestore.collection(sessionsCollection).doc(id);
    await ref.update({
      usedLifelines: FieldValue.arrayUnion("skip"),
      activities: FieldValue.arrayUnion(`Skipped question: ${questionId}`),
      currentQuestionIndex: didFinish ? session.totalQuestions - 1 : nextIndex,
      status: didFinish ? "completed" : "active",
      updatedAt: now(),
    });

    return this.getSession(id);
  }

  async addActivity(id: string, activity: string): Promise<SessionState> {
    const ref = this.firestore.collection(sessionsCollection).doc(id);
    await ref.update({
      activities: FieldValue.arrayUnion(activity),
      updatedAt: now(),
    });
    return this.getSession(id);
  }

  async saveSummary(id: string, summary: SessionSummary): Promise<SessionState> {
    const ref = this.firestore.collection(sessionsCollection).doc(id);
    await ref.update({
      summary,
      status: "summarized",
      updatedAt: now(),
    });
    return this.getSession(id);
  }
}

export const sessionStore: SessionStore =
  process.env.BOBBY_USE_MEMORY_STORE === "1" ? new MemorySessionStore() : new FirestoreSessionStore();
