import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 1 || query.length > 80) {
    return NextResponse.json({ error: "Invalid photo query." }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      q: query,
      page_size: "8",
      mature: "false",
    });
    const search = await fetch(
      `https://api.openverse.org/v1/images/?${params}`,
      {
        headers: {
          "User-Agent":
            "AriadneAAC/0.1 educational accessibility prototype",
        },
        signal: AbortSignal.timeout(12_000),
        next: { revalidate: 604_800 },
      },
    );
    if (!search.ok) throw new Error("Photo search failed.");
    const payload = (await search.json()) as {
      results?: Array<{
        thumbnail?: string;
        foreign_landing_url?: string;
        creator?: string;
        license?: string;
      }>;
    };
    const match = payload.results?.find((item) => item.thumbnail);
    if (!match?.thumbnail) throw new Error("No photo found.");

    const image = await fetch(match.thumbnail, {
      headers: {
        "User-Agent":
          "AriadneAAC/0.1 educational accessibility prototype",
      },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 604_800 },
    });
    const contentType = image.headers.get("content-type") ?? "";
    if (!image.ok || !contentType.startsWith("image/")) {
      throw new Error("Photo thumbnail failed.");
    }

    return new NextResponse(await image.arrayBuffer(), {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "Content-Type": contentType,
        "X-Photo-Attribution": [
          match.creator ?? "Openverse contributor",
          match.license?.toUpperCase() ?? "See source",
        ].join(" · "),
        ...(match.foreign_landing_url
          ? { Link: `<${match.foreign_landing_url}>; rel="canonical"` }
          : {}),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No licensed photo is available for this word." },
      { status: 404 },
    );
  }
}
