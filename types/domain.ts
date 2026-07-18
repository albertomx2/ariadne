export type SupportStatus = "draft" | "review" | "published";

export type Student = {
  id: string;
  firstName: string;
  initials: string;
  color: string;
  communicationMode: string;
  prioritySupport: string;
  grid: string;
  processingTime: number;
  currentActivity: string;
  symbolProvider: "arasaac" | "custom" | "pcs" | "symbolstix";
};

export type Activity = {
  id: string;
  time: string;
  title: string;
  students: string[];
  context: string;
  status: "ready" | "needs-supports" | "in-progress";
};

export type Material = {
  id: string;
  title: string;
  type: string;
  student: string;
  status: SupportStatus;
  edited: string;
  symbolProvider: string;
};

export type VocabularyItem = {
  id: string;
  label: string;
  arasaacId?: number;
  kind: "core" | "fringe" | "safety";
  stablePosition?: number;
  usageCount: number;
  lastUsedMinutesAgo?: number;
  activityAffinity?: Record<string, number>;
  timeAffinity?: Record<"morning" | "midday" | "afternoon", number>;
  personalRelevance?: number;
  category?: "core" | "people" | "actions" | "feelings" | "food" | "school";
  customCategory?: string;
  visualType?: "inherit" | "symbol" | "photo" | "text";
  photoUrl?: string;
};

export type RankingContext = {
  activity: string;
  timeOfDay: "morning" | "midday" | "afternoon";
  previousSelection?: string;
};

export type RankedVocabulary = VocabularyItem & {
  score: number;
  reason: string;
};
