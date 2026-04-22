import { NextResponse } from "next/server";
import { generateImageActivity } from "@/lib/gemini";
import { sessionStore } from "@/lib/store";
import { cleanText } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const sessionId = cleanText(body.sessionId, "sessionId", 120);
    const description = cleanText(body.description, "description", 800);
    const session = await sessionStore.getSession(sessionId);
    const image = await generateImageActivity(session, description);
    const updatedSession = await sessionStore.addActivity(sessionId, "Image activity");

    return NextResponse.json({ image, session: updatedSession });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
