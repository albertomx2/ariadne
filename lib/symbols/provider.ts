export type SymbolSearchResult = {
  provider: string;
  externalId: string;
  label: string;
  imageUrl: string;
  language: string;
  attribution: string;
};

export interface SymbolProvider {
  id: string;
  displayName: string;
  search(query: string, language: string): Promise<SymbolSearchResult[]>;
  imageUrl(externalId: string, variant?: string): string;
}
