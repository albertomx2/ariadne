"use client";

import {
  Archive,
  BookOpenCheck,
  ContactRound,
  Copy,
  FileDown,
  Filter,
  Grid2X2,
  ListOrdered,
  MoreHorizontal,
  PackageCheck,
  Plus,
  RefreshCcw,
  Search,
  Send,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { downloadText } from "@/lib/download";
import {
  createId,
  type AriadneActivity,
  type AriadneMaterial,
  useAriadne,
} from "@/lib/ariadne-store";
import "./materials.css";

type StatusFilter = "all" | "published" | "review" | "draft" | "templates";

function MaterialIcon({ type }: { type: string }) {
  const normalized = type.toLowerCase();
  const Icon = normalized.includes("communication board")
    ? Grid2X2
    : normalized.includes("sequence")
      ? ListOrdered
      : normalized.includes("transition") || normalized.includes("change")
        ? RefreshCcw
        : normalized.includes("passport")
          ? ContactRound
          : normalized.includes("package")
            ? PackageCheck
            : BookOpenCheck;
  return <Icon aria-hidden="true" size={23} strokeWidth={2.35} />;
}

export default function MaterialsPage() {
  const {
    materials,
    students,
    activities,
    addActivity,
    updateActivity,
    duplicateMaterial,
    updateMaterial,
    deleteMaterial,
    showToast,
  } = useAriadne();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState("recent");
  const [showArchived, setShowArchived] = useState(false);
  const [studentFilter, setStudentFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const selected = materials.find((material) => material.id === selectedId);

  function openMaterial(materialId: string) {
    setReviewConfirmed(false);
    setSelectedId(materialId);
  }

  function closeMaterial() {
    setReviewConfirmed(false);
    setSelectedId(null);
    if (window.location.search.includes("material=")) {
      window.history.replaceState({}, "", "/workspace/materials");
    }
  }

  useEffect(() => {
    const materialId = new URLSearchParams(window.location.search).get(
      "material",
    );
    if (
      materialId &&
      materials.some((material) => material.id === materialId)
    ) {
      // The URL opens a stored material after the client-side store hydrates.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedId(materialId);
      setReviewConfirmed(false);
    }
  }, [materials]);

  const filtered = useMemo(() => {
    const result = materials.filter((material) => {
      const matchesQuery = `${material.title} ${material.type} ${material.student}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesStatus =
        status === "all" ||
        (status === "templates"
          ? material.type.toLowerCase().includes("template")
          : material.status === status);
      const matchesArchive = showArchived
        ? material.archived
        : !material.archived;
      const matchesStudent =
        studentFilter === "all" || material.student.includes(studentFilter);
      const matchesProvider =
        providerFilter === "all" ||
        material.symbolProvider.toLowerCase().includes(providerFilter);
      return (
        matchesQuery &&
        matchesStatus &&
        matchesArchive &&
        matchesStudent &&
        matchesProvider
      );
    });
    return [...result].sort((a, b) => {
      if (sort === "student") return a.student.localeCompare(b.student);
      if (sort === "type") return a.type.localeCompare(b.type);
      return 0;
    });
  }, [
    materials,
    providerFilter,
    query,
    showArchived,
    sort,
    status,
    studentFilter,
  ]);

  function downloadMaterial(material: AriadneMaterial) {
    downloadText(
      `${material.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}.txt`,
      `${material.title}\n\nType: ${material.type}\nStudent: ${material.student}\nStatus: ${material.status}\nSymbols: ${material.symbolProvider}\n\n${material.description}`,
    );
    showToast(`${material.title} downloaded.`);
  }

  function publishMaterial(material: AriadneMaterial) {
    let linkedActivityId = material.linkedActivityId;
    if (material.activityDraft) {
      linkedActivityId ??= createId("activity");
      const names = students
        .filter((student) =>
          material.activityDraft?.studentIds.includes(student.id),
        )
        .map((student) => student.firstName);
      const activity: AriadneActivity = {
        id: linkedActivityId,
        ...material.activityDraft,
        students: names,
        status: "ready",
      };
      if (activities.some((item) => item.id === linkedActivityId)) {
        updateActivity(linkedActivityId, activity);
      } else {
        addActivity(activity);
      }
    }
    updateMaterial(material.id, {
      status: "published",
      linkedActivityId,
      edited: "Just now",
    });
    setReviewConfirmed(false);
    showToast(
      material.activityDraft
        ? "Educator review completed. Material published and schedule synchronized."
        : "Educator review completed. Material published.",
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Support library"
        title="Materials"
        description="Draft, review, publish, download, archive, and reuse accessible classroom supports."
      >
        <Link className="button button-primary" href="/workspace/create">
          <Plus size={17} /> Create material
        </Link>
      </PageHeader>

      <div className="materials-toolbar">
        <label className="students-search">
          <Search size={18} />
          <span className="sr-only">Search materials</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search materials"
            type="search"
            value={query}
          />
        </label>
        <div className="material-filters">
          <button
            className="button button-secondary"
            onClick={() => setFiltersOpen(true)}
            type="button"
          >
            <Filter size={16} /> Filters
          </button>
          <select
            aria-label="Sort materials"
            className="select"
            onChange={(event) => setSort(event.target.value)}
            value={sort}
          >
            <option value="recent">Recently edited</option>
            <option value="student">Student</option>
            <option value="type">Material type</option>
          </select>
        </div>
      </div>

      <div className="filter-chips" aria-label="Active filters">
        {[
          ["all", "All"],
          ["published", "Published"],
          ["review", "Needs review"],
          ["draft", "Drafts"],
          ["templates", "Templates"],
        ].map(([value, label]) => (
          <button
            className={status === value ? "active" : ""}
            key={value}
            onClick={() => setStatus(value as StatusFilter)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="materials-table card">
        <div className="materials-table-head">
          <span>Material</span>
          <span>Student</span>
          <span>Status</span>
          <span>Symbol system</span>
          <span>Last edited</span>
          <span />
        </div>
        {filtered.map((material) => (
          <article className="material-row" key={material.id}>
            <button
              className="material-name material-name-button"
              onClick={() => openMaterial(material.id)}
              type="button"
            >
              <span
                className={`material-file-icon material-type-${material.type
                  .toLowerCase()
                  .replaceAll(/[^a-z]+/g, "-")}`}
              >
                <MaterialIcon type={material.type} />
              </span>
              <div>
                <strong>{material.title}</strong>
                <span>{material.type}</span>
              </div>
            </button>
            <span className="material-student" data-label="Student">
              {material.student}
            </span>
            <Link
              aria-label={`Open ${material.status === "review" ? "educator review" : material.status === "draft" ? "draft" : "published material"} for ${material.title}`}
              className="material-status-action"
              href={`/workspace/materials?material=${encodeURIComponent(material.id)}`}
              title="Open workflow"
            >
              <StatusPill status={material.status} />
              <small>
                {material.status === "review"
                  ? "Review now"
                  : material.status === "draft"
                    ? "Continue"
                    : "View"}
              </small>
            </Link>
            <span className="material-provider" data-label="Visual system">
              {material.symbolProvider}
            </span>
            <span className="material-edited" data-label="Last edited">
              {material.edited}
            </span>
            <div className="material-row-actions">
              <button
                aria-label={`Duplicate ${material.title}`}
                title="Duplicate as draft"
                onClick={() => {
                  duplicateMaterial(material.id);
                  showToast("Material duplicated as a draft.");
                }}
                type="button"
              >
                <Copy size={15} />
              </button>
              <button
                aria-label={`Download ${material.title}`}
                title="Download material"
                onClick={() => downloadMaterial(material)}
                type="button"
              >
                <FileDown size={15} />
              </button>
              <button
                aria-label={`More options for ${material.title}`}
                title="Edit material"
                onClick={() => openMaterial(material.id)}
                type="button"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>
          </article>
        ))}
        {!filtered.length ? (
          <div className="empty-inline">No materials match these filters.</div>
        ) : null}
      </div>

      <div className="materials-summary">
        <span>
          <Archive size={15} /> {filtered.length} material
          {filtered.length === 1 ? "" : "s"} shown
        </span>
        <button onClick={() => setShowArchived((shown) => !shown)} type="button">
          {showArchived ? "View active materials" : "View archived materials"}
        </button>
      </div>

      <Modal
        description="Narrow the support library without changing any material."
        onClose={() => setFiltersOpen(false)}
        open={filtersOpen}
        size="small"
        title="Material filters"
      >
        <div className="form-grid">
          <div className="field">
            <label htmlFor="material-student">Student</label>
            <select
              className="select"
              id="material-student"
              onChange={(event) => setStudentFilter(event.target.value)}
              value={studentFilter}
            >
              <option value="all">All students</option>
              {students.map((student) => (
                <option key={student.id} value={student.firstName}>
                  {student.firstName}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="material-provider">Symbol system</label>
            <select
              className="select"
              id="material-provider"
              onChange={(event) => setProviderFilter(event.target.value)}
              value={providerFilter}
            >
              <option value="all">All systems</option>
              <option value="arasaac">ARASAAC</option>
              <option value="mixed">Mixed</option>
              <option value="custom">Custom photos</option>
            </select>
          </div>
        </div>
        <div className="modal-actions">
          <button
            className="button button-secondary"
            onClick={() => {
              setStudentFilter("all");
              setProviderFilter("all");
            }}
            type="button"
          >
            Clear filters
          </button>
          <button
            className="button button-primary"
            onClick={() => setFiltersOpen(false)}
            type="button"
          >
            Apply filters
          </button>
        </div>
      </Modal>

      <Modal
        description={selected?.type}
        onClose={closeMaterial}
        open={Boolean(selected)}
        title={selected?.title ?? "Material"}
      >
        {selected ? (
          <>
            <section className={`material-workflow-state workflow-${selected.status}`}>
              <StatusPill status={selected.status} />
              <div>
                <strong>
                  {selected.status === "draft"
                    ? "Continue editing this draft"
                    : selected.status === "review"
                      ? "Educator verification is required"
                      : "This material is available to assigned learners"}
                </strong>
                <p>
                  {selected.status === "draft"
                    ? "A draft is saved work. Edit it below, then submit it for educator review."
                    : selected.status === "review"
                      ? "Check the wording, learner assignment, safety vocabulary, and visual choices before publishing."
                      : "Published materials have completed educator review and can be used in Student Space."}
                </p>
              </div>
            </section>
            <div className="form-grid">
              <div className="field full">
                <label htmlFor="material-title">Title</label>
                <input
                  className="input"
                  id="material-title"
                  onChange={(event) =>
                    updateMaterial(selected.id, {
                      title: event.target.value,
                      edited: "Just now",
                    })
                  }
                  value={selected.title}
                />
              </div>
              <div className="field">
                <label htmlFor="material-student-edit">Student</label>
                <input
                  className="input"
                  id="material-student-edit"
                  onChange={(event) =>
                    updateMaterial(selected.id, {
                      student: event.target.value,
                      edited: "Just now",
                    })
                  }
                  value={selected.student}
                />
              </div>
              <div className="field full">
                <label htmlFor="material-description">Notes</label>
                <textarea
                  className="textarea"
                  id="material-description"
                  onChange={(event) =>
                    updateMaterial(selected.id, {
                      description: event.target.value,
                      edited: "Just now",
                    })
                  }
                  value={selected.description}
                />
              </div>
            </div>
            {selected.status === "review" ? (
              <label className="material-review-confirmation">
                <input
                  checked={reviewConfirmed}
                  onChange={(event) =>
                    setReviewConfirmed(event.target.checked)
                  }
                  type="checkbox"
                />
                I reviewed the wording, assigned learners, safety access,
                symbols/photos, and classroom suitability.
              </label>
            ) : null}
            <div className="modal-actions">
              <button
                className="button button-danger-soft"
                onClick={() => {
                  deleteMaterial(selected.id);
                  closeMaterial();
                  showToast("Material deleted.");
                }}
                type="button"
              >
                Delete
              </button>
              <button
                className="button button-secondary"
                onClick={() => {
                  updateMaterial(selected.id, { archived: !selected.archived });
                  closeMaterial();
                  showToast(selected.archived ? "Material restored." : "Material archived.");
                }}
                type="button"
              >
                {selected.archived ? "Restore" : "Archive"}
              </button>
              <button
                className="button button-secondary"
                onClick={() => downloadMaterial(selected)}
                type="button"
              >
                <FileDown size={16} /> Download
              </button>
              {selected.status === "draft" ? (
                <button
                  className="button button-primary"
                  onClick={() => {
                    updateMaterial(selected.id, {
                      status: "review",
                      edited: "Just now",
                    });
                    setReviewConfirmed(false);
                    showToast("Draft sent for educator review.");
                  }}
                  type="button"
                >
                  <Send size={16} /> Send for review
                </button>
              ) : null}
              {selected.status === "review" ? (
                <button
                  className="button button-primary"
                  disabled={!reviewConfirmed}
                  onClick={() => {
                    publishMaterial(selected);
                  }}
                  type="button"
                >
                  <PackageCheck size={16} /> Publish material
                </button>
              ) : null}
              {selected.status === "published" ? (
                <button
                  className="button button-secondary"
                  onClick={() => {
                    updateMaterial(selected.id, {
                      status: "draft",
                      edited: "Just now",
                    });
                    if (
                      selected.linkedActivityId &&
                      activities.some(
                        (activity) =>
                          activity.id === selected.linkedActivityId,
                      )
                    ) {
                      updateActivity(selected.linkedActivityId, {
                        status: "needs-supports",
                      });
                    }
                    showToast("Material returned to draft.");
                  }}
                  type="button"
                >
                  <Undo2 size={16} /> Return to draft
                </button>
              ) : null}
              <button
                className="button button-secondary"
                onClick={() => {
                  closeMaterial();
                  showToast("Material changes saved.");
                }}
                type="button"
              >
                Done
              </button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
