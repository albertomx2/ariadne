import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }
  try {
    const response = await fetch(
      `https://api.arasaac.org/api/pictograms/en/search/${encodeURIComponent(query)}`,
      {
        signal: AbortSignal.timeout(10_000),
        next: { revalidate: 86_400 },
      },
    );
    if (!response.ok) throw new Error("ARASAAC search failed.");
    const payload = (await response.json()) as Array<{
      _id: number;
      keywords?: Array<{ keyword?: string }>;
    }>;
    return NextResponse.json({
      results: payload.slice(0, 16).map((item) => ({
        id: String(item._id),
        arasaacId: item._id,
        label:
          item.keywords?.find((keyword) => keyword.keyword)?.keyword ?? query,
        imageUrl: `https://static.arasaac.org/pictograms/${item._id}/${item._id}_500.png`,
      })),
    });
  } catch {
    return NextResponse.json(
      { results: [], error: "ARASAAC search is temporarily unavailable." },
      { status: 502 },
    );
  }
}
