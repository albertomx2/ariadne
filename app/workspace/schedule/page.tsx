"use client";

import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Pencil,
  Plus,
  Radio,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import {
  createId,
  type ActivityStep,
  type AriadneActivity,
  useAriadne,
} from "@/lib/ariadne-store";
import {
  activitiesForStudent,
  formatDay,
  formatTime,
  localDateKey,
  parseActivityStart,
  timingForActivity,
  withNextTiming,
} from "@/lib/schedule";
import "./schedule.css";

const activityTypes = [
  ["classroom", "Classroom activity"],
  ["fruit-salad", "Cooking / fruit salad"],
  ["science", "Science"],
  ["reading", "Reading"],
  ["morning-meeting", "Morning meeting"],
  ["music", "Music"],
  ["playground", "Playground"],
  ["art", "Art"],
  ["check-in", "Check-in"],
] as const;

function shiftDate(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day + amount);
  return localDateKey(date);
}

function dateRange(center: string) {
  return [-2, -1, 0, 1, 2].map((amount) => shiftDate(center, amount));
}

function defaultActivity(date: string): Omit<AriadneActivity, "id"> {
  return {
    time: "13:00",
    title: "",
    students: [],
    studentIds: [],
    context: "Room 14",
    location: "Room 14",
    status: "needs-supports",
    date,
    durationMinutes: 45,
    activityKey: "classroom",
    steps: [],
  };
}

function stepsToText(steps: ActivityStep[]) {
  return steps
    .map((step) => `${step.label}|${step.vocabularyIds.join(",")}`)
    .join("\n");
}

function textToSteps(text: string): ActivityStep[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, vocabularyIds = ""] = line.split("|");
      return {
        id: createId("step"),
        label: label.trim(),
        vocabularyIds: vocabularyIds
          .split(",")
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean),
      };
    });
}

export default function SchedulePage() {
  const {
    activities,
    students,
    addActivity,
    updateActivity,
    deleteActivity,
    lastSyncedAt,
    syncMode,
    showToast,
  } = useAriadne();
  const today = localDateKey();
  const [selectedDate, setSelectedDate] = useState(today);
  const [editorOpen, setEditorOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(defaultActivity(today));
  const [stepsText, setStepsText] = useState("");
  const [importText, setImportText] = useState(
    "13:20, Indoor recess, Maya|Leo|Noah\n14:00, Art studio, Maya|Leo",
  );
  const [previewStudentId, setPreviewStudentId] = useState("maya");
  const [previewTime, setPreviewTime] = useState("10:15");
  const selectedActivities = useMemo(
    () =>
      activities
        .filter((activity) => activity.date === selectedDate)
        .sort(
          (left, right) =>
            parseActivityStart(left).getTime() -
            parseActivityStart(right).getTime(),
        ),
    [activities, selectedDate],
  );
  const previewStudent =
    students.find((student) => student.id === previewStudentId) ?? students[0];
  const previewActivities = previewStudent
    ? activitiesForStudent(activities, previewStudent, selectedDate)
    : [];
  const previewNow = new Date(`${selectedDate}T${previewTime}:00`);
  const previewTimeline = withNextTiming(previewActivities, previewNow);

  function openEditor(activity?: AriadneActivity) {
    if (activity) {
      setEditingId(activity.id);
      setDraft({
        time: activity.time,
        title: activity.title,
        students: [...activity.students],
        studentIds: [...activity.studentIds],
        context: activity.context,
        location: activity.location,
        status: activity.status,
        date: activity.date,
        durationMinutes: activity.durationMinutes,
        activityKey: activity.activityKey,
        steps: [...activity.steps],
        changePrepared: activity.changePrepared,
      });
      setStepsText(stepsToText(activity.steps));
    } else {
      setEditingId(null);
      setDraft(defaultActivity(selectedDate));
      setStepsText("");
    }
    setEditorOpen(true);
  }

  function saveActivity() {
    if (!draft.title.trim()) {
      showToast("Add an activity title.");
      return;
    }
    const next = { ...draft, steps: textToSteps(stepsText) };
    if (editingId) updateActivity(editingId, next);
    else addActivity({ ...next, id: createId("activity") });
    setEditorOpen(false);
    showToast(
      editingId
        ? "Activity updated across assigned student schedules."
        : "Activity added to assigned student schedules.",
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Shared visual planning"
        title="Schedule"
        description="Plan several days. Assigned activities appear automatically in each learner's My Day, Activity, and My Steps views."
      >
        <Link className="button button-secondary" href="/workspace/create">
          Plan with private AI
        </Link>
        <button
          className="button button-secondary"
          onClick={() => setImportOpen(true)}
          type="button"
        >
          <CalendarDays size={17} /> Import day
        </button>
        <button
          className="button button-primary"
          onClick={() => openEditor()}
          type="button"
        >
          <Plus size={17} /> Add manually
        </button>
      </PageHeader>

      <section className="schedule-sync-bar" aria-label="Schedule sync status">
        <span>
          <Radio size={15} />
          {syncMode === "supabase"
            ? "Realtime device synchronization"
            : "Live synchronization in this browser"}
        </span>
        <small>
          {lastSyncedAt
            ? `Last update ${new Intl.DateTimeFormat("en-US", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              }).format(new Date(lastSyncedAt))}`
            : "Ready"}
        </small>
      </section>

      <section className="schedule-planning-guide" aria-label="Planning options">
        <Link
          className="schedule-planning-option"
          href="/workspace/create"
        >
          <Sparkles size={17} />
          <p>
            <strong>Plan with private AI</strong>
            Creates editable supports, requires educator review, then publishes
            the activity here.
          </p>
          <ArrowRight size={15} />
        </Link>
        <button
          className="schedule-planning-option"
          onClick={() => openEditor()}
          type="button"
        >
          <Plus size={17} />
          <p>
            <strong>Add manually</strong>
            Adds the schedule item now and lets you mark whether learner-facing
            supports are already prepared.
          </p>
          <ArrowRight size={15} />
        </button>
      </section>

      <div className="schedule-day-picker">
        <button
          aria-label="Previous day"
          onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
          type="button"
        >
          <ChevronLeft size={18} />
        </button>
        {dateRange(selectedDate).map((date) => (
          <button
            className={date === selectedDate ? "active" : ""}
            key={date}
            onClick={() => setSelectedDate(date)}
            type="button"
          >
            <span>{formatDay(date, { short: true }).split(",")[0]}</span>
            <strong>{Number(date.slice(-2))}</strong>
            {activities.some((activity) => activity.date === date) ? (
              <i aria-label="Activities scheduled" />
            ) : null}
          </button>
        ))}
        <button
          aria-label="Next day"
          onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
          type="button"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="schedule-layout">
        <section className="day-schedule card">
          <header>
            <div>
              <p className="eyebrow">
                {selectedDate === today ? "Today" : "Classroom day"}
              </p>
              <h2>{formatDay(selectedDate)}</h2>
            </div>
            <span>{selectedActivities.length} activities</span>
          </header>

          <div className="timeline">
            {selectedActivities.map((activity) => {
              const timing =
                selectedDate === today
                  ? timingForActivity(activity)
                  : "later";
              return (
                <article
                  className={`timeline-item ${timing}`}
                  key={activity.id}
                >
                  <time>{formatTime(activity.time)}</time>
                  <span className="timeline-dot">
                    {timing === "finished" ? <Check size={12} /> : null}
                  </span>
                  <div>
                    <strong>{activity.title}</strong>
                    <span>
                      {activity.durationMinutes} min · {activity.location} ·{" "}
                      {activity.students.join(", ") || "No students assigned"}
                    </span>
                  </div>
                  <span className="timeline-actions">
                    <StatusPill status={activity.status} />
                    {activity.status === "needs-supports" ? (
                      <Link
                        className="timeline-prepare"
                        href={`/workspace/create?activity=${encodeURIComponent(activity.id)}`}
                      >
                        Prepare supports <ArrowRight size={14} />
                      </Link>
                    ) : null}
                    <button
                      aria-label={`Edit ${activity.title}`}
                      className="timeline-edit"
                      onClick={() => openEditor(activity)}
                      title="Edit and sync for assigned learners"
                      type="button"
                    >
                      <Pencil size={14} /> <span>Edit</span>
                    </button>
                  </span>
                </article>
              );
            })}
            {!selectedActivities.length ? (
              <div className="schedule-empty-day">
                <CalendarDays size={30} />
                <strong>No activities scheduled.</strong>
                <button onClick={() => openEditor()} type="button">
                  Add the first activity
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="schedule-side">
          <section className="student-schedule-preview card">
            <header>
              <span>
                <Clock3 size={16} /> Student schedule preview
              </span>
              <select
                aria-label="Preview student"
                onChange={(event) => setPreviewStudentId(event.target.value)}
                value={previewStudentId}
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName}
                  </option>
                ))}
              </select>
            </header>
            <label className="schedule-preview-time">
              Preview device time
              <input
                onInput={(event) =>
                  setPreviewTime((event.target as HTMLInputElement).value)
                }
                type="time"
                value={previewTime}
              />
            </label>
            <div className="preview-agenda">
              {previewTimeline.map(({ activity, timing }) => (
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
                            : "Later"}
                    </span>
                  </div>
                </article>
              ))}
              {!previewTimeline.length ? (
                <p>No activities assigned to {previewStudent?.firstName}.</p>
              ) : null}
            </div>
            {previewStudent ? (
              <Link
                className="button button-primary"
                href={`/student?student=${previewStudent.id}&at=${selectedDate}T${previewTime}:00`}
              >
                Open time-aware student preview <ArrowRight size={16} />
              </Link>
            ) : null}
          </section>

          <section className="schedule-change-card">
            <div className="change-heading">
              <span className="change-icon">
                <RefreshCcw size={19} />
              </span>
              <div>
                <p className="eyebrow">Automatic propagation</p>
                <h2>One edit, every assigned learner</h2>
              </div>
            </div>
            <p>
              Date, time, activity vocabulary, and steps are shared. A learner
              only sees activities assigned to their profile, rendered with
              their own display and representation preferences.
            </p>
          </section>
        </aside>
      </div>

      <Modal
        onClose={() => setEditorOpen(false)}
        open={editorOpen}
        size="large"
        title={editingId ? "Edit shared activity" : "Add shared activity"}
      >
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="schedule-title">Activity title</label>
            <input
              className="input"
              id="schedule-title"
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
              value={draft.title}
            />
          </div>
          <div className="field">
            <label htmlFor="schedule-date">Date</label>
            <input
              className="input"
              id="schedule-date"
              onInput={(event) =>
                setDraft({
                  ...draft,
                  date: (event.target as HTMLInputElement).value,
                })
              }
              type="date"
              value={draft.date}
            />
          </div>
          <div className="field">
            <label htmlFor="schedule-time">Start time</label>
            <input
              className="input"
              id="schedule-time"
              onInput={(event) =>
                setDraft({
                  ...draft,
                  time: (event.target as HTMLInputElement).value,
                })
              }
              type="time"
              value={draft.time}
            />
          </div>
          <div className="field">
            <label htmlFor="schedule-duration">Duration in minutes</label>
            <input
              className="input"
              id="schedule-duration"
              min={5}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  durationMinutes: Number(event.target.value),
                })
              }
              type="number"
              value={draft.durationMinutes}
            />
          </div>
          <div className="field">
            <label htmlFor="schedule-type">Activity vocabulary</label>
            <select
              className="select"
              id="schedule-type"
              onChange={(event) =>
                setDraft({ ...draft, activityKey: event.target.value })
              }
              value={draft.activityKey}
            >
              {activityTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field full">
            <label htmlFor="schedule-location">Location</label>
            <input
              className="input"
              id="schedule-location"
              onChange={(event) =>
                setDraft({
                  ...draft,
                  location: event.target.value,
                  context: event.target.value,
                })
              }
              value={draft.location}
            />
          </div>
          <div className="field full">
            <label htmlFor="schedule-support-status">Learner-facing support status</label>
            <select
              className="select"
              id="schedule-support-status"
              onChange={(event) =>
                setDraft({
                  ...draft,
                  status: event.target.value as AriadneActivity["status"],
                })
              }
              value={draft.status}
            >
              <option value="needs-supports">
                Support not prepared — create and review it next
              </option>
              <option value="ready">
                Ready — reviewed support already exists or is not required
              </option>
            </select>
            <p className="field-hint">
              “Support not prepared” means the activity is scheduled, but its
              visual steps, communication vocabulary, or other assigned supports
              have not been reviewed and published yet.
            </p>
          </div>
          <div className="field full">
            <label>Students</label>
            <div className="choice-grid">
              {students.map((student) => (
                <button
                  className={`choice-button ${
                    draft.studentIds.includes(student.id) ? "active" : ""
                  }`}
                  key={student.id}
                  onClick={() => {
                    const selected = draft.studentIds.includes(student.id);
                    setDraft({
                      ...draft,
                      studentIds: selected
                        ? draft.studentIds.filter((id) => id !== student.id)
                        : [...draft.studentIds, student.id],
                      students: selected
                        ? draft.students.filter(
                            (name) => name !== student.firstName,
                          )
                        : [...draft.students, student.firstName],
                    });
                  }}
                  type="button"
                >
                  <strong>{student.firstName}</strong>
                  <small>{student.communicationMode}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="field full">
            <label htmlFor="schedule-steps">Visual steps</label>
            <textarea
              className="textarea"
              id="schedule-steps"
              onChange={(event) => setStepsText(event.target.value)}
              placeholder={"Cut the banana.|cut,banana\nMix the fruit.|mix,fruit"}
              value={stepsText}
            />
            <p className="field-hint">
              One step per line. After the |, add separate vocabulary concepts
              so “cut the banana” displays CUT and BANANA independently.
            </p>
          </div>
        </div>
        <div className="modal-actions">
          {editingId ? (
            <button
              className="button button-danger-soft"
              onClick={() => {
                deleteActivity(editingId);
                setEditorOpen(false);
                showToast("Activity removed from assigned student schedules.");
              }}
              type="button"
            >
              Delete
            </button>
          ) : null}
          <button
            className="button button-secondary"
            onClick={() => setEditorOpen(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            onClick={saveActivity}
            type="button"
          >
            Save and sync activity
          </button>
        </div>
      </Modal>

      <Modal
        description="Paste one activity per line as time, title, students separated by |."
        onClose={() => setImportOpen(false)}
        open={importOpen}
        title={`Import ${formatDay(selectedDate)}`}
      >
        <div className="field">
          <label htmlFor="schedule-import">Schedule data</label>
          <textarea
            className="textarea"
            id="schedule-import"
            onChange={(event) => setImportText(event.target.value)}
            value={importText}
          />
        </div>
        <div className="modal-actions">
          <button
            className="button button-primary"
            onClick={() => {
              importText
                .split("\n")
                .map((line) => line.split(",").map((part) => part.trim()))
                .filter((parts) => parts.length >= 2 && parts[1])
                .forEach(([time, title, studentList]) => {
                  const names = studentList
                    ? studentList.split("|").map((item) => item.trim())
                    : [];
                  addActivity({
                    ...defaultActivity(selectedDate),
                    id: createId("activity"),
                    time,
                    title,
                    students: names,
                    studentIds: students
                      .filter((student) => names.includes(student.firstName))
                      .map((student) => student.id),
                  });
                });
              setImportOpen(false);
              showToast("The day was imported and shared.");
            }}
            type="button"
          >
            Import and sync activities
          </button>
        </div>
      </Modal>
    </div>
  );
}
