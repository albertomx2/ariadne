"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleHelp,
  Clock3,
  Delete,
  Grid2X2,
  Hand,
  Headphones,
  Home,
  ImageIcon,
  ListChecks,
  MessageSquareText,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useState,
} from "react";
import { vocabulary } from "@/lib/demo-data";
import {
  arasaacPictogramUrl,
  curatedAacPhotos,
} from "@/lib/aac-visuals";
import {
  representationShowsText,
  representationUsesPhotos,
  useAriadne,
  type AriadneActivity,
  type StudentProfile,
} from "@/lib/ariadne-store";
import { rankFringeVocabulary } from "@/lib/predictive-ranking";
import {
  activitiesForStudent,
  activeActivity,
  activeOrNextActivity,
  activityEnd,
  formatDay,
  formatTime,
  localDateKey,
  parseActivityStart,
  timingForActivity,
  vocabularyForActivity,
  withNextTiming,
} from "@/lib/schedule";
import {
  preloadNaturalSpeech,
  speakNaturally,
  stopSpeech,
} from "@/lib/speech";
import type { VocabularyItem } from "@/types/domain";
import "./student.css";

type StudentTab = "talk" | "day" | "activity" | "steps" | "help";
type Category = string;
type VoiceState = "ready" | "speaking";

const navItems: Array<{
  id: StudentTab;
  label: string;
  icon: typeof MessageSquareText;
}> = [
  { id: "talk", label: "Talk", icon: MessageSquareText },
  { id: "day", label: "My Day", icon: CalendarDays },
  { id: "activity", label: "Activity", icon: Grid2X2 },
  { id: "steps", label: "My Steps", icon: ListChecks },
  { id: "help", label: "Help", icon: CircleHelp },
];

function photoFor(item: VocabularyItem, student: StudentProfile) {
  return (
    student.customPhotos[item.id] ??
    student.customPhotos[item.label.toLowerCase()] ??
    item.photoUrl
  );
}

function AacVisual({
  item,
  student,
  size = 110,
}: {
  item: VocabularyItem;
  student: StudentProfile;
  size?: number;
}) {
  const familiarPhoto = photoFor(item, student);
  const shouldUsePhoto = representationUsesPhotos(student.representation);
  if (shouldUsePhoto) {
    if (familiarPhoto) {
      return (
        <Image
          alt=""
          className="familiar-photo"
          height={size}
          priority={item.id === "apple" || item.id === "banana"}
          src={familiarPhoto}
          unoptimized
          width={size}
        />
      );
    }
    const curated = curatedAacPhotos[item.id];
    if (curated) {
      return (
        <span
          aria-hidden="true"
          className={`curated-aac-photo curated-${curated.sheet}-photo`}
          style={{ backgroundPosition: curated.position }}
        />
      );
    }
    return (
      <span className="visual-missing" aria-label={`Photo needed for ${item.label}`}>
        <ImageIcon aria-hidden="true" size={Math.max(24, size / 3)} />
      </span>
    );
  }
  if (item.arasaacId) {
    return (
      <Image
        alt=""
        height={size}
        priority={item.kind === "core"}
        src={arasaacPictogramUrl(item.arasaacId)}
        width={size}
      />
    );
  }
  return (
    <span className="visual-missing" aria-label={`Pictogram unavailable for ${item.label}`}>
      <Grid2X2 aria-hidden="true" size={Math.max(24, size / 3)} />
    </span>
  );
}

function AacCell({
  item,
  onSelect,
  onSpeak,
  predicted = false,
  student,
}: {
  item: VocabularyItem;
  onSelect: (item: VocabularyItem) => void;
  onSpeak: (item: VocabularyItem) => void;
  predicted?: boolean;
  student: StudentProfile;
}) {
  const usesPhoto = representationUsesPhotos(student.representation);
  return (
    <div className={`aac-cell aac-${item.kind}${predicted ? " predicted" : ""}`}>
      <button
        aria-label={item.label}
        className="aac-cell-main"
        onClick={() => onSelect(item)}
        type="button"
      >
        <span className={`aac-picture${usesPhoto ? " photo" : ""}`}>
          <AacVisual item={item} student={student} />
        </span>
        {representationShowsText(student.representation) ? (
          <span className="aac-label">{item.label}</span>
        ) : null}
      </button>
      {student.speechEnabled ? (
        <button
          aria-label={`Hear ${item.label}`}
          className="aac-hear"
          onClick={() => onSpeak(item)}
          type="button"
        >
          <Volume2 aria-hidden="true" size={18} />
        </button>
      ) : null}
    </div>
  );
}

const fallbackHelpItems = [
  ["I need help", CircleHelp],
  ["I need a break", Hand],
  ["It is too loud", Headphones],
  ["I am in pain", ShieldAlert],
  ["Stop", X],
  ["No", X],
  ["Yes", Check],
  ["I need my teacher", Home],
] as const;

function iconForImportantMessage(label: string) {
  const found = fallbackHelpItems.find(([item]) => item === label);
  return found?.[1] ?? CircleHelp;
}

function timeOfDay(date: Date): "morning" | "midday" | "afternoon" {
  if (date.getHours() < 11) return "morning";
  if (date.getHours() < 14) return "midday";
  return "afternoon";
}

function childTimeLabel(
  activity: AriadneActivity,
  timing: "finished" | "now" | "next" | "later",
  hasCurrentActivity: boolean,
) {
  if (timing === "finished") return "DONE";
  if (timing === "now") return "NOW";
  if (timing === "next") return hasCurrentActivity ? "AFTER THIS" : "NEXT";
  const searchable = `${activity.title} ${activity.context}`.toLowerCase();
  if (searchable.includes("lunch")) return "LUNCH";
  if (searchable.includes("recess")) return "RECESS";
  if (parseActivityStart(activity).getHours() >= 12) return "AFTER LUNCH";
  return "LATER";
}

function visualTimeRemaining(activity: AriadneActivity, timing: string, now: Date) {
  if (timing === "now") {
    const duration = Math.max(
      1,
      activityEnd(activity).getTime() - parseActivityStart(activity).getTime(),
    );
    return Math.max(
      0,
      Math.min(100, ((activityEnd(activity).getTime() - now.getTime()) / duration) * 100),
    );
  }
  if (timing === "next") {
    const untilStart = parseActivityStart(activity).getTime() - now.getTime();
    return Math.max(0, Math.min(100, (untilStart / 3_600_000) * 100));
  }
  return timing === "finished" ? 0 : 100;
}

export default function StudentSpacePage() {
  const {
    students,
    activeStudentId,
    activities,
    lastSyncedAt,
    syncMode,
    setActiveStudent,
    showToast,
    hydrated,
    session,
    updateStudent,
  } = useAriadne();
  const router = useRouter();
  const student =
    students.find((item) => item.id === activeStudentId) ?? students[0];
  const [tab, setTab] = useState<StudentTab>("talk");
  const [talkCategory, setTalkCategory] = useState<Category>("core");
  const [message, setMessage] = useState<VocabularyItem[]>([]);
  const [step, setStep] = useState(1);
  const [voiceState, setVoiceState] = useState<VoiceState>("ready");
  const [speakingWordIndex, setSpeakingWordIndex] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());
  const studentVocabulary = useMemo(() => {
    if (!student?.boardItems?.length) return vocabulary;
    return student.boardItems
      .filter((item) => !item.hidden)
      .map((item) => {
        const original = vocabulary.find((entry) => entry.id === item.id);
        return {
          ...original,
          id: item.id,
          label: item.label,
          kind: item.kind,
          usageCount: item.usageCount ?? 0,
          stablePosition:
            item.categoryId === "core" ? item.order : original?.stablePosition,
          category: original?.category,
          customCategory: item.categoryId,
          arasaacId: item.arasaacId,
          visualType: item.visualType,
          photoUrl: item.photoUrl,
        } satisfies VocabularyItem;
      });
  }, [student]);
  const categories = useMemo(
    () =>
      (student?.boardCategories ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((category) => [category.id, category.label] as [string, string]),
    [student],
  );

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const queryId = query.get("student");
    const previewAt = query.get("at");
    if (previewAt) {
      const parsed = new Date(previewAt);
      if (!Number.isNaN(parsed.getTime())) {
        window.setTimeout(() => setNow(parsed), 0);
      }
    }
    if (
      queryId &&
      queryId !== activeStudentId &&
      students.some((item) => item.id === queryId)
    ) {
      setActiveStudent(queryId);
    }
  }, [activeStudentId, setActiveStudent, students]);

  useEffect(() => {
    if (hydrated && !session) router.replace("/sign-in");
  }, [hydrated, router, session]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("at")) return;
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    preloadNaturalSpeech();
    return () => stopSpeech();
  }, []);

  const core = useMemo(
    () =>
      studentVocabulary
        .filter(
          (item) => (item.customCategory ?? item.category) === "core",
        )
        .sort(
        (left, right) =>
          right.usageCount - left.usageCount ||
          (left.stablePosition ?? Number.MAX_SAFE_INTEGER) -
            (right.stablePosition ?? Number.MAX_SAFE_INTEGER),
        ),
    [studentVocabulary],
  );

  const currentActivity = student
    ? activeActivity(activities, student, now)
    : undefined;
  const nextActivity = student
    ? activeOrNextActivity(activities, student, now)
    : undefined;
  const currentActivityKey = currentActivity?.activityKey ?? "classroom";
  const predictions = rankFringeVocabulary(studentVocabulary, {
    activity: currentActivityKey,
    timeOfDay: timeOfDay(now),
    previousSelection: message.at(-1)?.id,
  });

  if (!student) return null;

  const capacity = student.gridColumns * student.gridRows;
  const talkCategoryItems = studentVocabulary.filter(
    (item) =>
      (item.customCategory ?? item.category) === talkCategory,
  );
  const talkBoard = talkCategory === "core" ? core : talkCategoryItems;
  const activityAccessIds = [
    "more",
    "different",
    "finished",
    "break",
    "no",
    "help",
    "stop",
  ];
  const activityAccess = activityAccessIds
    .map((id) => studentVocabulary.find((item) => item.id === id))
    .filter(Boolean) as VocabularyItem[];
  const contextualActivityVocabulary = vocabularyForActivity(
    currentActivity,
    studentVocabulary,
  ).filter((item) => !activityAccessIds.includes(item.id));
  const activityCapacity = Math.max(capacity, activityAccess.length + 2);
  const activityBoard = [
    ...contextualActivityVocabulary.slice(
      0,
      Math.max(0, activityCapacity - activityAccess.length),
    ),
    ...activityAccess,
  ];
  function selectWord(item: VocabularyItem) {
    setMessage((current) => [...current, item]);
  }

  function recordPlayedPhrase(items: VocabularyItem[]) {
    if (!items.length) return;
    const increments = new Map<string, number>();
    items.forEach((item) =>
      increments.set(item.id, (increments.get(item.id) ?? 0) + 1),
    );
    updateStudent(student.id, {
      boardItems: student.boardItems.map((item) => ({
        ...item,
        usageCount: (item.usageCount ?? 0) + (increments.get(item.id) ?? 0),
      })),
    });
  }

  function speak(text?: string, trackedItems?: VocabularyItem[]) {
    const phrase = text ?? message.map((item) => item.label).join(" ");
    if (!phrase) return;
    if (!student.speechEnabled) {
      showToast("Speech output is off in this learner profile.");
      return;
    }
    const ranges = trackedItems
      ? trackedItems.map((item, index) => ({
          index,
          start: trackedItems
            .slice(0, index)
            .reduce((total, entry) => total + entry.label.length + 1, 0),
          end: trackedItems
            .slice(0, index + 1)
            .reduce((total, entry) => total + entry.label.length + 1, 0),
        }))
      : [];
    if (trackedItems?.length) {
      setSpeakingWordIndex(0);
      recordPlayedPhrase(trackedItems);
    }
    void speakNaturally(phrase, {
      rate: student.speechRate,
      voice: student.speechVoice,
      language: student.homeLanguage.toLowerCase().startsWith("spanish")
        ? "es-US"
        : "en-US",
      onBoundary: (charIndex) => {
        const range = ranges.find(
          (item) => charIndex >= item.start && charIndex < item.end,
        );
        if (range) setSpeakingWordIndex(range.index);
      },
      onStatus: (status) => {
        setVoiceState(status);
        if (status === "ready") setSpeakingWordIndex(null);
      },
    });
  }

  function showImportantMessage(label: string) {
    setMessage([
      {
        id: `important-${label}`,
        label,
        kind: "safety",
        usageCount: 0,
      },
    ]);
    speak(label);
  }

  const studentStyle = {
    "--aac-columns": student.gridColumns,
    "--student-text-scale": student.textScale === "large" ? 1.13 : 1,
  } as CSSProperties;
  const todayKey = localDateKey(now);
  const dayActivities = activitiesForStudent(activities, student, todayKey);
  const timedActivities = withNextTiming(dayActivities, now);
  const steps = currentActivity?.steps ?? [];
  const currentStep = steps[Math.min(step - 1, Math.max(0, steps.length - 1))];

  return (
    <main
      className={`student-space cell-${student.cellScale} representation-${student.representation}${
        student.highContrast ? " student-high-contrast" : ""
      }${student.reduceMotion ? " student-reduce-motion" : ""}`}
      style={studentStyle}
    >
      <header className="student-topbar">
        <div className="student-identity">
          <span
            className="student-initial"
            style={{ background: student.color }}
          >
            {student.firstName[0]}
          </span>
          <div>
            <strong>{student.firstName}&apos;s space</strong>
            <span>
              {student.classGroup} ·{" "}
              {syncMode === "supabase"
                ? "Device sync on"
                : "This-browser sync on"}
            </span>
          </div>
        </div>
        <div className="current-activity">
          <span>
            {currentActivity
              ? "Happening now"
              : nextActivity &&
                  timingForActivity(nextActivity, now) !== "finished"
                ? "Next activity"
                : "Schedule"}
          </span>
          <strong>
            {currentActivity?.title ??
              (nextActivity && timingForActivity(nextActivity, now) !== "finished"
                ? nextActivity.title
                : "No activity now")}
          </strong>
        </div>
        <Link className="student-exit" href="/workspace">
          <ArrowLeft size={18} /> Teacher workspace
        </Link>
      </header>

      <div className="student-main">
        {tab === "talk" || tab === "activity" ? (
          <>
            <section className="message-bar" aria-label="Message">
              <div className="message-words" aria-live="polite">
                {message.length ? (
                  message.map((item, index) => (
                    <span
                      className={`message-token${
                        speakingWordIndex === index ? " speaking" : ""
                      }`}
                      key={`${item.id}-${index}`}
                    >
                      <span className="message-token-picture">
                        <AacVisual item={item} size={54} student={student} />
                      </span>
                      {representationShowsText(student.representation) ? (
                        <strong>{item.label}</strong>
                      ) : null}
                    </span>
                  ))
                ) : (
                  <span className="message-placeholder">
                    Your message will appear here
                  </span>
                )}
              </div>
              <button
                className="message-action speak"
                disabled={!message.length || !student.speechEnabled}
                onClick={() => speak(undefined, message)}
                type="button"
              >
                <Volume2 size={25} />
                {voiceState === "speaking" ? "Speaking" : "Speak"}
              </button>
              <button
                aria-label="Delete last word"
                className="message-action"
                disabled={!message.length}
                onClick={() => setMessage((current) => current.slice(0, -1))}
                type="button"
              >
                <Delete size={24} />
              </button>
              <button
                aria-label="Clear message"
                className="message-action"
                disabled={!message.length}
                onClick={() => setMessage([])}
                type="button"
              >
                <RotateCcw size={22} />
              </button>
            </section>

            {tab === "talk" && student.predictionsEnabled ? (
              <section
                className="prediction-strip"
                aria-label="Context suggestions"
              >
                <div>
                  <Sparkles size={16} />
                  <span>Likely useful now</span>
                </div>
                {predictions.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => selectWord(item)}
                    type="button"
                  >
                    <span className="prediction-picture">
                      <AacVisual item={item} size={42} student={student} />
                    </span>
                    {representationShowsText(student.representation) ? (
                      <strong>{item.label}</strong>
                    ) : null}
                  </button>
                ))}
                <small>Suggestions never speak for you</small>
              </section>
            ) : null}

            {tab === "activity" ? (
              <section className="activity-board-heading">
                <div>
                  <p className="eyebrow">Activity communication</p>
                  <h1>{currentActivity?.title ?? "No activity right now"}</h1>
                  <p>
                    This page follows the shared schedule. Talk keeps the full
                    vocabulary; Activity shows words for what is happening now.
                  </p>
                </div>
                {currentActivity ? (
                  <span>
                    {formatTime(currentActivity.time)} ·{" "}
                    {currentActivity.location}
                  </span>
                ) : null}
              </section>
            ) : null}

            <div className={tab === "talk" ? "board-layout" : "activity-board"}>
              {tab === "talk" ? (
                <aside
                  className="aac-categories"
                  aria-label="Vocabulary categories"
                >
                  {categories.map(([id, label]) => (
                    <button
                      className={talkCategory === id ? "active" : ""}
                      key={id}
                      onClick={() => setTalkCategory(id)}
                      type="button"
                    >
                      <span className="category-visual">
                        {studentVocabulary.find(
                          (item) => (item.customCategory ?? item.category) === id,
                        ) ? (
                          <AacVisual
                            item={studentVocabulary.find(
                              (item) => (item.customCategory ?? item.category) === id,
                            )!}
                            size={30}
                            student={student}
                          />
                        ) : (
                          <Grid2X2 size={20} />
                        )}
                      </span>
                      {label}
                    </button>
                  ))}
                </aside>
              ) : null}

              {tab === "activity" && !currentActivity ? (
                <div className="student-day-empty activity-unavailable">
                  <Clock3 size={40} />
                  <strong>There is no activity happening now.</strong>
                  <span>
                    Activity words appear automatically between the scheduled
                    start and end time.
                  </span>
                </div>
              ) : (
              <section
                className="aac-grid"
                aria-label={
                  tab === "activity"
                    ? `${currentActivity?.title ?? "Current activity"} communication board`
                    : `${talkCategory} communication board`
                }
              >
                {(tab === "activity" ? activityBoard : talkBoard).map((item) => (
                  <AacCell
                    item={item}
                    key={item.id}
                    onSelect={selectWord}
                    onSpeak={(word) => speak(word.label)}
                    predicted={
                      tab === "talk" &&
                      student.predictionsEnabled &&
                      predictions.slice(0, 4).some((entry) => entry.id === item.id)
                    }
                    student={student}
                  />
                ))}
              </section>
              )}
            </div>
          </>
        ) : null}

        {tab === "day" ? (
          <section className="student-day-view">
            <header>
              <p className="eyebrow">{formatDay(todayKey)}</p>
              <h1>My Day</h1>
              <p>
                Shared with the teacher ·{" "}
                {lastSyncedAt
                  ? `updated ${new Intl.DateTimeFormat("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(lastSyncedAt))}`
                  : "ready"}
              </p>
            </header>
            <div className="student-day-list">
              {timedActivities.map(({ activity, timing }) => {
                const activityVisual = vocabularyForActivity(
                  activity,
                  studentVocabulary,
                )[0];
                return (
                  <article className={timing} key={activity.id}>
                    <span className="day-activity-visual">
                      {activityVisual ? (
                        <AacVisual
                          item={activityVisual}
                          size={70}
                          student={student}
                        />
                      ) : (
                        <CalendarDays size={34} />
                      )}
                    </span>
                    <div className="child-time">
                      <span
                        aria-label={`${Math.round(
                          visualTimeRemaining(activity, timing, now),
                        )} percent of the wait remaining`}
                        className={`visual-timer ${timing}`}
                        style={
                          {
                            "--time-remaining": `${visualTimeRemaining(
                              activity,
                              timing,
                              now,
                            ) * 3.6}deg`,
                          } as CSSProperties
                        }
                      >
                        <i />
                      </span>
                      <strong>
                        {childTimeLabel(
                          activity,
                          timing,
                          Boolean(currentActivity),
                        )}
                      </strong>
                    </div>
                    <div>
                      <strong>{activity.title}</strong>
                      <span>
                        {timing === "finished"
                          ? "Finished"
                          : timing === "now"
                            ? "Now"
                            : timing === "next"
                              ? "Next"
                              : "Later"}{" "}
                        · {activity.location}
                      </span>
                    </div>
                    <button
                      aria-label={`Speak ${activity.title}`}
                      disabled={!student.speechEnabled}
                      onClick={() => speak(activity.title)}
                      type="button"
                    >
                      <Volume2 size={22} />
                    </button>
                  </article>
                );
              })}
              {!timedActivities.length ? (
                <div className="student-day-empty">
                  <CalendarDays size={32} />
                  <strong>No activities are assigned today.</strong>
                  <span>The teacher can add one from the shared schedule.</span>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {tab === "steps" ? (
          <section className="student-steps-view">
            {currentStep ? (
              <>
                <div className="steps-context">
                  <span>Steps for</span>
                  <strong>{currentActivity?.title}</strong>
                </div>
                <div className="step-progress">
                  <span>
                    Step {step} of {steps.length}
                  </span>
                  <div>
                    <i style={{ width: `${(step / steps.length) * 100}%` }} />
                  </div>
                </div>
                <article className="current-step">
                  <div
                    aria-label={`${currentStep.label} visual sequence`}
                    className="step-concepts"
                  >
                    {currentStep.vocabularyIds.map((id) => {
                      const item = studentVocabulary.find((entry) => entry.id === id);
                      if (!item) return null;
                      return (
                        <span className="step-concept" key={id}>
                          <span className="step-picture">
                            <AacVisual item={item} size={160} student={student} />
                          </span>
                          {representationShowsText(student.representation) ? (
                            <strong>{item.label}</strong>
                          ) : null}
                        </span>
                      );
                    })}
                  </div>
                  <p>{currentStep.label}</p>
                  <button
                    className="button button-secondary step-speak"
                    disabled={!student.speechEnabled}
                    onClick={() => speak(currentStep.label)}
                    type="button"
                  >
                    <Volume2 size={22} /> Read aloud
                  </button>
                </article>
                {student.instructionMode !== "one-step" ? (
                  <section
                    aria-label={
                      student.instructionMode === "short-sequence"
                        ? "Short visual sequence"
                        : "Full visual sequence"
                    }
                    className="step-overview"
                  >
                    <div>
                      <strong>
                        {student.instructionMode === "short-sequence"
                          ? "What comes next"
                          : "All steps"}
                      </strong>
                      <span>
                        Selected in {student.firstName}&apos;s access profile
                      </span>
                    </div>
                    {(student.instructionMode === "short-sequence"
                      ? steps.slice(step - 1, step + 2)
                      : steps
                    ).map((item, index) => {
                      const absoluteIndex =
                        student.instructionMode === "short-sequence"
                          ? step - 1 + index
                          : index;
                      return (
                        <button
                          aria-current={
                            absoluteIndex === step - 1 ? "step" : undefined
                          }
                          key={item.id}
                          onClick={() => setStep(absoluteIndex + 1)}
                          type="button"
                        >
                          <span>{absoluteIndex + 1}</span>
                          <strong>{item.label}</strong>
                        </button>
                      );
                    })}
                  </section>
                ) : null}
                <div className="step-actions three">
                  <button
                    className="button button-secondary"
                    disabled={step === 1}
                    onClick={() =>
                      setStep((current) => Math.max(1, current - 1))
                    }
                    type="button"
                  >
                    <ChevronLeft size={22} /> Back
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() => setTab("help")}
                    type="button"
                  >
                    <CircleHelp size={22} /> I need help
                  </button>
                  <button
                    className="button step-done"
                    onClick={() => {
                      if (step === steps.length) {
                        showImportantMessage("I am finished");
                        setTab("talk");
                        setStep(1);
                        return;
                      }
                      setStep((current) => current + 1);
                    }}
                    type="button"
                  >
                    {step === steps.length ? "Finish" : "Done"}{" "}
                    <Check size={22} />
                  </button>
                </div>
              </>
            ) : (
              <div className="student-day-empty">
                <ListChecks size={34} />
                <strong>
                  {currentActivity
                    ? "No steps were added for this activity."
                    : "There is no activity happening now."}
                </strong>
                <span>
                  {currentActivity
                    ? "The teacher can edit the shared activity."
                    : "Steps appear automatically during the scheduled activity time."}
                </span>
              </div>
            )}
          </section>
        ) : null}

        {tab === "help" ? (
          <section className="student-help-view">
            <header>
              <span className="help-shield">
                <ShieldAlert size={28} />
              </span>
              <div>
                <h1>Help and important messages</h1>
                <p>These profile-controlled messages are always available.</p>
              </div>
            </header>
            <div className="help-grid">
              {student.emergencyMessages.map((label) => {
                const Icon = iconForImportantMessage(label);
                return (
                  <button
                    key={label}
                    onClick={() => showImportantMessage(label)}
                    type="button"
                  >
                    <span>
                      <Icon size={32} />
                    </span>
                    <strong>{label}</strong>
                    {student.speechEnabled ? (
                      <Volume2 size={20} />
                    ) : (
                      <Check size={20} />
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      <nav className="student-nav" aria-label="Student space">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              aria-current={tab === item.id ? "page" : undefined}
              className={tab === item.id ? "active" : ""}
              key={item.id}
              onClick={() => {
                setTab(item.id);
                if (item.id === "steps") setStep(1);
              }}
              type="button"
            >
              <Icon size={24} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <footer className="arasaac-credit">
        Pictograms: Sergio Palao · ARASAAC · CC BY-NC-SA · Government of
        Aragon, Spain · Curated educational photos: Ariadne · Familiar photos:
        educator selected
      </footer>
    </main>
  );
}
