import { NextResponse } from "next/server";
import {
  AI_MODEL,
  aiHealth,
  aiProviderMode,
} from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ready = await aiHealth();
    return NextResponse.json({
      ready,
      model: AI_MODEL,
      provider: aiProviderMode(),
    });
  } catch {
    return NextResponse.json(
      {
        ready: false,
        model: AI_MODEL,
        provider: aiProviderMode(),
      },
      { status: 503 },
    );
  }
}
