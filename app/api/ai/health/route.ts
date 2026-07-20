import { NextResponse } from "next/server";
import {
  AI_MODEL,
  aiHealth,
  aiProviderMode,
} from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const hostedReady = await aiHealth();
    return NextResponse.json({
      ready: true,
      hostedReady,
      fallbackReady: true,
      model: AI_MODEL,
      provider: aiProviderMode(),
    });
  } catch {
    return NextResponse.json(
      {
        ready: true,
        hostedReady: false,
        fallbackReady: true,
        model: AI_MODEL,
        provider: "local-aac-engine",
      },
    );
  }
}
