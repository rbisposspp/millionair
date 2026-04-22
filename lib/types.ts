export type AgeBand = "young learner" | "teen" | "adult";
export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1";
export type LifelineType = "fifty_fifty" | "bobby" | "skip";
export type QuestionType =
  | "grammar"
  | "vocabulary"
  | "speaking"
  | "listening"
  | "functional"
  | "roleplay"
  | "image-description";
export type QuestionModality = "text" | "image" | "audio" | "image_text" | "audio_text";
export type Speaker = "teacher" | "student";

export interface SessionInput {
  teacherName: string;
  studentName: string;
  ageBand: AgeBand;
  topic: string;
}

export interface QuestionAsset {
  kind: "image" | "audio";
  storagePath: string;
  mimeType: string;
  publicUrl?: string;
  durationSeconds?: number;
  altText?: string;
}

export interface QuestionLifelines {
  fiftyFifty: string;
  bobby: string;
  skip: string;
}

export interface QuestionOption {
  id: string;
  label: string;
  text: string;
}

export interface Question {
  id: string;
  level: CEFRLevel;
  type: QuestionType;
  modality: QuestionModality;
  topic: string;
  prompt: string;
  options: QuestionOption[];
  correctOptionId: string;
  explanation: string;
  targetLanguage: string[];
  lifelines: QuestionLifelines;
  active: boolean;
  timesUsed: number;
  asset?: QuestionAsset;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicQuestion extends Question {
  assetUrl?: string;
  eliminatedOptionIds?: string[];
}

export interface QuestionAttempt {
  questionId: string;
  questionPrompt: string;
  selectedOptionId: string;
  selectedOptionText: string;
  correctOptionId: string;
  correctOptionText: string;
  wasCorrect: boolean;
  bobbyReply: string;
  languageNote?: string;
  performance: "needs_support" | "on_track" | "strong";
  createdAt: string;
}

export interface SessionState extends SessionInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  selectedQuestionIds: string[];
  usedLifelines: LifelineType[];
  eliminatedOptions: Record<string, string[]>;
  activities: string[];
  languageNotes: string[];
  attempts: QuestionAttempt[];
  prizeLabel?: string;
  status: "active" | "lost" | "completed" | "summarized";
  summary?: SessionSummary;
}

export interface RecentMessage {
  speaker: Speaker | "bobby";
  text: string;
}

export interface BobbyChatResponse {
  reply: string;
  suggestedOptionId?: string;
  suggestedOptionLabel?: string;
  languageNote?: string;
  performance?: QuestionAttempt["performance"];
}

export interface LifelineResponse {
  type: LifelineType;
  hint: string;
  usedLifelines: LifelineType[];
}

export interface ImageActivityResponse {
  prompt: string;
  mimeType: string;
  imageData: string;
}

export interface SessionSummary {
  overview: string;
  activitiesUsed: string[];
  languageFocus: string[];
  suggestedNextStep: string;
}

export interface CreateSessionResponse {
  session: SessionState;
  question: PublicQuestion;
}
