"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleHelp,
  Delete,
  Grid2X2,
  Hand,
  Headphones,
  Home,
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
import {
  type CSSProperties,
  useEffect,
  useMemo,
  useState,
} from "react";
import { vocabulary } from "@/lib/demo-data";
import {
  representationShowsText,
  representationUsesPhotos,
  useAriadne,
  type StudentProfile,
} from "@/lib/ariadne-store";
import { rankFringeVocabulary, stableCore } from "@/lib/predictive-ranking";
import {
  activitiesForStudent,
  activeOrNextActivity,
  formatDay,
  formatTime,
  localDateKey,
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

const arasaacUrl = (id: number) =>
  `https://static.arasaac.org/pictograms/${id}/${id}_500.png`;

const curatedPhoto: Record<
  string,
  { position: string; sheet: "core" | "action" | "concrete" }
> = {
  i: { position: "0% 0%", sheet: "core" },
  want: { position: "33.333% 0%", sheet: "core" },
  more: { position: "66.667% 0%", sheet: "core" },
  different: { position: "100% 0%", sheet: "core" },
  like: { position: "0% 50%", sheet: "core" },
  go: { position: "33.333% 50%", sheet: "core" },
  help: { position: "66.667% 50%", sheet: "core" },
  stop: { position: "100% 50%", sheet: "core" },
  break: { position: "0% 100%", sheet: "core" },
  yes: { position: "33.333% 100%", sheet: "core" },
  no: { position: "66.667% 100%", sheet: "core" },
  finished: { position: "100% 100%", sheet: "core" },
  cut: { position: "0% 0%", sheet: "action" },
  mix: { position: "33.333% 0%", sheet: "action" },
  "my-turn": { position: "66.667% 0%", sheet: "action" },
  wait: { position: "100% 0%", sheet: "action" },
  play: { position: "0% 50%", sheet: "action" },
  choose: { position: "33.333% 50%", sheet: "action" },
  put: { position: "66.667% 50%", sheet: "action" },
  wake: { position: "100% 50%", sheet: "action" },
  read: { position: "0% 100%", sheet: "action" },
  eat: { position: "33.333% 100%", sheet: "action" },
  drink: { position: "66.667% 100%", sheet: "action" },
  hello: { position: "100% 100%", sheet: "action" },
  banana: { position: "0% 0%", sheet: "concrete" },
  apple: { position: "33.333% 0%", sheet: "concrete" },
  bowl: { position: "66.667% 0%", sheet: "concrete" },
  teacher: { position: "100% 0%", sheet: "concrete" },
  friend: { position: "0% 33.333%", sheet: "concrete" },
  happy: { position: "33.333% 33.333%", sheet: "concrete" },
  sad: { position: "66.667% 33.333%", sheet: "concrete" },
  school: { position: "100% 33.333%", sheet: "concrete" },
  toilet: { position: "0% 66.667%", sheet: "concrete" },
  pain: { position: "33.333% 66.667%", sheet: "concrete" },
  fruit: { position: "66.667% 66.667%", sheet: "concrete" },
  book: { position: "100% 66.667%", sheet: "concrete" },
  music: { position: "0% 100%", sheet: "concrete" },
};

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
  if (item.visualType === "text") {
    return <strong aria-hidden="true">{item.label}</strong>;
  }
  const shouldUsePhoto =
    item.visualType === "photo" ||
    (representationUsesPhotos(student.representation) &&
      item.visualType !== "symbol");
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
    const curated = curatedPhoto[item.id];
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
      <Image
        alt=""
        className="familiar-photo"
        height={size}
        priority={item.id === "apple" || item.id === "banana"}
        src={`/api/photos/first?q=${encodeURIComponent(item.label)}`}
        unoptimized
        width={size}
      />
    );
  }
  if (item.arasaacId) {
    return (
      <Image
        alt=""
        height={size}
        priority={item.kind === "core"}
        src={arasaacUrl(item.arasaacId)}
        width={size}
      />
    );
  }
  return <strong aria-hidden="true">{item.label}</strong>;
}

function AacCell({
  item,
  onSelect,
  predicted = false,
  student,
}: {
  item: VocabularyItem;
  onSelect: (item: VocabularyItem) => void;
  predicted?: boolean;
  student: StudentProfile;
}) {
  const usesPhoto =
    item.visualType === "photo" ||
    (representationUsesPhotos(student.representation) &&
      item.visualType !== "symbol");
  return (
    <button
      aria-label={item.label}
      className={`aac-cell aac-${item.kind}${predicted ? " predicted" : ""}`}
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

export default function StudentSpacePage() {
  const {
    students,
    activeStudentId,
    activities,
    lastSyncedAt,
    syncMode,
    setActiveStudent,
    showToast,
  } = useAriadne();
  const student =
    students.find((item) => item.id === activeStudentId) ?? students[0];
  const [tab, setTab] = useState<StudentTab>("talk");
  const [talkCategory, setTalkCategory] = useState<Category>("core");
  const [message, setMessage] = useState<VocabularyItem[]>([]);
  const [step, setStep] = useState(1);
  const [voiceState, setVoiceState] = useState<VoiceState>("ready");
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
          usageCount: original?.usageCount ?? 0,
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
      stableCore(studentVocabulary)
        .filter((item) => item.stablePosition !== undefined)
        .slice(0, 8),
    [studentVocabulary],
  );

  const currentActivity = student
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
  const safety = studentVocabulary.filter((item) =>
    ["help", "stop", "break", "no", "pain"].includes(item.id),
  );
  const criticalSafety = studentVocabulary.filter((item) =>
    ["help", "stop"].includes(item.id),
  );
  const fitWithSafety = (items: VocabularyItem[]) => {
    const unique = items.filter(
      (item, index, list) =>
        !criticalSafety.some((critical) => critical.id === item.id) &&
        list.findIndex((candidate) => candidate.id === item.id) === index,
    );
    return [
      ...unique.slice(0, Math.max(0, capacity - criticalSafety.length)),
      ...criticalSafety,
    ].slice(0, capacity);
  };

  const talkCategoryItems = studentVocabulary.filter(
    (item) =>
      (item.customCategory ?? item.category) === talkCategory,
  );
  const talkBoard =
    talkCategory === "core"
      ? fitWithSafety([
          ...core,
          ...(student.predictionsEnabled ? predictions : safety),
        ])
      : fitWithSafety([...talkCategoryItems, ...safety]);
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

  function speak(text?: string) {
    const phrase = text ?? message.map((item) => item.label).join(" ");
    if (!phrase) return;
    if (!student.speechEnabled) {
      showToast("Speech output is off in this learner profile.");
      return;
    }
    void speakNaturally(phrase, {
      rate: student.speechRate,
      voice: student.speechVoice,
      language: student.homeLanguage.toLowerCase().startsWith("spanish")
        ? "es-US"
        : "en-US",
      onStatus: setVoiceState,
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
            {currentActivity &&
            timingForActivity(currentActivity, now) === "now"
              ? "Happening now"
              : "Next activity"}
          </span>
          <strong>{currentActivity?.title ?? "No activity scheduled"}</strong>
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
                    <span key={`${item.id}-${index}`}>{item.label}</span>
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
                onClick={() => speak()}
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
                    {item.label}
                  </button>
                ))}
                <small>Suggestions never speak for you</small>
              </section>
            ) : null}

            {tab === "activity" ? (
              <section className="activity-board-heading">
                <div>
                  <p className="eyebrow">Activity communication</p>
                  <h1>{currentActivity?.title ?? "Classroom activity"}</h1>
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
                      <span>{label.slice(0, 1)}</span>
                      {label}
                    </button>
                  ))}
                </aside>
              ) : null}

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
                    predicted={
                      tab === "talk" &&
                      student.predictionsEnabled &&
                      predictions.slice(0, 4).some((entry) => entry.id === item.id)
                    }
                    student={student}
                  />
                ))}
              </section>
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
              {timedActivities.map(({ activity, timing }) => (
                <article className={timing} key={activity.id}>
                  <time>{formatTime(activity.time)}</time>
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
              ))}
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
                <strong>No steps were added for this activity.</strong>
                <span>The teacher can edit the shared activity.</span>
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
