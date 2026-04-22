import { NextResponse } from "next/server";
import { generateBobbyAdvice } from "@/lib/gemini";
import { sessionStore } from "@/lib/store";
import { lifelineLabel } from "@/lib/bobby";
import { cleanText, parseLifeline } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const sessionId = cleanText(body.sessionId, "sessionId", 120);
    const questionId = cleanText(body.questionId, "questionId", 120);
    const type = parseLifeline(body.type);
    const session = await sessionStore.getSession(sessionId);
    const question = await sessionStore.getCurrentQuestion(sessionId);

    if (question.id !== questionId) {
      throw new Error("Lifelines can only be used for the current question.");
    }

    if (session.usedLifelines.includes(type)) {
      throw new Error(`${lifelineLabel(type)} has already been used in this session.`);
    }

    if (type === "skip") {
      const updatedSession = await sessionStore.skipQuestion(sessionId, questionId);
      const nextQuestion =
        updatedSession.status === "active" ? await sessionStore.getCurrentQuestion(sessionId) : null;

      return NextResponse.json({
        lifeline: {
          type,
          hint: "Question skipped. You move on with no gain and no loss.",
        },
        session: updatedSession,
        question: nextQuestion,
      });
    }

    if (type === "fifty_fifty") {
      const { session: updatedSession, removedOptionId } = await sessionStore.useFiftyFifty(sessionId, questionId);
      return NextResponse.json({
        lifeline: {
          type,
          hint: "One wrong option has been removed.",
          removedOptionId,
        },
        session: updatedSession,
        question: await sessionStore.getCurrentQuestion(sessionId),
      });
    }

    const advice = await generateBobbyAdvice(session, question);
    const updatedSession = await sessionStore.markLifelineUsed(sessionId, type);

    return NextResponse.json({
      lifeline: {
        type,
        hint: advice.reply,
        suggestedOptionId: advice.suggestedOptionId,
        suggestedOptionLabel: advice.suggestedOptionLabel,
      },
      session: updatedSession,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
