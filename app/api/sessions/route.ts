import { NextResponse } from "next/server";
import { sessionStore } from "@/lib/store";
import { parseSessionInput } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const input = parseSessionInput(body);
    const payload = await sessionStore.createSession(input);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
