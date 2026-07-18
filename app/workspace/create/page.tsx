"use client";

import {
  ArrowRight,
  BookOpenText,
  Check,
  CircleHelp,
  ClipboardCheck,
  Eye,
  FileText,
  Grid2X2,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import {
  createId,
  representationUsesPhotos,
  type AriadneActivity,
  useAriadne,
} from "@/lib/ariadne-store";
import type { ActivityAiResult } from "@/lib/ai-contracts";
import { localDateKey } from "@/lib/schedule";
import "./create.css";

const supportIcons = [
  Grid2X2,
  ListChecks,
  Users,
  Volume2,
  BookOpenText,
  FileText,
];

function activityStudents(
  selectedIds: string[],
  students: ReturnType<typeof useAriadne>["students"],
) {
  return students
    .filter((student) => selectedIds.includes(student.id))
    .map((student) => student.firstName);
}

export default function CreatePage() {
  const router = useRouter();
  const {
    students,
    activities,
    materials,
    addActivity,
    updateActivity,
    addMaterial,
    updateMaterial,
    showToast,
  } = useAriadne();
  const [selectedIds, setSelectedIds] = useState(["maya", "leo"]);
  const [activityText, setActivityText] = useState(
    "We will make a fruit salad in groups. Students will choose fruit, take turns cutting a banana, add ingredients to a shared bowl, and mix everything together.",
  );
  const [context, setContext] = useState("Classroom kitchen");
  const [duration, setDuration] = useState("40");
  const [date, setDate] = useState(localDateKey());
  const [time, setTime] = useState("12:10");
  const [result, setResult] = useState<ActivityAiResult | null>(null);
  const [aiState, setAiState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [whyIndex, setWhyIndex] = useState<number | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [reviewerRole, setReviewerRole] = useState("Classroom teacher");
  const [sourceActivityId, setSourceActivityId] = useState<string | null>(null);
  const sourceLoaded = useRef(false);
  const selectedProfiles = students.filter((student) =>
    selectedIds.includes(student.id),
  );
  const sourceActivity = sourceActivityId
    ? activities.find((activity) => activity.id === sourceActivityId)
    : undefined;

  useEffect(() => {
    if (sourceLoaded.current) return;
    const activityId = new URLSearchParams(window.location.search).get(
      "activity",
    );
    if (!activityId) {
      sourceLoaded.current = true;
      return;
    }
    const activity = activities.find((item) => item.id === activityId);
    if (!activity) return;

    sourceLoaded.current = true;
    // The URL selects an existing activity after the client-side store hydrates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSourceActivityId(activity.id);
    setSelectedIds(activity.studentIds);
    setContext(activity.location);
    setDuration(String(activity.durationMinutes));
    setDate(activity.date);
    setTime(activity.time);
    const steps = activity.steps.map((step) => step.label).filter(Boolean);
    setActivityText(
      [
        `Prepare communication and visual supports for the scheduled activity "${activity.title}" in ${activity.location}.`,
        steps.length
          ? `The planned actions are: ${steps.join("; ")}.`
          : "The educator will describe the actions and materials below before generating the draft.",
      ].join(" "),
    );
  }, [activities]);

  function toggleStudent(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((studentId) => studentId !== id)
        : [...current, id],
    );
    setReviewed(false);
  }

  async function buildDraft() {
    if (!activityText.trim() || !selectedIds.length) {
      showToast("Describe the activity and select at least one student.");
      return;
    }
    const profileContext = selectedProfiles.map((student) => ({
      firstName: student.firstName,
      instructionMode: student.instructionMode,
      representation: student.representation,
      sensoryNotes: student.sensoryNotes,
      effectiveSupports: student.effectiveSupports,
    }));
    setResult(null);
    setReviewed(false);
    setAiState("loading");
    try {
      const response = await fetch("/api/ai/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity: activityText,
          context,
          durationMinutes: Number(duration),
          profiles: profileContext,
        }),
      });
      const payload = (await response.json()) as
        | ActivityAiResult
        | { error: string };
      if (!response.ok || !("steps" in payload)) {
        throw new Error("error" in payload ? payload.error : "AI unavailable");
      }
      setResult(payload);
      setAiState("ready");
      showToast("Private AI draft created. Educator review is required.");
    } catch {
      setAiState("error");
      showToast(
        "The local AI service could not create this draft. Check that Ollama is running, then try again.",
      );
    }
  }

  function saveMaterial(status: "draft" | "review" | "published") {
    if (!result) return;
    const names = activityStudents(selectedIds, students);
    const title = `${result.title} support package`;
    const student = names.join(" + ");
    const material = {
      id: createId("material"),
      title,
      type: "Coordinated support package",
      student,
      status,
      edited: "Just now",
      symbolProvider: selectedProfiles.some(
        (profile) => representationUsesPhotos(profile.representation),
      )
        ? "Photos + ARASAAC"
        : "ARASAAC",
      archived: false,
      description: `${result.supports.length} reviewed supports. ${result.summary}`,
      linkedActivityId: sourceActivityId ?? undefined,
      activityDraft: {
        title: sourceActivity?.title ?? result.title,
        date,
        time,
        durationMinutes: Number(duration),
        studentIds: selectedIds,
        context,
        location: context,
        activityKey: result.activityKey,
        activityVocabularyIds: result.activityVocabularyIds,
        steps: result.steps.map((step) => ({
          id: createId("step"),
          ...step,
        })),
      },
    };
    const existing = materials.find(
      (item) =>
        item.title === title &&
        item.student === student &&
        !item.archived,
    );
    if (existing) {
      updateMaterial(existing.id, { ...material, id: existing.id });
    } else {
      addMaterial(material);
    }
  }

  function publishAndSchedule() {
    if (!result || !reviewed) {
      showToast("A qualified team member must review the draft first.");
      return;
    }
    const names = activityStudents(selectedIds, students);
    const activity: AriadneActivity = {
      id: sourceActivityId ?? createId("activity"),
      title: sourceActivity?.title ?? result.title,
      date,
      time,
      durationMinutes: Number(duration),
      students: names,
      studentIds: selectedIds,
      context,
      location: context,
      status: "ready",
      activityKey: result.activityKey,
      activityVocabularyIds: result.activityVocabularyIds,
      steps: result.steps.map((step) => ({
        id: createId("step"),
        ...step,
      })),
    };
    saveMaterial("published");
    if (sourceActivityId) {
      updateActivity(sourceActivityId, activity);
      showToast(
        "Support package published. The scheduled activity is now Ready.",
      );
    } else {
      addActivity(activity);
      showToast(
        "Support package published and added to every assigned schedule.",
      );
    }
    router.push("/workspace/schedule");
  }

  return (
    <div className="page create-page">
      <PageHeader
        eyebrow="Private AI activity planner"
        title="Plan an accessible activity"
        description="A local language model organizes your plan. Profile rules ground the draft, a professional reviews it, and publishing sends it to the shared schedule."
      >
        <Link className="button button-secondary" href="/workspace/schedule">
          View schedule
        </Link>
      </PageHeader>

      {sourceActivity ? (
        <section className="source-activity-banner" aria-live="polite">
          <ClipboardCheck size={18} />
          <div>
            <strong>Preparing supports for “{sourceActivity.title}”</strong>
            <span>
              The scheduled item stays in place. After professional review and
              publishing, its status changes from Support not prepared to Ready.
            </span>
          </div>
        </section>
      ) : null}

      <ol className="create-steps" aria-label="Creation progress">
        <li className="complete">
          <span><Check size={13} /></span> Plan
        </li>
        <li className={result ? "complete" : "active"}>
          <span>{result ? <Check size={13} /> : 2}</span> AI draft
        </li>
        <li className={reviewed ? "complete" : result ? "active" : ""}>
          <span>{reviewed ? <Check size={13} /> : 3}</span> Professional review
        </li>
        <li className={reviewed ? "active" : ""}>
          <span>4</span> Publish & schedule
        </li>
      </ol>

      <div className="create-layout">
        <section className="activity-builder card">
          <div className="builder-heading">
            <span className="builder-icon"><Sparkles size={20} /></span>
            <div>
              <h2>What are you planning?</h2>
              <p>Include the actions, materials, group format, and environment.</p>
            </div>
          </div>
          <div className="builder-fields">
            <div className="field">
              <label htmlFor="activity">Activity</label>
              <textarea
                className="textarea activity-textarea"
                id="activity"
                onChange={(event) => {
                  setActivityText(event.target.value);
                  setReviewed(false);
                }}
                value={activityText}
              />
            </div>
            <div className="field">
              <label>Students</label>
              <div className="student-selector">
                {students.map((student) => (
                  <button
                    aria-pressed={selectedIds.includes(student.id)}
                    className={selectedIds.includes(student.id) ? "selected" : ""}
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    type="button"
                  >
                    <span style={{ background: student.color }}>
                      {student.firstName[0]}
                    </span>
                    {student.firstName}
                    {selectedIds.includes(student.id) ? <Check size={14} /> : <Plus size={14} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="builder-row">
              <div className="field">
                <label htmlFor="context">Location / context</label>
                <input
                  className="input"
                  id="context"
                  onChange={(event) => setContext(event.target.value)}
                  value={context}
                />
              </div>
              <div className="field">
                <label htmlFor="duration">Duration</label>
                <select
                  className="select"
                  id="duration"
                  onChange={(event) => setDuration(event.target.value)}
                  value={duration}
                >
                  <option value="20">20 minutes</option>
                  <option value="40">40 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                </select>
              </div>
            </div>
            <div className="builder-row">
              <div className="field">
                <label htmlFor="activity-date">Schedule date</label>
                <input
                  className="input"
                  id="activity-date"
                  onChange={(event) => setDate(event.target.value)}
                  type="date"
                  value={date}
                />
              </div>
              <div className="field">
                <label htmlFor="activity-time">Start time</label>
                <input
                  className="input"
                  id="activity-time"
                  onChange={(event) => setTime(event.target.value)}
                  type="time"
                  value={time}
                />
              </div>
            </div>
            <div className="copilot-boundary">
              <ShieldCheck size={18} />
              <p>
                Qwen 2.5 runs through Ollama on this computer. Only the selected
                classroom-access fields are used. AI creates a draft; it cannot
                approve or publish support for a learner.
              </p>
            </div>
            {aiState === "loading" ? (
              <div className="ai-build-progress" aria-live="polite">
                <span>Ariadne is building an AAC-aware draft…</span>
                <small>
                  The activity and selected profile fields are being analyzed locally.
                </small>
              </div>
            ) : null}
            {aiState === "error" ? (
              <p className="field-error" role="alert">
                The local model is unavailable. Your activity text is safe and
                unchanged; start Ollama and try again.
              </p>
            ) : null}
            <button
              className="button button-primary analyze-button"
              disabled={aiState === "loading"}
              onClick={() => void buildDraft()}
              type="button"
            >
              <Sparkles size={17} />
              {result ? "Rebuild AI draft" : "Analyze with private AI"}
            </button>
          </div>
        </section>

        <aside className="context-panel card">
          <div className="context-panel-heading">
            <span><Eye size={17} /> Profile context used</span>
            <small>{selectedProfiles.length} selected</small>
          </div>
          {selectedProfiles.map((student) => (
            <div className="context-student" key={student.id}>
              <div>
                <span className="mini-avatar" style={{ background: student.color }}>
                  {student.firstName[0]}
                </span>
                <strong>{student.firstName}</strong>
              </div>
              <ul>
                <li>{student.instructionMode.replaceAll("-", " ")} instructions</li>
                <li>{student.communicationMode}</li>
                <li>{student.sensoryNotes}</li>
                <li>{student.effectiveSupports[0] ?? "Profile review still needed"}</li>
              </ul>
            </div>
          ))}
          <button className="context-data-link" onClick={() => setContextOpen(true)} type="button">
            View exactly what was used <ArrowRight size={14} />
          </button>
        </aside>
      </div>

      {result ? (
        <section className="analysis-results" aria-live="polite">
          <div className="analysis-heading">
            <div>
              <p className="eyebrow">
                Private AI draft
              </p>
              <h2>{result.title}</h2>
              <p>{result.summary}</p>
            </div>
            <button className="button button-secondary" onClick={() => {
              setResult(null);
              setReviewed(false);
              setAiState("idle");
            }} type="button">
              <RotateCcw size={16} /> Start over
            </button>
          </div>

          <div className="barrier-table card">
            <div className="barrier-table-head">
              <span>Possible access demand</span>
              <span>Evidence used</span>
              <span>Draft support</span>
            </div>
            {result.barriers.map((barrier) => (
              <article key={barrier.title}>
                <span className="barrier-label"><CircleHelp size={17} /> {barrier.title}</span>
                <p>{barrier.reason}</p>
                <strong>{barrier.support}</strong>
              </article>
            ))}
          </div>

          <div className="support-package-heading">
            <div>
              <h2>Editable support draft</h2>
              <p>{result.supports.length} supports · never student-visible until approved</p>
            </div>
            <span className="review-required">
              <ClipboardCheck size={15} /> Needs professional review
            </span>
          </div>

          <div className="support-package-grid">
            {result.supports.map((support, index) => {
              const Icon = supportIcons[index % supportIcons.length];
              return (
                <article className="support-card card" key={`${support.title}-${index}`}>
                  <span className={`support-card-icon ${support.color}`}><Icon size={21} /></span>
                  <div>
                    <h3>{support.title}</h3>
                    <p>{support.detail}</p>
                  </div>
                  <button
                    aria-label={`Edit ${support.title}`}
                    className="icon-button"
                    onClick={() => setEditIndex(index)}
                    type="button"
                  >
                    <Pencil size={15} />
                  </button>
                  <button className="why-support" onClick={() => setWhyIndex(index)} type="button">
                    Why this support?
                  </button>
                </article>
              );
            })}
          </div>

          <section className="generated-sequence card">
            <header>
              <div>
                <p className="eyebrow">Student-facing visual sequence</p>
                <h2>Review every step and concept</h2>
                <p>
                  Each comma-separated concept becomes its own photo, symbol,
                  or text cell in the learner&apos;s preferred representation.
                </p>
              </div>
              <span>{result.steps.length} steps</span>
            </header>
            <label className="activity-vocabulary-editor">
              <span>
                <strong>Activity board vocabulary</strong>
                <small>
                  Selected by AI for this activity. Edit the comma-separated
                  words before publishing; permanent safety words remain
                  available automatically.
                </small>
              </span>
              <input
                aria-label="Activity board vocabulary"
                className="input"
                onChange={(event) => {
                  setResult({
                    ...result,
                    activityVocabularyIds: [
                      ...new Set(
                        event.target.value
                          .split(",")
                          .map((item) =>
                            item
                              .trim()
                              .toLowerCase()
                              .replaceAll(/\s+/g, "-"),
                          )
                          .filter(Boolean),
                      ),
                    ],
                  });
                  setReviewed(false);
                }}
                value={result.activityVocabularyIds.join(", ")}
              />
            </label>
            <div>
              {result.steps.map((step, index) => (
                <article key={`${step.label}-${index}`}>
                  <span>{index + 1}</span>
                  <label>
                    Step wording
                    <input
                      aria-label={`Step ${index + 1} wording`}
                      className="input"
                      onChange={(event) => {
                        const steps = [...result.steps];
                        steps[index] = {
                          ...steps[index],
                          label: event.target.value,
                        };
                        setResult({ ...result, steps });
                        setReviewed(false);
                      }}
                      value={step.label}
                    />
                  </label>
                  <label>
                    Separate visual concepts
                    <input
                      aria-label={`Step ${index + 1} visual concepts`}
                      className="input"
                      onChange={(event) => {
                        const steps = [...result.steps];
                        steps[index] = {
                          ...steps[index],
                          vocabularyIds: event.target.value
                            .split(",")
                            .map((item) =>
                              item
                                .trim()
                                .toLowerCase()
                                .replaceAll(/\s+/g, "-"),
                            )
                            .filter(Boolean),
                        };
                        setResult({ ...result, steps });
                        setReviewed(false);
                      }}
                      value={step.vocabularyIds.join(", ")}
                    />
                  </label>
                </article>
              ))}
            </div>
          </section>

          <section className="professional-review card">
            <div>
              <p className="eyebrow">Who reviews this?</p>
              <h2>Activity-level professional review</h2>
              <p>
                The classroom teacher or special educator checks wording,
                sequence, safety, and assignments. An SLP/IEP team is required
                only if this changes permanent AAC vocabulary or the learner profile.
              </p>
            </div>
            <label>
              Reviewer role
              <select className="select" onChange={(event) => setReviewerRole(event.target.value)} value={reviewerRole}>
                <option>Classroom teacher</option>
                <option>Special educator</option>
                <option>Speech-language pathologist</option>
              </select>
            </label>
            <label className="review-check">
              <input
                checked={reviewed}
                onChange={(event) => setReviewed(event.target.checked)}
                type="checkbox"
              />
              I reviewed learner assignments, wording, step order, safety
              vocabulary, and access to stop/help.
            </label>
          </section>

          <div className="analysis-footer">
            <div>
              <ShieldCheck size={18} />
              <p>
                Publishing creates the reviewed material and{" "}
                {sourceActivityId
                  ? "updates the existing shared schedule activity."
                  : "creates one shared schedule activity."}
                Each assigned learner sees the same plan rendered with their own
                photos, symbols, grid, speech, and instruction settings.
              </p>
            </div>
            <div className="publish-actions">
              <button className="button button-secondary" onClick={() => {
                saveMaterial("review");
                showToast(`Saved for review by a ${reviewerRole.toLowerCase()}.`);
              }} type="button">
                Save for review
              </button>
              <button className="button button-primary" disabled={!reviewed} onClick={publishAndSchedule} type="button">
                {sourceActivityId
                  ? "Publish & mark activity Ready"
                  : "Publish & add to schedule"}{" "}
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <Modal
        description="Only classroom-access fields relevant to this activity were sent to the private model."
        onClose={() => setContextOpen(false)}
        open={contextOpen}
        title="Profile context used"
      >
        <div className="context-review-list">
          {selectedProfiles.map((student) => (
            <article key={student.id}>
              <strong>{student.firstName}</strong>
              <p>
                Instruction display: {student.instructionMode.replaceAll("-", " ")} ·
                Representation: {student.representation.replaceAll("-", " ")} ·
                Sensory/access note: {student.sensoryNotes}
              </p>
            </article>
          ))}
        </div>
        <p className="muted small">
          Diagnoses, medical records, family contact details, and unrelated
          notes are excluded.
        </p>
      </Modal>

      <Modal
        onClose={() => setEditIndex(null)}
        open={editIndex !== null}
        title="Edit support"
      >
        {editIndex !== null && result?.supports[editIndex] ? (
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="support-title">Title</label>
              <input
                className="input"
                id="support-title"
                onChange={(event) => {
                  const supports = [...result.supports];
                  supports[editIndex] = { ...supports[editIndex], title: event.target.value };
                  setResult({ ...result, supports });
                  setReviewed(false);
                }}
                value={result.supports[editIndex].title}
              />
            </div>
            <div className="field full">
              <label htmlFor="support-detail">Student-facing detail</label>
              <textarea
                className="textarea"
                id="support-detail"
                onChange={(event) => {
                  const supports = [...result.supports];
                  supports[editIndex] = { ...supports[editIndex], detail: event.target.value };
                  setResult({ ...result, supports });
                  setReviewed(false);
                }}
                value={result.supports[editIndex].detail}
              />
            </div>
            <div className="modal-actions">
              <button className="button button-primary" onClick={() => setEditIndex(null)} type="button">
                Save edit
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        onClose={() => setWhyIndex(null)}
        open={whyIndex !== null}
        title="Why this draft support?"
      >
        {whyIndex !== null && result?.supports[whyIndex] ? (
          <>
            <p>{result.supports[whyIndex].why}</p>
            <div className="draft-guardrail">
              <ShieldCheck size={17} />
              <p>
                This is an AI-generated rationale grounded in the activity and
                reviewed profile fields. It is not a diagnosis or a conclusion
                about the learner. The reviewer can edit or remove it.
              </p>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
