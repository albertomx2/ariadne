"use client";

import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Sparkles,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { useAriadne } from "@/lib/ariadne-store";
import {
  formatTime,
  localDateKey,
  parseActivityStart,
  timingForActivity,
} from "@/lib/schedule";
import "./workspace.css";

export default function DashboardPage() {
  const {
    activities,
    materials,
    notificationsRead,
    markNotificationsRead,
    settings,
    showToast,
    students,
  } = useAriadne();
  const visibleMaterials = materials.filter((material) => !material.archived);
  const reviewCount = visibleMaterials.filter(
    (material) => material.status === "review",
  ).length;
  const today = localDateKey();
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const todayActivities = activities
    .filter((activity) => activity.date === today)
    .sort(
      (left, right) =>
        parseActivityStart(left).getTime() -
        parseActivityStart(right).getTime(),
    );
  const nextActivity =
    todayActivities.find((activity) => timingForActivity(activity) !== "finished") ??
    todayActivities.at(-1);
  const happeningNow = todayActivities.find(
    (activity) => timingForActivity(activity) === "now",
  );

  return (
    <div className="page">
      <PageHeader
        eyebrow={todayLabel}
        title={`Good morning, ${settings.educatorName.split(" ")[0]}`}
        description="Here’s what your classroom needs for a more accessible day."
      >
        <Link className="button button-primary" href="/workspace/create">
          <Sparkles size={17} /> Adapt an activity
        </Link>
      </PageHeader>

      <section className="dashboard-metrics" aria-label="Today at a glance">
        <article className="metric-card card">
          <span className="metric-icon teal">
            <CalendarClock size={21} />
          </span>
          <div>
            <span>Today&apos;s schedule</span>
            <strong>{todayActivities.length} activities</strong>
            <small>
              {happeningNow
                ? `${happeningNow.title} is happening now`
                : nextActivity
                  ? `Next at ${formatTime(nextActivity.time)}`
                : "No activities scheduled"}
            </small>
          </div>
        </article>
        <article className="metric-card card">
          <span className="metric-icon amber">
            <UsersRound size={21} />
          </span>
          <div>
            <span>Need preparation</span>
            <strong>{students.length} students</strong>
            <small>
              {
                todayActivities.filter(
                  (item) => item.status === "needs-supports",
                ).length
              }{" "}
              activity approaching
            </small>
          </div>
        </article>
        <article className="metric-card card">
          <span className="metric-icon indigo">
            <FileCheck2 size={21} />
          </span>
          <div>
            <span>Recent supports</span>
            <strong>{visibleMaterials.length} created</strong>
            <small>{reviewCount} awaiting review</small>
          </div>
        </article>
      </section>

      <section className="adapt-banner">
        <div className="adapt-banner-copy">
          <span className="adapt-icon">
            <Sparkles size={22} />
          </span>
          <div>
            <p className="eyebrow">Activity support builder</p>
            <h2>What are you planning?</h2>
            <p>
              Choose a classroom activity and Ariadne will apply each
              learner&apos;s reviewed preferences to an editable support
              package. Automated suggestions will be added later.
            </p>
          </div>
        </div>
        <Link className="button banner-button" href="/workspace/create">
          Start adapting <ArrowRight size={17} />
        </Link>
      </section>

      <div className="dashboard-columns">
        <section>
          <div className="section-heading">
            <h2>Upcoming activities</h2>
            <Link href="/workspace/schedule">View schedule</Link>
          </div>
          <div className="activity-list card">
            {todayActivities.map((activity) => {
              const timing = timingForActivity(activity);
              return (
              <article className={`activity-row ${timing}`} key={activity.id}>
                <time>{formatTime(activity.time)}</time>
                <div className="activity-details">
                  <strong>{activity.title}</strong>
                  <span>
                    {activity.students.join(", ")} · {activity.context}
                  </span>
                </div>
                {timing === "now" ? (
                  <span className="happening-now-badge">Happening now</span>
                ) : (
                <StatusPill status={activity.status} />
                )}
                {activity.status === "needs-supports" ? (
                  <Link
                    aria-label={`Prepare supports for ${activity.title}`}
                    className="icon-button"
                    href={`/workspace/create?activity=${encodeURIComponent(activity.id)}`}
                  >
                    <ArrowRight size={17} />
                  </Link>
                ) : (
                  <span className="activity-check" aria-label="Prepared">
                    <CheckCircle2 size={20} />
                  </span>
                )}
              </article>
              );
            })}
            {!todayActivities.length ? (
              <p className="empty-state">
                No classroom activities are scheduled for today.
              </p>
            ) : null}
          </div>
        </section>

        <aside>
          <div className="section-heading">
            <h2>Needs attention</h2>
            <button
              onClick={() => {
                markNotificationsRead(true);
                showToast("Attention items marked as seen.");
              }}
              type="button"
            >
              {notificationsRead ? "All seen" : "Mark all seen"}
            </button>
          </div>
          <div className={`attention-list${notificationsRead ? " read" : ""}`}>
            <article className="attention-card">
              <span className="attention-icon amber">
                <TriangleAlert size={18} />
              </span>
              <div>
                <strong>Schedule change not prepared</strong>
                <p>Recess moved indoors at 1:20 PM.</p>
                <Link href="/workspace/schedule">Prepare change support</Link>
              </div>
            </article>
            <article className="attention-card">
              <span className="attention-icon indigo">
                <Clock3 size={18} />
              </span>
              <div>
                <strong>Review due before 10:00 AM</strong>
                <p>Science Experiment Sequence has 2 draft supports.</p>
                <Link href="/workspace/materials">Continue review</Link>
              </div>
            </article>
          </div>
        </aside>
      </div>

      <section>
        <div className="section-heading">
          <h2>Recently generated</h2>
          <Link href="/workspace/materials">View all materials</Link>
        </div>
        <div className="recent-grid">
          {visibleMaterials.slice(0, 3).map((material) => (
            <Link
              className="recent-material card"
              href="/workspace/materials"
              key={material.id}
            >
              <span className={`material-type-icon ${material.status}`}>
                <FileCheck2 size={21} />
              </span>
              <div>
                <strong>{material.title}</strong>
                <p>
                  {material.type} · {material.student}
                </p>
                <span>{material.edited}</span>
              </div>
              <StatusPill status={material.status} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
