"use client";

import {
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  Lightbulb,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { createId, useAriadne } from "@/lib/ariadne-store";
import "./insights.css";

export default function InsightsPage() {
  const { observations, students, addObservation, showToast } = useAriadne();
  const [period, setPeriod] = useState("30");
  const [referenceTime] = useState(() => Date.now());
  const [studentId, setStudentId] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [patternVisible, setPatternVisible] = useState(true);
  const [selectedObservation, setSelectedObservation] = useState<string | null>(
    null,
  );
  const [draft, setDraft] = useState({
    studentId: students[0]?.id ?? "",
    context: "",
    note: "",
    support: "",
    helpfulness: "not-rated" as
      | "helpful"
      | "partly-helpful"
      | "not-rated",
    observerRole: "classroom-teacher" as
      | "classroom-teacher"
      | "special-educator"
      | "slp"
      | "paraprofessional"
      | "family-reported",
    evidenceType: "direct-observation" as
      | "direct-observation"
      | "learner-selection"
      | "team-report",
  });
  const filtered = useMemo(
    () =>
      observations.filter(
        (observation) =>
          (studentId === "all" || observation.studentId === studentId) &&
          referenceTime - new Date(observation.createdAt).getTime() <=
            Number(period) * 86_400_000,
      ),
    [observations, period, referenceTime, studentId],
  );
  const helpfulCount = filtered.filter(
    (observation) => observation.helpfulness === "helpful",
  ).length;
  const contexts = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach((observation) => {
      counts.set(
        observation.context,
        (counts.get(observation.context) ?? 0) + 1,
      );
    });
    const max = Math.max(1, ...counts.values());
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .map(([label, count]) => ({
        label,
        count,
        width: Math.round((count / max) * 100),
      }));
  }, [filtered]);
  const supportSummary = useMemo(() => {
    const grouped = new Map<
      string,
      { uses: number; helpful: number; partial: number; students: Set<string> }
    >();
    filtered.forEach((observation) => {
      const current = grouped.get(observation.support) ?? {
        uses: 0,
        helpful: 0,
        partial: 0,
        students: new Set<string>(),
      };
      current.uses += 1;
      current.helpful += observation.helpfulness === "helpful" ? 1 : 0;
      current.partial += observation.helpfulness === "partly-helpful" ? 1 : 0;
      current.students.add(observation.studentId);
      grouped.set(observation.support, current);
    });
    return [...grouped.entries()]
      .map(([support, values]) => ({ support, ...values }))
      .sort((left, right) => right.uses - left.uses);
  }, [filtered]);
  const studentCoverage = useMemo(
    () =>
      students.map((student) => {
        const records = filtered.filter(
          (observation) => observation.studentId === student.id,
        );
        const lastRecord = records
          .slice()
          .sort(
            (left, right) =>
              new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime(),
          )[0];
        return {
          student,
          count: records.length,
          contexts: new Set(records.map((record) => record.context)).size,
          lastRecord,
        };
      }),
    [filtered, students],
  );

  function observerLabel(role: (typeof draft)["observerRole"]) {
    return {
      "classroom-teacher": "Classroom teacher",
      "special-educator": "Special educator",
      slp: "Speech-language pathologist",
      paraprofessional: "Paraprofessional",
      "family-reported": "Family report entered by staff",
    }[role];
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Participation patterns"
        title="Insights"
        description="Review support availability and educator observations. Ariadne never scores behavior, compliance, or learner worth."
      >
        <select
          aria-label="Insight period"
          className="select insight-period-select"
          onChange={(event) => setPeriod(event.target.value)}
          value={period}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </PageHeader>

      <div className="insight-principle">
        <ShieldCheck size={19} />
        <p>
          Every insight below comes from a saved evidence record: a direct
          team observation, an intentional learner selection, or a
          consented family report entered by staff. Ariadne does not infer
          emotion from cameras, listen in the background, or score behavior.
        </p>
      </div>

      <section className="insight-metrics">
        <article className="card">
          <span>Observations</span>
          <strong>{filtered.length}</strong>
          <small>
            <ArrowUpRight size={13} /> within {period} days
          </small>
        </article>
        <article className="card">
          <span>Supports recorded</span>
          <strong>{new Set(filtered.map((item) => item.support)).size}</strong>
          <small>Across documented contexts</small>
        </article>
        <article className="card">
          <span>Marked helpful</span>
          <strong>
            {filtered.length ? Math.round((helpfulCount / filtered.length) * 100) : 0}%
          </strong>
          <small>Source rating, never a student performance score</small>
        </article>
      </section>

      <div className="insights-layout">
        <section className="usage-chart card">
          <header>
            <div>
              <h2>Supports used by context</h2>
              <p>Availability and use, not student performance.</p>
            </div>
            <select
              aria-label="Insight student"
              onChange={(event) => setStudentId(event.target.value)}
              value={studentId}
            >
              <option value="all">All students</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName}
                </option>
              ))}
            </select>
          </header>
          <div className="bar-chart" aria-label="Supports used by context">
            {contexts.map(({ label, count, width }) => (
              <div className="bar-row" key={label}>
                <span>{label}</span>
                <div>
                  <i style={{ width: `${width}%` }} />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
            {!contexts.length ? (
              <p className="muted small">
                No evidence records match this student and date range.
              </p>
            ) : null}
          </div>
        </section>

        {patternVisible ? (
          <aside className="pattern-card">
            <div className="pattern-label">
              <CalendarRange size={16} /> Recorded pattern
            </div>
            <h2>{filtered.length} traceable support records</h2>
            <p>
              This summary groups only the evidence records shown below. Each
              record keeps its observer and evidence type.
            </p>
            <div className="pattern-evidence">
              <span>
                <CheckCircle2 size={15} /> {filtered.length} observations
              </span>
              <span>
                <MessageSquareText size={15} />{" "}
                {new Set(filtered.map((item) => item.context)).size} contexts
              </span>
            </div>
            <button
              className="button button-primary"
              onClick={() => setEvidenceOpen(true)}
              type="button"
            >
              Review evidence
            </button>
            <button
              className="button button-ghost"
              onClick={() => setPatternVisible(false)}
              type="button"
            >
              Dismiss
            </button>
          </aside>
        ) : (
          <aside className="card empty-state">
            <p className="muted small">Recorded pattern dismissed.</p>
            <button
              className="button button-secondary"
              onClick={() => setPatternVisible(true)}
              type="button"
            >
              Restore
            </button>
          </aside>
        )}
      </div>

      <section className="insight-action-grid">
        <article className="card support-summary">
          <header>
            <div>
              <h2>Support evidence</h2>
              <p>Which supports were recorded, for whom, and how they were rated.</p>
            </div>
          </header>
          <div className="support-summary-table">
            {supportSummary.map((item) => (
              <div key={item.support}>
                <strong>{item.support || "Support not named"}</strong>
                <span>{item.uses} record{item.uses === 1 ? "" : "s"}</span>
                <span>{item.students.size} learner{item.students.size === 1 ? "" : "s"}</span>
                <span>
                  {item.helpful} helpful · {item.partial} partly helpful
                </span>
              </div>
            ))}
            {!supportSummary.length ? (
              <p className="muted small">Add an evidence record to compare supports.</p>
            ) : null}
          </div>
        </article>

        <article className="card coverage-summary">
          <header>
            <div>
              <h2>Evidence coverage</h2>
              <p>Highlights profiles that need a fresh classroom observation.</p>
            </div>
          </header>
          {studentCoverage.map(({ student, count, contexts: contextCount, lastRecord }) => (
            <div className="coverage-row" key={student.id}>
              <span style={{ background: student.color }}>{student.initials}</span>
              <div>
                <strong>{student.firstName}</strong>
                <small>
                  {count
                    ? `${count} records across ${contextCount} contexts`
                    : `No records in the last ${period} days`}
                </small>
              </div>
              <button
                onClick={() => {
                  setDraft((current) => ({ ...current, studentId: student.id }));
                  setAddOpen(true);
                }}
                type="button"
              >
                {lastRecord ? "Add follow-up" : "Add first record"}
              </button>
            </div>
          ))}
        </article>
      </section>

      <section className="recent-observations">
        <div className="section-heading">
          <h2>Recent evidence records</h2>
          <button onClick={() => setAddOpen(true)} type="button">
            Add observation
          </button>
        </div>
        <div className="observation-list card">
          {filtered.map((observation, index) => {
            const student = students.find(
              (item) => item.id === observation.studentId,
            );
            return (
              <article key={observation.id}>
                <span
                  className={`observation-icon ${index % 2 ? "indigo" : ""}`}
                >
                  {index % 2 ? (
                    <MessageSquareText size={18} />
                  ) : (
                    <Lightbulb size={18} />
                  )}
                </span>
                <div>
                  <strong>{observation.context}</strong>
                  <p>{observation.note}</p>
                  <small>
                    {student?.firstName ?? "Student"} · {observation.support} ·{" "}
                    {observation.helpfulness.replaceAll("-", " ")} ·{" "}
                    {observerLabel(observation.observerRole)}
                  </small>
                </div>
                <button
                  onClick={() => setSelectedObservation(observation.id)}
                  type="button"
                >
                  Review
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <Modal
        onClose={() => setAddOpen(false)}
        open={addOpen}
        title="Add evidence record"
      >
        <div className="form-grid">
          <div className="field">
            <label htmlFor="observation-student">Student</label>
            <select
              className="select"
              id="observation-student"
              onChange={(event) =>
                setDraft({ ...draft, studentId: event.target.value })
              }
              value={draft.studentId}
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="observation-source">Who supplied this?</label>
            <select
              className="select"
              id="observation-source"
              onChange={(event) =>
                setDraft({
                  ...draft,
                  observerRole: event.target
                    .value as typeof draft.observerRole,
                })
              }
              value={draft.observerRole}
            >
              <option value="classroom-teacher">Classroom teacher</option>
              <option value="special-educator">Special educator</option>
              <option value="slp">Speech-language pathologist</option>
              <option value="paraprofessional">Paraprofessional</option>
              <option value="family-reported">
                Family report entered by staff
              </option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="observation-evidence">Evidence type</label>
            <select
              className="select"
              id="observation-evidence"
              onChange={(event) =>
                setDraft({
                  ...draft,
                  evidenceType: event.target
                    .value as typeof draft.evidenceType,
                })
              }
              value={draft.evidenceType}
            >
              <option value="direct-observation">Direct observation</option>
              <option value="learner-selection">
                Intentional learner selection
              </option>
              <option value="team-report">Team or family report</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="observation-context">Context</label>
            <input
              className="input"
              id="observation-context"
              onChange={(event) => setDraft({ ...draft, context: event.target.value })}
              value={draft.context}
            />
          </div>
          <div className="field">
            <label htmlFor="observation-support">Support available</label>
            <input
              className="input"
              id="observation-support"
              onChange={(event) => setDraft({ ...draft, support: event.target.value })}
              value={draft.support}
            />
          </div>
          <div className="field">
            <label htmlFor="observation-rating">Educator rating</label>
            <select
              className="select"
              id="observation-rating"
              onChange={(event) =>
                setDraft({
                  ...draft,
                  helpfulness: event.target.value as typeof draft.helpfulness,
                })
              }
              value={draft.helpfulness}
            >
              <option value="not-rated">Not rated</option>
              <option value="partly-helpful">Partly helpful</option>
              <option value="helpful">Helpful</option>
            </select>
          </div>
          <div className="field full">
            <label htmlFor="observation-note">What was observed?</label>
            <textarea
              className="textarea"
              id="observation-note"
              onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              value={draft.note}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button
            className="button button-primary"
            onClick={() => {
              if (!draft.context.trim() || !draft.note.trim()) {
                showToast("Add a context and observable note.");
                return;
              }
              addObservation({
                ...draft,
                id: createId("observation"),
                createdAt: new Date().toISOString(),
              });
              setAddOpen(false);
              showToast("Evidence record added with its source.");
            }}
            type="button"
          >
            Save observation
          </button>
        </div>
      </Modal>

      <Modal
        onClose={() => setEvidenceOpen(false)}
        open={evidenceOpen}
        title="Recorded evidence"
      >
        <div className="context-review-list">
          {filtered.map((observation) => (
            <article key={observation.id}>
              <strong>{observation.context}</strong>
              <p>{observation.note}</p>
            </article>
          ))}
        </div>
      </Modal>

      <Modal
        onClose={() => setSelectedObservation(null)}
        open={Boolean(selectedObservation)}
        title="Observation details"
      >
        {selectedObservation ? (
          (() => {
            const observation = observations.find(
              (item) => item.id === selectedObservation,
            );
            return observation ? (
              <div className="context-review-list">
                <article>
                  <strong>{observation.context}</strong>
                  <p>{observation.note}</p>
                </article>
                <article>
                  <strong>Source</strong>
                  <p>
                    {observerLabel(observation.observerRole)} ·{" "}
                    {observation.evidenceType.replaceAll("-", " ")}
                  </p>
                </article>
                <article>
                  <strong>Support rating</strong>
                  <p>
                    {observation.support} ·{" "}
                    {observation.helpfulness.replaceAll("-", " ")}
                  </p>
                </article>
              </div>
            ) : null;
          })()
        ) : null}
      </Modal>
    </div>
  );
}
