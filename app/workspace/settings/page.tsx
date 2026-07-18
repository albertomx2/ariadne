"use client";

import {
  Building2,
  KeyRound,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { createId, useAriadne } from "@/lib/ariadne-store";

const cards = [
  ["school", Building2, "School workspace"],
  ["members", Users, "Educator access"],
  ["student-access", KeyRound, "Student access"],
  ["privacy", ShieldCheck, "Privacy and retention"],
] as const;

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    resetDemo,
    showToast,
    syncMode,
    accountEmail,
  } = useAriadne();
  const [active, setActive] = useState<string | null>(null);
  const [memberDraft, setMemberDraft] = useState({
    name: "",
    email: "",
    role: "Teacher",
  });

  const detail = {
    school: `${settings.schoolName} · ${settings.className}`,
    members: `${settings.members.length} invited members · Role-based access`,
    "student-access": "Class code and learner-specific space selection",
    privacy: `${settings.retentionDays}-day retention · ${
      syncMode === "supabase" ? "Encrypted account sync" : "Sign-in required"
    }`,
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="Workspace administration"
        title="Settings"
        description="Identity, access, privacy, and classroom configuration."
      />
      <div className="card" style={{ overflow: "hidden" }}>
        {cards.map(([id, Icon, title]) => (
          <article
            key={id}
            style={{
              display: "grid",
              gridTemplateColumns: "42px 1fr auto",
              alignItems: "center",
              gap: 12,
              padding: 18,
              borderBottom: "1px solid var(--line)",
            }}
          >
            <span className="profile-section-icon teal">
              <Icon size={19} />
            </span>
            <div>
              <strong style={{ display: "block", fontSize: 13 }}>{title}</strong>
              <span className="muted small">{detail[id]}</span>
            </div>
            <button
              className="button button-secondary"
              onClick={() => setActive(id)}
              type="button"
            >
              Manage
            </button>
          </article>
        ))}
      </div>
      <div
        className="card card-padding"
        style={{ marginTop: 16, borderColor: "#ecd0c8" }}
      >
        <p className="eyebrow" style={{ color: "var(--coral)" }}>
          Security boundary
        </p>
        <h2 style={{ margin: 0, fontSize: 18 }}>Ariadne account security</h2>
        <p className="muted small">
          Educators use an Ariadne email-and-password account. Workspace data is
          isolated by organization membership and synchronized through database
          row-level security. Google Workspace and Microsoft Entra are not
          enabled yet.
        </p>
        <span className="status-pill status-ready" style={{ marginTop: 8 }}>
          <LockKeyhole size={12} />{" "}
          {syncMode === "supabase"
            ? `Synced as ${accountEmail ?? "educator"}`
            : "Connecting account"}
        </span>
      </div>

      <Modal
        onClose={() => setActive(null)}
        open={active === "school"}
        title="School workspace"
      >
        <div className="form-grid">
          <div className="field full">
            <label htmlFor="settings-school">School name</label>
            <input
              className="input"
              id="settings-school"
              onChange={(event) =>
                updateSettings({ schoolName: event.target.value })
              }
              value={settings.schoolName}
            />
          </div>
          <div className="field">
            <label htmlFor="settings-class">Classroom</label>
            <input
              className="input"
              id="settings-class"
              onChange={(event) =>
                updateSettings({ className: event.target.value })
              }
              value={settings.className}
            />
          </div>
          <div className="field">
            <label htmlFor="settings-grade">Grade</label>
            <input
              className="input"
              id="settings-grade"
              onChange={(event) => updateSettings({ grade: event.target.value })}
              value={settings.grade}
            />
          </div>
          <div className="field full">
            <label htmlFor="settings-educator">Primary educator</label>
            <input
              className="input"
              id="settings-educator"
              onChange={(event) =>
                updateSettings({ educatorName: event.target.value })
              }
              value={settings.educatorName}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button
            className="button button-primary"
            onClick={() => {
              setActive(null);
              showToast("Workspace settings saved.");
            }}
            type="button"
          >
            Save workspace
          </button>
        </div>
      </Modal>

      <Modal
        description="Fictional team members with classroom-scoped roles."
        onClose={() => setActive(null)}
        open={active === "members"}
        title="Educator access"
      >
        <div className="settings-member-list">
          {settings.members.map((member) => (
            <article key={member.id}>
              <div>
                <strong>{member.name}</strong>
                <span>
                  {member.email} · {member.role}
                </span>
              </div>
              <button
                aria-label={`Remove ${member.name}`}
                onClick={() =>
                  updateSettings({
                    members: settings.members.filter(
                      (item) => item.id !== member.id,
                    ),
                  })
                }
                type="button"
              >
                <Trash2 size={16} />
              </button>
            </article>
          ))}
        </div>
        <div className="form-grid" style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="member-name">Name</label>
            <input
              className="input"
              id="member-name"
              onChange={(event) =>
                setMemberDraft({ ...memberDraft, name: event.target.value })
              }
              value={memberDraft.name}
            />
          </div>
          <div className="field">
            <label htmlFor="member-email">School email</label>
            <input
              className="input"
              id="member-email"
              onChange={(event) =>
                setMemberDraft({ ...memberDraft, email: event.target.value })
              }
              value={memberDraft.email}
            />
          </div>
          <div className="field full">
            <label htmlFor="member-role">Role</label>
            <select
              className="select"
              id="member-role"
              onChange={(event) =>
                setMemberDraft({ ...memberDraft, role: event.target.value })
              }
              value={memberDraft.role}
            >
              <option>Teacher</option>
              <option>Speech-language pathologist</option>
              <option>Special education teacher</option>
              <option>Read-only support staff</option>
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button
            className="button button-primary"
            onClick={() => {
              if (!memberDraft.name || !memberDraft.email) {
                showToast("Add a name and school email.");
                return;
              }
              updateSettings({
                members: [
                  ...settings.members,
                  { ...memberDraft, id: createId("member") },
                ],
              });
              setMemberDraft({ name: "", email: "", role: "Teacher" });
              showToast("Team member saved to the workspace directory.");
            }}
            type="button"
          >
            <Plus size={16} /> Add team member
          </button>
        </div>
      </Modal>

      <Modal
        onClose={() => setActive(null)}
        open={active === "student-access"}
        title="Student access"
      >
        <div className="field">
          <label htmlFor="settings-code">Class code</label>
          <input
            className="input"
            id="settings-code"
            maxLength={6}
            onChange={(event) =>
              updateSettings({
                classCode: event.target.value.replace(/\D/g, ""),
              })
            }
            value={settings.classCode}
          />
        </div>
        <p className="muted small">
          After entering this code, the learner chooses from the student
          profiles in this workspace. Email, QR, and simulated PIN access are
          not used.
        </p>
        <div className="modal-actions">
          <button
            className="button button-secondary"
            onClick={() =>
              updateSettings({
                classCode: String(Math.floor(100000 + Math.random() * 900000)),
              })
            }
            type="button"
          >
            Generate new code
          </button>
          <button
            className="button button-primary"
            onClick={() => {
              setActive(null);
              showToast("Student access settings saved.");
            }}
            type="button"
          >
            Save access
          </button>
        </div>
      </Modal>

      <Modal
        onClose={() => setActive(null)}
        open={active === "privacy"}
        title="Privacy and retention"
      >
        <div className="field">
          <label htmlFor="retention-days">Workspace retention period</label>
          <select
            className="select"
            id="retention-days"
            onChange={(event) =>
              updateSettings({ retentionDays: Number(event.target.value) })
            }
            value={settings.retentionDays}
          >
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={365}>1 year</option>
          </select>
        </div>
        <div className="insight-principle" style={{ marginTop: 16 }}>
          <ShieldCheck size={18} />
          <p>
            {syncMode === "supabase"
              ? "This workspace is synchronized across signed-in devices. Database policies limit every read and write to authorized organization members."
              : "Sign in with an Ariadne account before changing workspace data."}{" "}
            AI workflows send only the profile fields selected for that draft
            to the configured provider. Do not enter medical records or
            unrelated personally identifiable information.
          </p>
        </div>
        <div className="modal-actions">
          <button
            className="button button-danger-soft"
            onClick={() => {
              resetDemo();
              setActive(null);
              showToast("Workspace data cleared.");
            }}
            type="button"
          >
            Clear workspace data
          </button>
          <button
            className="button button-primary"
            onClick={() => {
              setActive(null);
              showToast("Retention settings saved.");
            }}
            type="button"
          >
            Save privacy settings
          </button>
        </div>
      </Modal>
    </div>
  );
}
