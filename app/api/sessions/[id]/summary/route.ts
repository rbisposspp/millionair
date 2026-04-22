import { NextResponse } from "next/server";
import { generateSummary } from "@/lib/gemini";
import { sessionStore } from "@/lib/store";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await sessionStore.getSession(id);
    const summary = await generateSummary(session);
    const updatedSession = await sessionStore.saveSummary(id, summary);

    return NextResponse.json({ summary, session: updatedSession });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
