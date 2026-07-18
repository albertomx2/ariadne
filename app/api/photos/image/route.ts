import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const OPENVERSE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!OPENVERSE_ID.test(id)) {
    return NextResponse.json({ error: "Invalid photo identifier." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.openverse.org/v1/images/${encodeURIComponent(id)}/thumb/`,
      {
        headers: {
          "User-Agent":
            "AriadneAAC/0.1 educational accessibility prototype",
        },
        signal: AbortSignal.timeout(12_000),
        next: { revalidate: 604_800 },
      },
    );
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.startsWith("image/")) {
      throw new Error("Openverse thumbnail unavailable.");
    }

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800, immutable",
        "Content-Type": contentType,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "The selected photo is temporarily unavailable." },
      { status: 502 },
    );
  }
}
