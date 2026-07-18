"use client";

import {
  ArrowLeft,
  Check,
  Clock3,
  FileDown,
  FileText,
  Headphones,
  MessageSquareText,
  Pencil,
  ShieldAlert,
  SlidersHorizontal,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { StudentBoardEditor } from "@/components/student-board-editor";
import { downloadText } from "@/lib/download";
import {
  representationLabel,
  representationUsesPhotos,
  type RepresentationMode,
  type StudentProfile,
  useAriadne,
} from "@/lib/ariadne-store";
import "../students.css";

type ProfileSection =
  | "overview"
  | "communication"
  | "access"
  | "supports"
  | "board"
  | "interests"
  | "emergency";

function passportText(student: StudentProfile) {
  return `ARIADNE COMMUNICATION PASSPORT

Student: ${student.firstName}
Grade: ${student.grade}
Primary communication: ${student.communicationMode}
Preferred display: ${student.grid}
Home language: ${student.homeLanguage}

HOW I COMMUNICATE
Yes: ${student.yesMethod}
No / rejection: ${student.noMethod}
Help: ${student.helpMethod}
Finished: ${student.finishMethod}

WHAT HELPS
${student.effectiveSupports.map((support) => `• ${support}`).join("\n")}

INTERESTS
${student.interests.join(", ") || "Not yet documented"}

SENSORY AND ACCESS NOTES
${student.sensoryNotes}

Always keep help, break, stop, no, pain, and trusted-adult messages available.
`;
}

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const {
    students,
    updateStudent,
    deleteStudent,
    setActiveStudent,
    showToast,
  } = useAriadne();
  const student = students.find((item) => item.id === params.id) ?? students[0];
  const [editOpen, setEditOpen] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<StudentProfile | null>(null);
  const [activeSection, setActiveSection] =
    useState<ProfileSection>("overview");
  const [photoWord, setPhotoWord] = useState("");

  if (!student) {
    return (
      <div className="page">
        <div className="card empty-state">
          <h1>Student not found</h1>
          <Link className="button button-primary" href="/workspace/students">
            Return to students
          </Link>
        </div>
      </div>
    );
  }

  function openEdit() {
    setDraft({ ...student, interests: [...student.interests] });
    setEditOpen(true);
  }

  function saveProfile() {
    if (!draft) return;
    updateStudent(student.id, draft);
    setEditOpen(false);
    showToast(`${student.firstName}'s preferences were saved.`);
  }

  return (
    <div className="page">
      <Link className="back-link" href="/workspace/students">
        <ArrowLeft size={15} /> All students
      </Link>

      <PageHeader
        eyebrow="Functional profile"
        title={student.firstName}
        description="Communication, access, and presentation preferences for everyday classroom participation."
      >
        <button
          className="button button-secondary"
          onClick={() => setPassportOpen(true)}
          type="button"
        >
          <FileText size={17} /> Communication passport
        </button>
        <button className="button button-primary" onClick={openEdit} type="button">
          <Pencil size={17} /> Edit profile
        </button>
      </PageHeader>

      <div className="profile-summary card">
        <span
          className="student-avatar large"
          style={{ backgroundColor: student.color }}
        >
          {student.initials}
        </span>
        <div>
          <span>Primary communication</span>
          <strong>{student.communicationMode}</strong>
        </div>
        <div>
          <span>Preferred display</span>
          <strong>
            {student.gridRows} rows × {student.gridColumns} columns
          </strong>
        </div>
        <div>
          <span>Wait time</span>
          <strong>{student.processingTime} seconds</strong>
        </div>
        <div>
          <span>Symbol system</span>
          <strong>
            {student.symbolProvider === "arasaac" ? "ARASAAC" : "Custom photos"}
          </strong>
        </div>
      </div>

      <nav className="profile-tabs" aria-label="Student profile sections">
        {[
          ["overview", "Overview"],
          ["communication", "Communication"],
          ["access", "Access"],
          ["supports", "Effective supports"],
          ["board", "Communication board"],
          ["interests", "Interests"],
          ["emergency", "Emergency"],
        ].map(([id, label]) => (
          <button
            aria-current={activeSection === id ? "page" : undefined}
            className={activeSection === id ? "active" : ""}
            key={id}
            onClick={() => setActiveSection(id as ProfileSection)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {activeSection === "board" ? (
        <StudentBoardEditor
          onChange={(patch) => {
            updateStudent(student.id, patch);
            showToast(
              `${student.firstName}'s communication board was updated.`,
            );
          }}
          student={student}
        />
      ) : null}

      <div
        className={`profile-layout ${
          activeSection === "overview" ? "" : "focused"
        }`}
        hidden={activeSection === "board"}
        id="overview"
      >
        <div className="profile-main">
          <section
            className="profile-section card"
            hidden={
              activeSection !== "overview" && activeSection !== "communication"
            }
            id="communication"
          >
            <div className="profile-section-heading">
              <span className="profile-section-icon teal">
                <MessageSquareText size={20} />
              </span>
              <div>
                <h2>Communication</h2>
                <p>Observable ways {student.firstName} communicates.</p>
              </div>
              <button
                aria-label="Edit communication"
                className="icon-button"
                onClick={openEdit}
                type="button"
              >
                <Pencil size={16} />
              </button>
            </div>
            <div className="profile-details-grid">
              <div>
                <span>Yes</span>
                <strong>{student.yesMethod}</strong>
              </div>
              <div>
                <span>No / rejection</span>
                <strong>{student.noMethod}</strong>
              </div>
              <div>
                <span>Requests help</span>
                <strong>{student.helpMethod}</strong>
              </div>
              <div>
                <span>Ends an activity</span>
                <strong>{student.finishMethod}</strong>
              </div>
            </div>
          </section>

          <section
            className="profile-section card"
            hidden={activeSection !== "overview" && activeSection !== "access"}
            id="access"
          >
            <div className="profile-section-heading">
              <span className="profile-section-icon indigo">
                <Headphones size={20} />
              </span>
              <div>
                <h2>Sensory and presentation access</h2>
                <p>These settings automatically configure Student Space.</p>
              </div>
              <button
                aria-label="Edit access preferences"
                className="icon-button"
                onClick={openEdit}
                type="button"
              >
                <Pencil size={16} />
              </button>
            </div>
            <ul className="support-list">
              <li>
                <SlidersHorizontal size={17} />
                <span>
                  <strong>Display</strong>
                  {student.gridColumns} columns · {student.cellScale} cells ·{" "}
                  {student.textScale} text
                </span>
              </li>
              <li>
                <Volume2 size={17} />
                <span>
                  <strong>Speech</strong>
                  {student.speechEnabled
                    ? `Enabled at ${student.speechRate.toFixed(2)}× speed`
                    : "Speech output disabled"}
                </span>
              </li>
              <li>
                <Clock3 size={17} />
                <span>
                  <strong>Processing time</strong>
                  Wait {student.processingTime} seconds before repeating.
                </span>
              </li>
              <li>
                <Headphones size={17} />
                <span>
                  <strong>Sensory notes</strong>
                  {student.sensoryNotes}
                </span>
              </li>
              <li>
                <MessageSquareText size={17} />
                <span>
                  <strong>Representation</strong>
                  {representationLabel(student.representation)}
                  {representationUsesPhotos(student.representation)
                    ? ` · ${Object.keys(student.customPhotos).length} familiar photo overrides`
                    : ""}
                </span>
              </li>
            </ul>
          </section>

          <section
            className="profile-section card"
            hidden={activeSection !== "overview" && activeSection !== "supports"}
            id="supports"
          >
            <div className="profile-section-heading">
              <span className="profile-section-icon teal">
                <Check size={20} />
              </span>
              <div>
                <h2>Effective supports</h2>
                <p>Team-reviewed strategies available across activities.</p>
              </div>
              <button
                aria-label="Edit effective supports"
                className="icon-button"
                onClick={openEdit}
                type="button"
              >
                <Pencil size={16} />
              </button>
            </div>
            <ul className="support-list">
              {student.effectiveSupports.length ? (
                student.effectiveSupports.map((support) => (
                  <li key={support}>
                    <Check size={17} />
                    <span>{support}</span>
                  </li>
                ))
              ) : (
                <li>
                  <span>No effective supports documented yet.</span>
                </li>
              )}
            </ul>
          </section>
        </div>

        <aside className="profile-aside">
          <section
            className="personalization-card card"
            hidden={activeSection !== "overview"}
          >
            <div>
              <SlidersHorizontal size={20} />
              <span>Automatic personalization</span>
            </div>
            <h3>{student.firstName}&apos;s interface is profile-driven</h3>
            <p>
              Student Space will use {student.gridColumns} columns,{" "}
              {representationLabel(student.representation).toLowerCase()},{" "}
              {student.instructionMode.replaceAll("-", " ")} instructions, and{" "}
              {student.predictionsEnabled ? "context suggestions" : "no prediction strip"}.
            </p>
            <Link
              className="button button-primary"
              href={`/student?student=${student.id}`}
              onClick={() => setActiveStudent(student.id)}
            >
              Open personalized space
            </Link>
            <button className="button button-ghost" onClick={openEdit} type="button">
              Adjust preferences
            </button>
          </section>

          <section
            className="passport-preview card"
            hidden={activeSection !== "overview"}
          >
            <div className="passport-heading">
              <span>
                <FileText size={16} /> Communication Passport
              </span>
              <button onClick={() => setPassportOpen(true)} type="button">
                Open
              </button>
            </div>
            <h3>How to communicate with {student.firstName}</h3>
            <ul>
              {student.effectiveSupports.slice(0, 4).map((support) => (
                <li key={support}>{support}.</li>
              ))}
            </ul>
          </section>

          <section
            className="profile-section card"
            hidden={
              activeSection !== "overview" && activeSection !== "interests"
            }
            id="interests"
          >
            <h3>Interests</h3>
            <div className="profile-interest-chips">
              {student.interests.length ? (
                student.interests.map((interest) => (
                  <span key={interest}>{interest}</span>
                ))
              ) : (
                <p className="muted small">Not yet documented</p>
              )}
            </div>
          </section>

          <section
            className="emergency-card card"
            hidden={
              activeSection !== "overview" && activeSection !== "emergency"
            }
            id="emergency"
          >
            <span>
              <ShieldAlert size={17} /> Always available
            </span>
            <strong>Emergency communication</strong>
            <p>{student.emergencyMessages.join(" · ")}</p>
          </section>
        </aside>
      </div>

      <Modal
        description="All preferences update the learner-facing interface without AI."
        onClose={() => setEditOpen(false)}
        open={editOpen}
        size="large"
        title={`Edit ${student.firstName}'s profile`}
      >
        {draft ? (
          <div className="form-grid profile-edit-form">
            <div className="field">
              <label htmlFor="edit-name">Student alias</label>
              <input
                className="input"
                id="edit-name"
                onChange={(event) =>
                  setDraft({ ...draft, firstName: event.target.value })
                }
                value={draft.firstName}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-language">Home language</label>
              <input
                className="input"
                id="edit-language"
                onChange={(event) =>
                  setDraft({ ...draft, homeLanguage: event.target.value })
                }
                value={draft.homeLanguage}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-representation">Representation</label>
              <select
                className="select"
                id="edit-representation"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    representation: event.target.value as RepresentationMode,
                    communicationMode: representationLabel(
                      event.target.value as RepresentationMode,
                    ),
                  })
                }
                value={draft.representation}
              >
                <option value="symbols-text">Symbols with text</option>
                <option value="symbols-only">Symbols without text</option>
                <option value="photos-text">Photos with text</option>
                <option value="photos-only">Photos without text</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="edit-speech-output">Voice output</label>
              <select
                className="select"
                id="edit-speech-output"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    speechEnabled: event.target.value === "enabled",
                  })
                }
                value={draft.speechEnabled ? "enabled" : "disabled"}
              >
                <option value="enabled">Voice on</option>
                <option value="disabled">Voice off</option>
              </select>
              <p className="field-hint">
                Controls Speak and Read aloud independently from the visual mode.
              </p>
            </div>
            <div className="field">
              <label htmlFor="edit-columns">Grid columns</label>
              <select
                className="select"
                id="edit-columns"
                onChange={(event) => {
                  const gridColumns = Number(event.target.value) as 2 | 3 | 4 | 5;
                  setDraft({
                    ...draft,
                    gridColumns,
                    grid: `${gridColumns} × ${draft.gridRows}`,
                  });
                }}
                value={draft.gridColumns}
              >
                {[2, 3, 4, 5].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="edit-rows">Grid rows</label>
              <select
                className="select"
                id="edit-rows"
                onChange={(event) => {
                  const gridRows = Number(event.target.value) as 3 | 4 | 5;
                  setDraft({
                    ...draft,
                    gridRows,
                    grid: `${draft.gridColumns} × ${gridRows}`,
                  });
                }}
                value={draft.gridRows}
              >
                {[3, 4, 5].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="edit-cell">Cell size</label>
              <select
                className="select"
                id="edit-cell"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    cellScale: event.target.value as StudentProfile["cellScale"],
                  })
                }
                value={draft.cellScale}
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="edit-text">Text size</label>
              <select
                className="select"
                id="edit-text"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    textScale: event.target.value as StudentProfile["textScale"],
                  })
                }
                value={draft.textScale}
              >
                <option value="standard">Standard</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="edit-wait">Processing time (seconds)</label>
              <input
                className="input"
                id="edit-wait"
                max={30}
                min={0}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    processingTime: Number(event.target.value),
                  })
                }
                type="number"
                value={draft.processingTime}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-rate">Speech rate</label>
              <input
                id="edit-rate"
                max={1.4}
                min={0.6}
                onChange={(event) =>
                  setDraft({ ...draft, speechRate: Number(event.target.value) })
                }
                step={0.05}
                type="range"
                value={draft.speechRate}
              />
              <p className="field-hint">{draft.speechRate.toFixed(2)}×</p>
            </div>
            <div className="field">
              <label htmlFor="edit-voice">Speech voice</label>
              <select
                className="select"
                id="edit-voice"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    speechVoice: event.target
                      .value as StudentProfile["speechVoice"],
                  })
                }
                value={draft.speechVoice}
              >
                <option value="system">Instant device voice</option>
              </select>
              <p className="field-hint">
                Uses the operating-system voice immediately. No model or audio
                file is downloaded.
              </p>
            </div>
            <div className="field">
              <label htmlFor="edit-instructions">Instruction display</label>
              <select
                className="select"
                id="edit-instructions"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    instructionMode: event.target
                      .value as StudentProfile["instructionMode"],
                  })
                }
                value={draft.instructionMode}
              >
                <option value="one-step">One step at a time</option>
                <option value="short-sequence">Short sequence</option>
                <option value="full-sequence">Full sequence</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="edit-yes">How they communicate yes</label>
              <input
                className="input"
                id="edit-yes"
                onChange={(event) =>
                  setDraft({ ...draft, yesMethod: event.target.value })
                }
                value={draft.yesMethod}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-no">How they communicate no</label>
              <input
                className="input"
                id="edit-no"
                onChange={(event) =>
                  setDraft({ ...draft, noMethod: event.target.value })
                }
                value={draft.noMethod}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-help">How they ask for help</label>
              <input
                className="input"
                id="edit-help"
                onChange={(event) =>
                  setDraft({ ...draft, helpMethod: event.target.value })
                }
                value={draft.helpMethod}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-finish">How they finish</label>
              <input
                className="input"
                id="edit-finish"
                onChange={(event) =>
                  setDraft({ ...draft, finishMethod: event.target.value })
                }
                value={draft.finishMethod}
              />
            </div>
            <div className="field full">
              <label htmlFor="edit-interests">Interests</label>
              <input
                className="input"
                id="edit-interests"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    interests: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                value={draft.interests.join(", ")}
              />
            </div>
            <div className="field full">
              <label htmlFor="edit-sensory">Sensory and access notes</label>
              <textarea
                className="textarea"
                id="edit-sensory"
                onChange={(event) =>
                  setDraft({ ...draft, sensoryNotes: event.target.value })
                }
                value={draft.sensoryNotes}
              />
            </div>
            <div className="field full">
              <label htmlFor="edit-supports">
                Effective supports, one per line
              </label>
              <textarea
                className="textarea"
                id="edit-supports"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    effectiveSupports: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                value={draft.effectiveSupports.join("\n")}
              />
            </div>
            <div className="field full">
              <label htmlFor="edit-emergency">
                Always-available messages, one per line
              </label>
              <textarea
                className="textarea"
                id="edit-emergency"
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    emergencyMessages: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                value={draft.emergencyMessages.join("\n")}
              />
            </div>
            {representationUsesPhotos(draft.representation) ? (
              <div className="field full familiar-photo-editor">
                <label htmlFor="edit-photo-word">Familiar object photos</label>
                <p className="field-hint">
                  Add team-approved familiar photos. They override Ariadne&apos;s
                  curated educational photo for that word.
                </p>
                <div>
                  <input
                    className="input"
                    id="edit-photo-word"
                    onChange={(event) => setPhotoWord(event.target.value)}
                    placeholder="Word, for example backpack"
                    value={photoWord}
                  />
                  <label className="button button-secondary photo-upload">
                    Choose photo
                    <input
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        const word = photoWord.trim().toLowerCase();
                        if (!file || !word) {
                          showToast("Add the word before choosing a photo.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result !== "string") return;
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  customPhotos: {
                                    ...current.customPhotos,
                                    [word]: reader.result as string,
                                  },
                                }
                              : current,
                          );
                          setPhotoWord("");
                          showToast(`Familiar photo added for ${word}.`);
                        };
                        reader.readAsDataURL(file);
                      }}
                      type="file"
                    />
                  </label>
                </div>
                <div className="familiar-photo-list">
                  {Object.keys(draft.customPhotos).map((word) => (
                    <span key={word}>
                      {word}
                      <button
                        aria-label={`Remove familiar photo for ${word}`}
                        onClick={() =>
                          setDraft((current) => {
                            if (!current) return current;
                            const customPhotos = { ...current.customPhotos };
                            delete customPhotos[word];
                            return { ...current, customPhotos };
                          })
                        }
                        type="button"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <label className="profile-toggle">
              <input
                checked={draft.predictionsEnabled}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    predictionsEnabled: event.target.checked,
                  })
                }
                type="checkbox"
              />
              Show context suggestions
            </label>
            <label className="profile-toggle">
              <input
                checked={draft.highContrast}
                onChange={(event) =>
                  setDraft({ ...draft, highContrast: event.target.checked })
                }
                type="checkbox"
              />
              High contrast
            </label>
            <label className="profile-toggle">
              <input
                checked={draft.reduceMotion}
                onChange={(event) =>
                  setDraft({ ...draft, reduceMotion: event.target.checked })
                }
                type="checkbox"
              />
              Reduce motion
            </label>
          </div>
        ) : null}
        <div className="modal-actions">
          <button
            className="button button-danger-soft"
            onClick={() => setConfirmDelete(true)}
            type="button"
          >
            Delete profile
          </button>
          <button
            className="button button-secondary"
            onClick={() => setEditOpen(false)}
            type="button"
          >
            Cancel
          </button>
          <button className="button button-primary" onClick={saveProfile} type="button">
            Save changes
          </button>
        </div>
      </Modal>

      <Modal
        description="A concise, printable summary for communication partners."
        onClose={() => setPassportOpen(false)}
        open={passportOpen}
        title={`${student.firstName}'s communication passport`}
      >
        <pre className="passport-document">{passportText(student)}</pre>
        <div className="modal-actions">
          <button
            className="button button-secondary"
            onClick={() => window.print()}
            type="button"
          >
            Print
          </button>
          <button
            className="button button-primary"
            onClick={() =>
              downloadText(
                `${student.firstName.toLowerCase()}-communication-passport.txt`,
                passportText(student),
              )
            }
            type="button"
          >
            <FileDown size={16} /> Download
          </button>
        </div>
      </Modal>

      <Modal
        description="This permanently removes the learner profile from the synchronized workspace."
        onClose={() => setConfirmDelete(false)}
        open={confirmDelete}
        size="small"
        title={`Delete ${student.firstName}'s profile?`}
      >
        <p>This action cannot be undone.</p>
        <div className="modal-actions">
          <button
            className="button button-secondary"
            onClick={() => setConfirmDelete(false)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="button button-danger-soft"
            onClick={() => {
              deleteStudent(student.id);
              router.push("/workspace/students");
              showToast("Student profile deleted.");
            }}
            type="button"
          >
            Delete profile
          </button>
        </div>
      </Modal>
    </div>
  );
}
