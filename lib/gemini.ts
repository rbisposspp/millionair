import { GoogleGenAI, Type } from "@google/genai";
import { bobbySystemPrompt } from "./bobby";
import type {
  BobbyChatResponse,
  ImageActivityResponse,
  LifelineType,
  PublicQuestion,
  Question,
  QuestionAttempt,
  SessionState,
  SessionSummary,
} from "./types";

const textModel = "gemini-3-flash-preview";
const imageModel = "gemini-3.1-flash-image-preview";

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required for Gemini API calls.");
  }

  return new GoogleGenAI({ apiKey });
}

function parseJsonObject<T>(text: string, context: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error(`${context} returned invalid JSON: ${(error as Error).message}`);
  }
}

function fallbackBobbyGuess(question: PublicQuestion): BobbyChatResponse {
  const guess = question.options[0];
  return {
    reply: `My guess is ${guess.label}. ${guess.text}`,
    suggestedOptionId: guess.id,
    suggestedOptionLabel: guess.label,
    performance: "on_track",
  };
}

export async function generateBobbyAdvice(
  session: SessionState,
  question: PublicQuestion,
): Promise<BobbyChatResponse> {
  if (!process.env.GEMINI_API_KEY) {
    return fallbackBobbyGuess(question);
  }

  const ai = client();
  const optionsText = question.options.map((option) => `${option.label}. ${option.text}`).join("\n");
  const response = await ai.models.generateContent({
    model: textModel,
    contents: [
      bobbySystemPrompt(session),
      "You are giving a risky multiple-choice opinion. You may be wrong.",
      `Question (${question.level}, ${question.type}, ${question.modality}): ${question.prompt}`,
      `Options:\n${optionsText}`,
      "Return only JSON that matches the schema.",
      "Pick one option label and give one short reason in warm, game-show English.",
    ].join("\n\n"),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          suggestedOptionLabel: { type: Type.STRING },
        },
        required: ["reply", "suggestedOptionLabel"],
      },
    },
  });

  const parsed = parseJsonObject<{ reply: string; suggestedOptionLabel: string }>(
    response.text ?? "",
    "Bobby lifeline",
  );
  const matchedOption =
    question.options.find((option) => option.label === parsed.suggestedOptionLabel.trim().toUpperCase()) ??
    question.options[0];

  return {
    reply: parsed.reply,
    suggestedOptionId: matchedOption.id,
    suggestedOptionLabel: matchedOption.label,
    performance: "on_track",
  };
}

export async function narrateAnswerResult(
  session: SessionState,
  question: Question,
  attempt: QuestionAttempt,
): Promise<BobbyChatResponse> {
  const selected = question.options.find((option) => option.id === attempt.selectedOptionId);
  const correct = question.options.find((option) => option.id === question.correctOptionId);
  const fallbackReply = attempt.wasCorrect
    ? `Correct. ${correct?.label} was the best answer. ${question.explanation}`
    : `Wrong answer. The correct option was ${correct?.label}. ${correct?.text}`;

  if (!process.env.GEMINI_API_KEY) {
    return {
      reply: fallbackReply,
      languageNote: question.explanation,
      performance: attempt.wasCorrect ? "strong" : "needs_support",
    };
  }

  const ai = client();
  const response = await ai.models.generateContent({
    model: textModel,
    contents: [
      bobbySystemPrompt(session),
      `Question: ${question.prompt}`,
      `Student picked: ${selected?.label}. ${selected?.text}`,
      `Correct option: ${correct?.label}. ${correct?.text}`,
      `Was correct: ${attempt.wasCorrect ? "yes" : "no"}`,
      `Explanation: ${question.explanation}`,
      "Return only JSON that matches the schema.",
      "If the player is correct, celebrate briefly and point to why the answer works.",
      "If the player is wrong, reveal the correct option clearly and end with a short encouraging line.",
    ].join("\n\n"),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reply: { type: Type.STRING },
          languageNote: { type: Type.STRING },
          performance: {
            type: Type.STRING,
            enum: ["needs_support", "on_track", "strong"],
          },
        },
        required: ["reply", "performance"],
      },
    },
  });

  const parsed = parseJsonObject<Omit<BobbyChatResponse, "suggestedOptionId" | "suggestedOptionLabel">>(
    response.text ?? "",
    "Bobby answer result",
  );

  return {
    reply: parsed.reply,
    languageNote: parsed.languageNote || question.explanation,
    performance: parsed.performance ?? (attempt.wasCorrect ? "strong" : "needs_support"),
  };
}

export async function generateImageActivity(
  session: SessionState,
  description: string,
): Promise<ImageActivityResponse> {
  const ai = client();
  const prompt = [
    `Create an age-appropriate ESL classroom image for a ${session.currentQuestionIndex + 1} question game round.`,
    `Topic: ${session.topic}.`,
    `Student description: ${description}`,
    "Make it friendly, clear, educational, and free of text overlays.",
  ].join(" ");

  const response = await ai.models.generateContent({
    model: imageModel,
    contents: prompt,
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K",
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((part) => part.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini did not return an image for this prompt.");
  }

  return {
    prompt,
    mimeType: imagePart.inlineData.mimeType ?? "image/png",
    imageData: imagePart.inlineData.data,
  };
}

export async function generateSummary(session: SessionState): Promise<SessionSummary> {
  const attemptLines = session.attempts
    .map(
      (attempt, index) =>
        `${index + 1}. ${attempt.questionPrompt}\nPicked: ${attempt.selectedOptionText}\nCorrect: ${attempt.correctOptionText}\nResult: ${attempt.wasCorrect ? "correct" : "wrong"}`,
    )
    .join("\n\n");

  if (!process.env.GEMINI_API_KEY) {
    return {
      overview:
        session.status === "completed"
          ? `${session.studentName} completed all ${session.totalQuestions} questions and reached the BIG Corn prize.`
          : `${session.studentName} stopped on question ${session.currentQuestionIndex + 1} after one wrong answer.`,
      activitiesUsed: session.activities,
      languageFocus: session.languageNotes.slice(-5),
      suggestedNextStep: "Replay the ladder and review the explanations from the missed items.",
    };
  }

  const ai = client();
  const response = await ai.models.generateContent({
    model: textModel,
    contents: [
      bobbySystemPrompt(session),
      "Create a concise teacher-facing summary for this Millionaire-style ESL game.",
      `Game status: ${session.status}`,
      `Activities used: ${session.activities.join(", ") || "none"}`,
      `Language notes: ${session.languageNotes.join(" | ") || "none"}`,
      `Attempts:\n${attemptLines || "none"}`,
      "Return only JSON that matches the schema.",
    ].join("\n\n"),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overview: { type: Type.STRING },
          activitiesUsed: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          languageFocus: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          suggestedNextStep: { type: Type.STRING },
        },
        required: ["overview", "activitiesUsed", "languageFocus", "suggestedNextStep"],
      },
    },
  });

  return parseJsonObject<SessionSummary>(response.text ?? "", "Session summary");
}

export function toAttempt(question: Question, selectedOptionId: string, wasCorrect: boolean): QuestionAttempt {
  const selected = question.options.find((option) => option.id === selectedOptionId);
  const correct = question.options.find((option) => option.id === question.correctOptionId);
  if (!selected || !correct) {
    throw new Error("Question options are invalid.");
  }

  return {
    questionId: question.id,
    questionPrompt: question.prompt,
    selectedOptionId,
    selectedOptionText: `${selected.label}. ${selected.text}`,
    correctOptionId: correct.id,
    correctOptionText: `${correct.label}. ${correct.text}`,
    wasCorrect,
    bobbyReply: "",
    performance: wasCorrect ? "strong" : "needs_support",
    createdAt: new Date().toISOString(),
  };
}
