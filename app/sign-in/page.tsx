"use client";

import {
  ArrowRight,
  BadgeCheck,
  Building2,
  KeyRound,
  LockKeyhole,
  Mail,
  QrCode,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { Modal } from "@/components/modal";
import { useAriadne } from "@/lib/ariadne-store";
import "./sign-in.css";

export default function SignInPage() {
  const [mode, setMode] = useState<"educator" | "student">("educator");
  const [accountAction, setAccountAction] = useState<"sign-in" | "create">(
    "sign-in",
  );
  const [educatorName, setEducatorName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [classCode, setClassCode] = useState("");
  const [visualPin, setVisualPin] = useState("");
  const [authPending, setAuthPending] = useState(false);
  const [dialog, setDialog] = useState<
    null | "qr" | "pin" | "trusted" | "student-picker"
  >(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const {
    settings,
    students,
    signIn,
    setActiveStudent,
    showToast,
    accountAvailable,
    authenticateEducator,
  } = useAriadne();

  function enterStudent(studentId = "maya", provider = "class code") {
    const student = students.find((item) => item.id === studentId) ?? students[0];
    if (!student) return;
    setActiveStudent(student.id);
    signIn({ kind: "student", name: student.firstName, provider });
    router.push(`/student?student=${student.id}`);
  }

  function submitClassCode() {
    if (classCode.replace(/\s/g, "") !== settings.classCode) {
      setError(`Use the fictional demo code ${settings.classCode}.`);
      return;
    }
    setError("");
    setDialog("student-picker");
  }

  return (
    <main className="signin-page">
      <section className="signin-story" aria-labelledby="signin-heading">
        <div className="signin-story-inner">
          <Brand href="/sign-in" />
          <div className="signin-copy">
            <p className="signin-kicker">Inclusive classroom platform</p>
            <h1 id="signin-heading">A clear path to participation.</h1>
            <p>
              Turn everyday classroom activities into communication-ready,
              understandable, and accessible experiences.
            </p>
          </div>

          <div className="thread-visual" aria-hidden="true">
            <div className="thread-node thread-node-one">Plan</div>
            <div className="thread-line thread-line-one" />
            <div className="thread-node thread-node-two">Adapt</div>
            <div className="thread-line thread-line-two" />
            <div className="thread-node thread-node-three">Participate</div>
          </div>

          <div className="signin-trust">
            <span>
              <ShieldCheck size={18} /> Educator reviewed
            </span>
            <span>
              <LockKeyhole size={18} /> Privacy by design
            </span>
            <span>
              <BadgeCheck size={18} /> Learner autonomy
            </span>
          </div>
        </div>
      </section>

      <section className="signin-panel" aria-label="Sign in">
        <div className="signin-card">
          <div className="signin-tabs" role="tablist" aria-label="Access type">
            <button
              aria-selected={mode === "educator"}
              className={mode === "educator" ? "active" : ""}
              onClick={() => setMode("educator")}
              role="tab"
              type="button"
            >
              Educator
            </button>
            <button
              aria-selected={mode === "student"}
              className={mode === "student" ? "active" : ""}
              onClick={() => setMode("student")}
              role="tab"
              type="button"
            >
              Student space
            </button>
          </div>

          {mode === "educator" ? (
            <div className="signin-form">
              <div>
                <p className="eyebrow">Teacher workspace</p>
                <h2>
                  {accountAction === "sign-in"
                    ? "Welcome to Ariadne"
                    : "Create your workspace"}
                </h2>
                <p className="muted">
                  {accountAction === "sign-in"
                    ? "Sign in to keep your classroom synchronized across devices."
                    : "Create a free educator account for this hackathon demo."}
                </p>
              </div>

              <div
                className="account-action-tabs"
                role="tablist"
                aria-label="Educator account action"
              >
                <button
                  aria-selected={accountAction === "sign-in"}
                  className={accountAction === "sign-in" ? "active" : ""}
                  onClick={() => {
                    setAccountAction("sign-in");
                    setError("");
                  }}
                  role="tab"
                  type="button"
                >
                  Sign in
                </button>
                <button
                  aria-selected={accountAction === "create"}
                  className={accountAction === "create" ? "active" : ""}
                  onClick={() => {
                    setAccountAction("create");
                    setError("");
                  }}
                  role="tab"
                  type="button"
                >
                  Create account
                </button>
              </div>

              {accountAction === "create" ? (
                <div className="field">
                  <label htmlFor="educator-name">Your name</label>
                  <div className="input-with-icon">
                    <UserRound size={18} aria-hidden="true" />
                    <input
                      autoComplete="name"
                      id="educator-name"
                      name="name"
                      onChange={(event) => setEducatorName(event.target.value)}
                      placeholder="Jordan Rivera"
                      type="text"
                      value={educatorName}
                    />
                  </div>
                </div>
              ) : null}

              <div className="field">
                <label htmlFor="educator-email">School email</label>
                <div className="input-with-icon">
                  <Mail size={18} aria-hidden="true" />
                  <input
                    id="educator-email"
                    name="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@school.edu"
                    type="email"
                    value={email}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="educator-password">Password</label>
                <div className="input-with-icon">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <input
                    autoComplete={
                      accountAction === "create"
                        ? "new-password"
                        : "current-password"
                    }
                    id="educator-password"
                    minLength={8}
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    type="password"
                    value={password}
                  />
                </div>
              </div>

              <button
                className="button button-primary auth-submit"
                disabled={authPending}
                onClick={async () => {
                  if (
                    accountAction === "create" &&
                    educatorName.trim().length < 2
                  ) {
                    setError("Enter the educator name for this workspace.");
                    return;
                  }
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    setError("Enter a valid school email address.");
                    return;
                  }
                  if (password.length < 8) {
                    setError("Use a password with at least 8 characters.");
                    return;
                  }
                  setError("");
                  setAuthPending(true);
                  const result = await authenticateEducator(
                    accountAction,
                    email,
                    password,
                    accountAction === "create" ? educatorName.trim() : undefined,
                  );
                  setAuthPending(false);
                  if (result.error) {
                    setError(result.error);
                    return;
                  }
                  showToast(
                    accountAction === "create"
                      ? "Your synchronized workspace is ready."
                      : "Signed in successfully.",
                  );
                  router.push("/workspace");
                }}
                type="button"
              >
                {authPending
                  ? accountAction === "create"
                    ? "Creating account…"
                    : "Signing in…"
                  : accountAction === "create"
                    ? "Create synchronized workspace"
                    : "Sign in to workspace"}
                {!authPending ? <ArrowRight size={17} /> : null}
              </button>

              {error ? <p className="signin-error">{error}</p> : null}

              <Link
                className="demo-link"
                href="/workspace"
                onClick={() =>
                  signIn({
                    kind: "educator",
                    name: settings.educatorName,
                    provider: "fictional demo",
                  })
                }
              >
                Open the fictional demo workspace <ArrowRight size={15} />
              </Link>

              <p className="signin-legal">
                The same educator account works across devices. Google and
                Microsoft sign-in are intentionally not enabled yet.
                {!accountAvailable
                  ? " Remote accounts require the Supabase environment variables."
                  : ""}
              </p>
            </div>
          ) : (
            <div className="signin-form">
              <div>
                <p className="eyebrow">Student communication space</p>
                <h2>Enter your class code</h2>
                <p className="muted">
                  Students do not need an email address or password.
                </p>
              </div>

              <div className="student-code">
                <label htmlFor="class-code">Class code</label>
                <input
                  autoComplete="one-time-code"
                  id="class-code"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) =>
                    setClassCode(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="• • • • • •"
                  value={classCode}
                />
              </div>

              <button
                className="button button-primary auth-submit"
                onClick={submitClassCode}
                type="button"
              >
                Enter student space <ArrowRight size={17} />
              </button>

              {error ? <p className="signin-error">{error}</p> : null}

              <div className="access-options">
                <button onClick={() => setDialog("qr")} type="button">
                  <QrCode size={19} />
                  Scan QR code
                </button>
                <button onClick={() => setDialog("pin")} type="button">
                  <KeyRound size={19} />
                  Use visual PIN
                </button>
                <button onClick={() => setDialog("trusted")} type="button">
                  <Building2 size={19} />
                  Trusted device
                </button>
              </div>

              <p className="signin-legal">
                Access is limited to one learner space and expires
                automatically.
              </p>
            </div>
          )}
        </div>
      </section>

      <Modal
        description="Choose the learner space authorized by this fictional classroom code."
        onClose={() => setDialog(null)}
        open={dialog === "student-picker"}
        size="small"
        title="Choose student space"
      >
        <div className="trusted-student-list">
          {students.map((student) => (
            <button
              key={student.id}
              onClick={() => enterStudent(student.id, "class code")}
              type="button"
            >
              <span style={{ background: student.color }}>
                {student.initials}
              </span>
              <strong>{student.firstName}</strong>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        description="The QR encodes the fictional Room 14 access grant."
        onClose={() => setDialog(null)}
        open={dialog === "qr"}
        size="small"
        title="Scan classroom QR"
      >
        <div className="qr-demo" aria-label="Fictional QR code">
          {Array.from({ length: 81 }, (_, index) => (
            <i
              className={(index * 7 + index % 5) % 3 ? "" : "filled"}
              key={index}
            />
          ))}
        </div>
        <p className="muted small auth-centered">
          In production, a camera scan creates a short-lived learner-specific
          access grant.
        </p>
        <button
          className="button button-primary auth-full"
          onClick={() => enterStudent("maya", "QR code")}
          type="button"
        >
          Simulate successful scan
        </button>
      </Modal>

      <Modal
        description="Use the fictional four-digit visual PIN 1428."
        onClose={() => setDialog(null)}
        open={dialog === "pin"}
        size="small"
        title="Visual PIN"
      >
        <div className="field">
          <label htmlFor="visual-pin">Visual PIN</label>
          <input
            className="input visual-pin-input"
            id="visual-pin"
            inputMode="numeric"
            maxLength={4}
            onChange={(event) =>
              setVisualPin(event.target.value.replace(/\D/g, ""))
            }
            placeholder="••••"
            value={visualPin}
          />
        </div>
        <div className="modal-actions">
          <button
            className="button button-primary"
            onClick={() => {
              if (visualPin !== "1428") {
                showToast("The fictional visual PIN is 1428.");
                return;
              }
              enterStudent("maya", "visual PIN");
            }}
            type="button"
          >
            Continue
          </button>
        </div>
      </Modal>

      <Modal
        description="Choose the learner profile assigned to this fictional classroom device."
        onClose={() => setDialog(null)}
        open={dialog === "trusted"}
        size="small"
        title="Trusted classroom device"
      >
        <div className="trusted-student-list">
          {students.map((student) => (
            <button
              key={student.id}
              onClick={() => enterStudent(student.id, "trusted device")}
              type="button"
            >
              <span style={{ background: student.color }}>
                {student.initials}
              </span>
              <strong>{student.firstName}</strong>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      </Modal>
    </main>
  );
}
