"use client";

import {
  ArrowRight,
  Grid2X2,
  MessageSquareText,
  Plus,
  Search,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAriadne } from "@/lib/ariadne-store";
import "./students.css";

export default function StudentsPage() {
  const { students, setActiveStudent } = useAriadne();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        const matchesQuery = student.firstName
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesGroup =
          group === "all" ||
          (group === "room-14" && student.classGroup === "Room 14") ||
          (group === "speech-group" && ["maya", "leo"].includes(student.id));
        return matchesQuery && matchesGroup;
      }),
    [group, query, students],
  );

  return (
    <div className="page">
      <PageHeader
        eyebrow="Learner access"
        title="Students"
        description="Functional communication profiles, access preferences, and personalized supports."
      >
        <Link className="button button-primary" href="/workspace/students/new">
          <Plus size={17} /> Add student
        </Link>
      </PageHeader>

      <div className="students-toolbar">
        <label className="students-search">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search students</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by student name"
            type="search"
            value={query}
          />
        </label>
        <select
          aria-label="Filter by class"
          className="select students-filter"
          onChange={(event) => setGroup(event.target.value)}
          value={group}
        >
          <option value="all">All students</option>
          <option value="room-14">Room 14</option>
          <option value="speech-group">Speech group</option>
        </select>
      </div>

      <div className="student-card-grid">
        {filteredStudents.map((student) => (
          <article className="student-card card" key={student.id}>
            <div className="student-card-top">
              <span
                className="student-avatar"
                style={{ backgroundColor: student.color }}
                aria-hidden="true"
              >
                {student.initials}
              </span>
              <div>
                <h2>{student.firstName}</h2>
                <p>{student.currentActivity} · Room 14</p>
              </div>
            </div>

            <dl className="student-facts">
              <div>
                <dt>
                  <MessageSquareText size={15} /> Communicates with
                </dt>
                <dd>{student.communicationMode}</dd>
              </div>
              <div>
                <dt>
                  <Grid2X2 size={15} /> Preferred grid
                </dt>
                <dd>{student.grid}</dd>
              </div>
              <div>
                <dt>
                  <Timer size={15} /> Processing time
                </dt>
                <dd>{student.processingTime} seconds</dd>
              </div>
            </dl>

            <div className="student-priority">
              <span>Priority support</span>
              <strong>{student.prioritySupport}</strong>
            </div>

            <div className="student-actions">
              <Link
                className="button button-secondary"
                href={`/workspace/students/${student.id}`}
              >
                Open profile <ArrowRight size={15} />
              </Link>
              <Link
                className="button button-ghost"
                href={`/student?student=${student.id}`}
                onClick={() => setActiveStudent(student.id)}
              >
                Communicator
              </Link>
            </div>
          </article>
        ))}
      </div>
      {!filteredStudents.length ? (
        <div className="card empty-state">
          <h2>No students found</h2>
          <p className="muted">Try another name or classroom filter.</p>
        </div>
      ) : null}
    </div>
  );
}
