import type { AriadneActivity, StudentProfile } from "@/lib/ariadne-store";
import type { VocabularyItem } from "@/types/domain";

export type ActivityTiming = "finished" | "now" | "next" | "later";

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseActivityStart(activity: AriadneActivity) {
  const [year, month, day] = activity.date.split("-").map(Number);
  const normalized = to24Hour(activity.time);
  const [hours, minutes] = normalized.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function activityEnd(activity: AriadneActivity) {
  return new Date(
    parseActivityStart(activity).getTime() + activity.durationMinutes * 60_000,
  );
}

export function to24Hour(time: string) {
  if (/^\d{2}:\d{2}$/.test(time)) return time;
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "09:00";
  let hours = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hours += 12;
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

export function formatTime(time: string) {
  const [hours, minutes] = to24Hour(time).split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2026, 0, 1, hours, minutes));
}

export function formatDay(dateKey: string, options?: { short?: boolean }) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: options?.short ? "short" : "long",
    month: options?.short ? "short" : "long",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function activitiesForStudent(
  activities: AriadneActivity[],
  student: StudentProfile,
  dateKey: string,
) {
  return activities
    .filter(
      (activity) =>
        activity.date === dateKey &&
        (activity.studentIds.includes(student.id) ||
          activity.students.includes(student.firstName)),
    )
    .sort(
      (left, right) =>
        parseActivityStart(left).getTime() - parseActivityStart(right).getTime(),
    );
}

export function timingForActivity(
  activity: AriadneActivity,
  now = new Date(),
): ActivityTiming {
  const start = parseActivityStart(activity).getTime();
  const end = activityEnd(activity).getTime();
  const current = now.getTime();
  if (current >= start && current < end) return "now";
  if (current >= end) return "finished";
  return "later";
}

export function withNextTiming(
  activities: AriadneActivity[],
  now = new Date(),
) {
  const timed = activities.map((activity) => ({
    activity,
    timing: timingForActivity(activity, now),
  }));
  const firstLater = timed.findIndex((item) => item.timing === "later");
  if (firstLater >= 0) timed[firstLater].timing = "next";
  return timed;
}

export function activeOrNextActivity(
  activities: AriadneActivity[],
  student: StudentProfile,
  now = new Date(),
) {
  const today = activitiesForStudent(activities, student, localDateKey(now));
  return (
    today.find((activity) => timingForActivity(activity, now) === "now") ??
    today.find((activity) => parseActivityStart(activity).getTime() > now.getTime()) ??
    today.at(-1)
  );
}

const activityVocabulary: Record<string, string[]> = {
  "fruit-salad": [
    "cut",
    "banana",
    "mix",
    "apple",
    "fruit",
    "bowl",
    "my-turn",
    "finished",
  ],
  science: [
    "want",
    "different",
    "more",
    "my-turn",
    "teacher",
    "friend",
    "finished",
  ],
  reading: ["want", "more", "different", "book", "read", "teacher", "finished"],
  "morning-meeting": [
    "hello",
    "teacher",
    "friend",
    "happy",
    "sad",
    "my-turn",
    "finished",
  ],
  "check-in": ["teacher", "help", "break", "yes", "no", "finished"],
  music: ["want", "more", "different", "music", "like", "stop", "finished"],
  playground: ["go", "play", "friend", "my-turn", "stop", "finished"],
  art: ["want", "more", "different", "like", "finished"],
  classroom: ["want", "more", "different", "teacher", "friend", "finished"],
};

export function vocabularyForActivity(
  activity: AriadneActivity | undefined,
  vocabulary: VocabularyItem[],
) {
  const plannedIds = activity?.activityVocabularyIds?.length
    ? activity.activityVocabularyIds
    : activity?.steps.flatMap((step) => step.vocabularyIds) ?? [];
  const ids = plannedIds.length
    ? [...new Set(plannedIds)]
    : activityVocabulary[activity?.activityKey ?? "classroom"] ??
      activityVocabulary.classroom;
  const indexed = new Map(vocabulary.map((item) => [item.id, item]));
  return ids.map((id) => indexed.get(id)).filter(Boolean) as VocabularyItem[];
}
