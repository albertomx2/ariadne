"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ClipboardList,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/modal";
import {
  emptyProfileDraft,
  type AiChatMessage,
  type ProfileAssistantResponse,
  type ProfileDraft,
} from "@/lib/ai-contracts";
import {
  createId,
  representationLabel,
  representationUsesPhotos,
  type RepresentationMode,
  type StudentProfile,
  useAriadne,
} from "@/lib/ariadne-store";
import "./new-profile.css";

function representationMode(value: string): RepresentationMode {
  const normalized = value.toLowerCase();
  if (normalized.includes("photo") || normalized.includes("picture")) {
    return /without text|no text|photo only/.test(normalized)
      ? "photos-only"
      : "photos-text";
  }
  return /without text|no text|symbol only/.test(normalized)
    ? "symbols-only"
    : "symbols-text";
}

function documented(value: string | string[]) {
  return Array.isArray(value)
    ? value.length
      ? value.join(", ")
      : "Not yet documented"
    : value || "Not yet documented";
}

export default function NewStudentPage() {
  const [method, setMethod] = useState<"conversation" | "form">("conversation");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [profileDraft, setProfileDraft] =
    useState<ProfileDraft>(emptyProfileDraft);
  const [assistantState, setAssistantState] = useState<
    "checking" | "ready" | "working" | "offline"
  >("checking");
  const [completeEnough, setCompleteEnough] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [alias, setAlias] = useState("");
  const [grade, setGrade] = useState("Grade 3");
  const [communication, setCommunication] = useState("");
  const [representation, setRepresentation] =
    useState<RepresentationMode>("symbols-text");
  const [homeLanguage, setHomeLanguage] = useState("English");
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const { addStudent, showToast } = useAriadne();

  useEffect(() => {
    void fetch("/api/ai/health", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Local model unavailable");
        return response.json() as Promise<{ ready: boolean }>;
      })
      .then((result) => setAssistantState(result.ready ? "ready" : "offline"))
      .catch(() => setAssistantState("offline"));
  }, []);

  useEffect(() => {
    const body = chatBodyRef.current;
    if (!body) return;
    body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
  }, [assistantState, messages]);

  async function sendMessage() {
    const content = message.trim();
    if (!content || assistantState === "working") return;
    const nextMessages: AiChatMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    setMessage("");
    setAssistantState("working");
    try {
      const response = await fetch("/api/ai/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          draft: profileDraft,
        }),
      });
      const result = (await response.json()) as
        | ProfileAssistantResponse
        | { error: string };
      if (!response.ok || !("draft" in result)) {
        throw new Error("error" in result ? result.error : "AI unavailable");
      }
      setProfileDraft(result.draft);
      setAlias(result.draft.alias);
      if (result.draft.homeLanguage) {
        setHomeLanguage(result.draft.homeLanguage);
      }
      if (result.draft.representation) {
        setRepresentation(representationMode(result.draft.representation));
      }
      setCompleteEnough(result.completeEnoughToReview);
      setMessages([
        ...nextMessages,
        { role: "assistant", content: result.reply },
      ]);
      setAssistantState("ready");
    } catch {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            "I could not reach the private local model. Your message is still here; please try again in a moment.",
        },
      ]);
      setAssistantState("offline");
    }
  }

  function createStudent() {
    const firstName = (alias || profileDraft.alias).trim();
    if (!firstName) {
      showToast("Add a student alias before creating the profile.");
      return;
    }
    const id = createId("student");
    const mode =
      method === "conversation"
        ? representationMode(profileDraft.representation)
        : representation;
    const gridColumns = representationUsesPhotos(mode) ? 3 : 4;
    const student: StudentProfile = {
      id,
      firstName,
      initials: firstName
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      color: "#d7a477",
      communicationMode: representationLabel(mode),
      prioritySupport:
        profileDraft.effectiveSupports[0] ?? "Profile review needed",
      grid: `${gridColumns} × 3`,
      processingTime:
        Number(profileDraft.waitTime.match(/\d+/)?.[0]) || 8,
      currentActivity: "New profile",
      symbolProvider: representationUsesPhotos(mode) ? "custom" : "arasaac",
      grade,
      classGroup: "Room 14",
      homeLanguage:
        method === "conversation"
          ? profileDraft.homeLanguage || "Not yet documented"
          : homeLanguage,
      representation: mode,
      gridColumns,
      gridRows: 3,
      cellScale: representationUsesPhotos(mode) ? "large" : "comfortable",
      textScale: "large",
      speechEnabled,
      speechRate: 0.9,
      speechVoice: "system",
      predictionsEnabled: true,
      reduceMotion: true,
      highContrast: false,
      instructionMode: profileDraft.instructionMode
        .toLowerCase()
        .includes("short")
        ? "short-sequence"
        : "one-step",
      interests: profileDraft.interests,
      sensoryNotes: profileDraft.sensoryNotes || "Not yet documented",
      yesMethod: profileDraft.yesMethod || "Not yet documented",
      noMethod: profileDraft.noMethod || "Not yet documented",
      helpMethod: profileDraft.helpMethod || "Not yet documented",
      finishMethod: profileDraft.finishMethod || "Not yet documented",
      effectiveSupports: profileDraft.effectiveSupports,
      profileNotes:
        method === "conversation"
          ? [
              `Communication: ${documented(profileDraft.communicationModes)}.`,
              `Receptive language: ${documented(profileDraft.receptiveLanguage)}.`,
              `Access: ${documented(profileDraft.accessMethod)}.`,
              profileDraft.observedPatterns.length
                ? `Observed patterns: ${profileDraft.observedPatterns.join("; ")}.`
                : "",
              profileDraft.supportConsiderations.length
                ? `Ideas pending team review: ${profileDraft.supportConsiderations.join("; ")}.`
                : "",
            ]
              .filter(Boolean)
              .join(" ")
          : communication || "Profile started manually.",
      emergencyMessages:
        profileDraft.emergencyMessages.length > 0
          ? profileDraft.emergencyMessages
          : [
              "I need help",
              "I need a break",
              "I need the bathroom",
              "I am in pain",
              "Stop",
              "No",
              "Yes",
              "I need my teacher",
            ],
      customPhotos: {},
      boardCategories: [],
      boardItems: [],
    };
    addStudent(student);
    showToast(`${firstName}'s profile was created.`);
    router.push(`/workspace/students/${id}`);
  }

  const draftSections: Array<[string, string]> = [
    ["Student alias", documented(profileDraft.alias)],
    ["Communication now", documented(profileDraft.communicationModes)],
    ["Yes / agreement", documented(profileDraft.yesMethod)],
    ["No / rejection", documented(profileDraft.noMethod)],
    ["Help", documented(profileDraft.helpMethod)],
    ["Break", documented(profileDraft.breakMethod)],
    ["Understanding", documented(profileDraft.receptiveLanguage)],
    ["Representation", documented(profileDraft.representation)],
    ["Access method", documented(profileDraft.accessMethod)],
    ["Supports that work", documented(profileDraft.effectiveSupports)],
    ["Observed patterns", documented(profileDraft.observedPatterns)],
    [
      "Ideas to review — not facts",
      documented(profileDraft.supportConsiderations),
    ],
    ["Interests", documented(profileDraft.interests)],
  ];
  const documentedCount = draftSections.filter(
    ([, value]) => value !== "Not yet documented",
  ).length;

  return (
    <div className="page new-profile-page">
      <div className="new-profile-compact-header">
        <Link className="back-link" href="/workspace/students">
          <ArrowLeft size={15} /> Students
        </Link>
        <span>New functional profile</span>
        <strong>Add a student</strong>
      </div>

      <div className="profile-methods" role="tablist" aria-label="Profile method">
        <button
          className={method === "conversation" ? "active" : ""}
          onClick={() => setMethod("conversation")}
          role="tab"
          type="button"
        >
          <MessageCircle size={18} />
          Guided AI conversation
          <small>Natural interview</small>
        </button>
        <button
          className={method === "form" ? "active" : ""}
          onClick={() => setMethod("form")}
          role="tab"
          type="button"
        >
          <ClipboardList size={18} />
          Structured form
          <small>Fill it yourself</small>
        </button>
      </div>

      {method === "conversation" ? (
        <div className="profile-conversation-layout">
          <section className="profile-chat card">
            <header className="profile-chat-header">
              <span className="copilot-avatar">
                <Sparkles size={18} />
              </span>
              <div>
                <strong>Ariadne profile guide</strong>
                <span>AAC-informed functional profile interview</span>
              </div>
              <span
                className={`privacy-chip ${
                  assistantState === "offline" ? "offline" : ""
                }`}
              >
                <ShieldCheck size={13} />
                {assistantState === "offline"
                  ? "Local model unavailable"
                  : "Qwen 2.5 7B · local"}
              </span>
            </header>

            <div
              className="profile-chat-body"
              aria-live="polite"
              ref={chatBodyRef}
            >
              <div className="chat-message assistant">
                <span><Bot size={16} /></span>
                <div>
                  <p>
                    Tell me everything you already know about the student, or
                    simply ask me to guide you question by question.
                  </p>
                  <small>
                    Use an alias. Avoid records or details that are not needed
                    for classroom communication and access.
                  </small>
                </div>
              </div>

              {!messages.length ? (
                <div className="starter-prompts">
                  <button
                    onClick={() =>
                      setMessage(
                        "Please interview me naturally and build the profile one question at a time.",
                      )
                    }
                    type="button"
                  >
                    Interview me
                  </button>
                  <button
                    onClick={() =>
                      setMessage(
                        "The student's alias is Avery. They use gestures, a few spoken words, and familiar photos. They nod for yes, move an item away for no, point to an adult for help, enjoy music and trains, and benefit from one-step directions with ten seconds of wait time.",
                      )
                    }
                    type="button"
                  >
                    Give everything I know
                  </button>
                </div>
              ) : null}

              {messages.map((item, index) =>
                item.role === "user" ? (
                  <div className="chat-message educator" key={`${item.role}-${index}`}>
                    <p>{item.content}</p>
                  </div>
                ) : (
                  <div className="chat-message assistant" key={`${item.role}-${index}`}>
                    <span><Bot size={16} /></span>
                    <div><p>{item.content}</p></div>
                  </div>
                ),
              )}
              {assistantState === "working" ? (
                <div className="chat-message assistant typing">
                  <span><Bot size={16} /></span>
                  <div><i /><i /><i /><span className="sr-only">Ariadne is responding</span></div>
                </div>
              ) : null}
            </div>

            <form
              className="profile-chat-input"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage();
              }}
            >
              <label className="sr-only" htmlFor="profile-observation">
                Message Ariadne
              </label>
              <textarea
                id="profile-observation"
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Tell Ariadne what you know or answer its question…"
                value={message}
              />
              <button
                aria-label="Send message"
                className="button button-primary"
                disabled={!message.trim() || assistantState === "working"}
                type="submit"
              >
                <Send size={17} />
              </button>
            </form>
          </section>

          <aside className="profile-draft card">
            <header>
              <span><UserRoundPlus size={18} /> Live profile draft</span>
              <small>
                {completeEnough
                  ? "Core fields ready for educator review"
                  : `${documentedCount}/${draftSections.length} documented`}
              </small>
            </header>
            <div className="draft-identity">
              <span>Student alias</span>
              <input
                aria-label="Student alias"
                onChange={(event) => setAlias(event.target.value)}
                placeholder="Not documented yet"
                type="text"
                value={alias}
              />
            </div>
            <div className="draft-sections">
              {draftSections.map(([title, value]) => (
                <article key={title} title={`${title}: ${value}`}>
                  <span className={value !== "Not yet documented" ? "complete" : ""}>
                    {value !== "Not yet documented" ? <Check size={12} /> : "—"}
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <p>{value}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="draft-guardrail">
              <ShieldCheck size={17} />
              <p>
                AI organizes observations; a qualified educator verifies every
                field. It does not diagnose or determine AAC eligibility.
              </p>
            </div>
            <button
              className="button button-primary"
              disabled={!alias.trim() && !profileDraft.alias}
              onClick={() => setReviewOpen(true)}
              type="button"
            >
              Review full draft <ArrowRight size={16} />
            </button>
          </aside>
        </div>
      ) : (
        <section className="structured-profile card">
          <div className="structured-profile-intro">
            <span className="profile-section-icon teal"><ClipboardList size={20} /></span>
            <div>
              <h2>Functional communication profile</h2>
              <p>Complete only information needed for classroom access.</p>
            </div>
          </div>
          <div className="structured-form-grid">
            <div className="field">
              <label htmlFor="alias">Student alias</label>
              <input className="input" id="alias" onChange={(event) => setAlias(event.target.value)} value={alias} />
            </div>
            <div className="field">
              <label htmlFor="grade">Grade</label>
              <select className="select" id="grade" onChange={(event) => setGrade(event.target.value)} value={grade}>
                <option>Pre-K</option>
                <option>Kindergarten</option>
                <option>Grade 1</option>
                <option>Grade 2</option>
                <option>Grade 3</option>
                <option>Grade 4</option>
                <option>Grade 5</option>
              </select>
            </div>
            <div className="field full">
              <label htmlFor="communication">How do they communicate now?</label>
              <textarea className="textarea" id="communication" onChange={(event) => setCommunication(event.target.value)} value={communication} />
            </div>
            <div className="field">
              <label htmlFor="representation">Familiar representation</label>
              <select className="select" id="representation" onChange={(event) => setRepresentation(event.target.value as RepresentationMode)} value={representation}>
                <option value="symbols-text">Symbols with text</option>
                <option value="symbols-only">Symbols without text</option>
                <option value="photos-text">Photos with text</option>
                <option value="photos-only">Photos without text</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="speech-output">Voice output</label>
              <select
                className="select"
                id="speech-output"
                onChange={(event) =>
                  setSpeechEnabled(event.target.value === "enabled")
                }
                value={speechEnabled ? "enabled" : "disabled"}
              >
                <option value="enabled">Voice on</option>
                <option value="disabled">Voice off</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="language">Home language</label>
              <input className="input" id="language" onChange={(event) => setHomeLanguage(event.target.value)} value={homeLanguage} />
            </div>
          </div>
          <div className="structured-form-actions">
            <button className="button button-primary" onClick={() => setReviewOpen(true)} type="button">
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      <Modal
        description="Verify every functional field before creating the editable learner profile."
        onClose={() => setReviewOpen(false)}
        open={reviewOpen}
        size="large"
        title="Review student profile"
      >
        <div className="profile-review-summary">
          <div><span>Student alias</span><strong>{alias || profileDraft.alias || "Missing"}</strong></div>
          <div><span>Grade</span><strong>{grade}</strong></div>
          <div><span>Representation</span><strong>{method === "conversation" ? representationLabel(representationMode(profileDraft.representation)) : representationLabel(representation)}</strong></div>
          <div><span>Voice output</span><strong>{speechEnabled ? "On" : "Off"}</strong></div>
          <div>
            <span>Home language</span>
            <strong>
              {method === "conversation"
                ? profileDraft.homeLanguage || "Not yet documented"
                : homeLanguage}
            </strong>
          </div>
          <div className="full"><span>Communication</span><strong>{method === "conversation" ? documented(profileDraft.communicationModes) : communication || "Not yet documented"}</strong></div>
          <div className="full"><span>Yes / no / help</span><strong>{documented(profileDraft.yesMethod)} · {documented(profileDraft.noMethod)} · {documented(profileDraft.helpMethod)}</strong></div>
          <div className="full"><span>Effective supports</span><strong>{documented(profileDraft.effectiveSupports)}</strong></div>
          <div className="full"><span>Observed patterns</span><strong>{documented(profileDraft.observedPatterns)}</strong></div>
          <div className="full review-consideration"><span>AI ideas requiring team review</span><strong>{documented(profileDraft.supportConsiderations)}</strong></div>
        </div>
        <div className="draft-guardrail">
          <ShieldCheck size={17} />
          <p>Every field remains editable. Permanent AAC system decisions belong to the learner&apos;s qualified AAC/SLP team.</p>
        </div>
        <div className="modal-actions">
          <button className="button button-secondary" onClick={() => setReviewOpen(false)} type="button">Keep editing</button>
          <button className="button button-primary" onClick={createStudent} type="button">
            Create student profile <ArrowRight size={16} />
          </button>
        </div>
      </Modal>
    </div>
  );
}
