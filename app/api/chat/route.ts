import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "Open-ended chat mode has been removed. Use the multiple-choice answer flow instead." },
    { status: 410 },
  );
}
