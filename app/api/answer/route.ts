import { NextResponse } from "next/server";
import { narrateAnswerResult, toAttempt } from "@/lib/gemini";
import { sessionStore } from "@/lib/store";
import { cleanText } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const sessionId = cleanText(body.sessionId, "sessionId", 120);
    const questionId = cleanText(body.questionId, "questionId", 120);
    const optionId = cleanText(body.optionId, "optionId", 120);
    const session = await sessionStore.getSession(sessionId);
    const question = await sessionStore.getCurrentQuestion(sessionId);

    if (question.id !== questionId) {
      throw new Error("Answer does not match the current question.");
    }

    const wasCorrect = optionId === question.correctOptionId;
    const attempt = toAttempt(question, optionId, wasCorrect);
    const bobby = await narrateAnswerResult(session, question, attempt);
    attempt.bobbyReply = bobby.reply;
    attempt.languageNote = bobby.languageNote;
    attempt.performance = bobby.performance ?? attempt.performance;
    const updatedSession = await sessionStore.recordAnswer(sessionId, attempt);
    const nextQuestion =
      updatedSession.status === "active" ? await sessionStore.getCurrentQuestion(sessionId) : null;

    return NextResponse.json({
      bobby,
      wasCorrect,
      session: updatedSession,
      question: nextQuestion,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
