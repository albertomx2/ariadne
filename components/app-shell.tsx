"use client";

import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  Files,
  LayoutDashboard,
  Menu,
  PlusCircle,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAriadne } from "@/lib/ariadne-store";
import { Brand } from "./brand";

const navigation = [
  { href: "/workspace", label: "Dashboard", icon: LayoutDashboard },
  { href: "/workspace/students", label: "Students", icon: Users },
  { href: "/workspace/create", label: "Create", icon: PlusCircle },
  { href: "/workspace/materials", label: "Materials", icon: Files },
  { href: "/workspace/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/workspace/insights", label: "Insights", icon: BarChart3 },
  { href: "/workspace/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const {
    settings,
    notificationsRead,
    markNotificationsRead,
    signOut,
    showToast,
    syncMode,
    accountEmail,
    hydrated,
    session,
  } = useAriadne();
  const initials = settings.educatorName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      if (session?.kind !== "educator" || syncMode !== "supabase") {
        router.replace("/sign-in");
      }
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [hydrated, router, session, syncMode]);

  if (!hydrated || session?.kind !== "educator" || syncMode !== "supabase") {
    return (
      <main className="auth-loading" aria-live="polite">
        <Brand href="/sign-in" />
        <p>Checking your Ariadne account…</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      {mobileOpen ? (
        <button
          aria-label="Close navigation"
          className="mobile-nav-backdrop"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      ) : null}
      <aside
        className={`sidebar${mobileOpen ? " mobile-open" : ""}`}
        aria-label="Teacher workspace navigation"
      >
        <Brand />

        <button
          aria-expanded={schoolOpen}
          className="sidebar-school"
          onClick={() => setSchoolOpen((open) => !open)}
          type="button"
        >
          <span>
            <strong>{settings.schoolName}</strong>
            <span>
              {settings.className} · {settings.grade}
            </span>
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {schoolOpen ? (
          <div className="sidebar-school-menu">
            <strong>Current workspace</strong>
            <span>{settings.schoolName}</span>
            <Link href="/workspace/settings" onClick={() => setSchoolOpen(false)}>
              Manage workspace
            </Link>
          </div>
        ) : null}

        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/workspace"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <Link
                className={`sidebar-link${active ? " active" : ""}`}
                href={item.href}
                key={item.href}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={19} strokeWidth={2} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-note">
          <strong>
            <Sparkles size={15} aria-hidden="true" /> Learner access
          </strong>
          <p>Select a learner before opening their personalized space.</p>
          <Link className="button button-secondary small" href="/workspace/students">
            Choose a learner
          </Link>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobileOpen(true)}
              type="button"
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <span className="mobile-brand">
              <Brand showWord={false} />
            </span>
            <span className="topbar-context">
              Teacher Workspace&nbsp; / &nbsp;{settings.className}
            </span>
          </div>

          <div className="topbar-right">
            <Link className="button button-secondary" href="/workspace/students">
              Open student space
            </Link>
            <button
              aria-expanded={notificationsOpen}
              className={`icon-button notification-button${
                notificationsRead ? "" : " has-unread"
              }`}
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setAccountOpen(false);
              }}
              type="button"
              aria-label="Notifications"
            >
              <Bell size={19} />
            </button>
            <button
              aria-expanded={accountOpen}
              aria-label={`${settings.educatorName} account`}
              className="user-avatar"
              onClick={() => {
                setAccountOpen((open) => !open);
                setNotificationsOpen(false);
              }}
              type="button"
            >
              {initials}
            </button>
            {notificationsOpen ? (
              <section className="topbar-popover notifications-popover">
                <header>
                  <strong>Notifications</strong>
                  <button
                    onClick={() => {
                      markNotificationsRead(true);
                      showToast("All notifications marked as read.");
                    }}
                    type="button"
                  >
                    Mark all read
                  </button>
                </header>
                <Link
                  href="/workspace/schedule"
                  onClick={() => setNotificationsOpen(false)}
                >
                  <span className="notification-dot coral" />
                  <div>
                    <strong>Schedule change needs support</strong>
                    <small>Indoor recess · 1:20 PM</small>
                  </div>
                </Link>
                <Link
                  href="/workspace/materials"
                  onClick={() => setNotificationsOpen(false)}
                >
                  <span className="notification-dot amber" />
                  <div>
                    <strong>Two materials need review</strong>
                    <small>Before the science activity</small>
                  </div>
                </Link>
              </section>
            ) : null}
            {accountOpen ? (
              <section className="topbar-popover account-popover">
                <strong>{settings.educatorName}</strong>
                <span>
                  {accountEmail ?? settings.schoolName}
                </span>
                <Link
                  href="/workspace/settings"
                  onClick={() => setAccountOpen(false)}
                >
                  Account settings
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    router.push("/sign-in");
                  }}
                  type="button"
                >
                  Sign out
                </button>
              </section>
            ) : null}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
