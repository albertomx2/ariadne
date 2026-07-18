import type { SymbolProvider, SymbolSearchResult } from "./provider";

type ArasaacPictogram = {
  _id: number;
  keywords?: Array<{ keyword: string }>;
};

const ATTRIBUTION =
  "Pictograms: Sergio Palao. Source: ARASAAC. License: CC BY-NC-SA. Owner: Government of Aragon (Spain).";

export class ArasaacProvider implements SymbolProvider {
  id = "arasaac";
  displayName = "ARASAAC (demo)";

  imageUrl(externalId: string, variant = "500") {
    return `https://static.arasaac.org/pictograms/${externalId}/${externalId}_${variant}.png`;
  }

  async search(query: string, language = "en"): Promise<SymbolSearchResult[]> {
    const response = await fetch(
      `https://api.arasaac.org/v1/pictograms/${language}/bestsearch/${encodeURIComponent(query)}`,
      { next: { revalidate: 86400 } },
    );

    if (!response.ok) {
      throw new Error(`ARASAAC search failed with status ${response.status}`);
    }

    const pictograms = (await response.json()) as ArasaacPictogram[];

    return pictograms.slice(0, 8).map((pictogram) => ({
      provider: this.id,
      externalId: String(pictogram._id),
      label: pictogram.keywords?.[0]?.keyword ?? query,
      imageUrl: this.imageUrl(String(pictogram._id)),
      language,
      attribution: ATTRIBUTION,
    }));
  }
}
