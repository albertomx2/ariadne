import type {
  RankedVocabulary,
  RankingContext,
  VocabularyItem,
} from "@/types/domain";

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Ranks optional AAC vocabulary without moving the learner's stable core.
 * Scores surface possibilities; they never select, complete, or speak for a learner.
 */
export function rankFringeVocabulary(
  items: VocabularyItem[],
  context: RankingContext,
): RankedVocabulary[] {
  const maxUsage = Math.max(...items.map((item) => item.usageCount), 1);

  return items
    .filter((item) => item.kind !== "core")
    .map((item) => {
      const frequency = Math.log1p(item.usageCount) / Math.log1p(maxUsage);
      const activity = item.activityAffinity?.[context.activity] ?? 0;
      const time = item.timeAffinity?.[context.timeOfDay] ?? 0;
      const personal = item.personalRelevance ?? 0;
      const recency =
        item.lastUsedMinutesAgo === undefined
          ? 0
          : clamp(1 - item.lastUsedMinutesAgo / 180);
      const safetyFloor = item.kind === "safety" ? 0.28 : 0;

      const score = clamp(
        safetyFloor +
          frequency * 0.2 +
          activity * 0.3 +
          time * 0.12 +
          personal * 0.2 +
          recency * 0.1,
      );

      const reason =
        item.kind === "safety"
          ? "Always available for autonomy and safety"
          : activity >= 0.8
            ? `Relevant to ${context.activity.replace("-", " ")}`
            : frequency >= 0.7
              ? "Frequently selected in similar contexts"
              : "Matches this learner's current context";

      return { ...item, score, reason };
    })
    .sort((a, b) => b.score - a.score);
}

export function stableCore(items: VocabularyItem[]) {
  return items
    .filter((item) => item.kind === "core" || item.stablePosition !== undefined)
    .sort(
      (a, b) =>
        (a.stablePosition ?? Number.MAX_SAFE_INTEGER) -
        (b.stablePosition ?? Number.MAX_SAFE_INTEGER),
    );
}
