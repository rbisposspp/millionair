import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/store";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const session = await sessionStore.getSession(id);
    const question = await sessionStore.getCurrentQuestion(id);
    return NextResponse.json({ session, question });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
