import { NextResponse } from "next/server";
import { OLLAMA_MODEL, ollamaHealth } from "@/lib/ollama";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ready = await ollamaHealth();
    return NextResponse.json({ ready, model: OLLAMA_MODEL });
  } catch {
    return NextResponse.json(
      { ready: false, model: OLLAMA_MODEL },
      { status: 503 },
    );
  }
}
