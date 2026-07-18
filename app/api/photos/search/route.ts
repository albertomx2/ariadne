import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const params = new URLSearchParams({
    q: query,
    page_size: "12",
    mature: "false",
  });

  try {
    const response = await fetch(
      `https://api.openverse.org/v1/images/?${params}`,
      {
        headers: {
          "User-Agent":
            "AriadneAAC/0.1 educational accessibility prototype",
        },
        signal: AbortSignal.timeout(12_000),
        next: { revalidate: 86_400 },
      },
    );
    if (!response.ok) throw new Error("Photo search failed.");

    const payload = (await response.json()) as {
      results?: Array<{
        id?: string;
        title?: string;
        thumbnail?: string;
        foreign_landing_url?: string;
        license?: string;
        license_version?: string;
        creator?: string;
      }>;
    };

    const results = (payload.results ?? [])
      .filter((item) => item.id && item.thumbnail)
      .map((item) => ({
        id: item.id as string,
        title: item.title?.trim() || query,
        imageUrl: `/api/photos/image?id=${encodeURIComponent(item.id as string)}`,
        sourceUrl: item.foreign_landing_url ?? "",
        license: [
          item.license?.toUpperCase(),
          item.license_version,
        ]
          .filter(Boolean)
          .join(" "),
        creator: item.creator?.trim() || "Openverse contributor",
      }))
      .filter((item) => item.imageUrl);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { results: [], error: "Photo search is temporarily unavailable." },
      { status: 502 },
    );
  }
}
