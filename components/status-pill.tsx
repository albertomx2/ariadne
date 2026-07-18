import type { SupportStatus } from "@/types/domain";

export function StatusPill({
  status,
}: {
  status:
    | SupportStatus
    | "ready"
    | "needs-supports"
    | "in-progress";
}) {
  const labels: Record<typeof status, string> = {
    draft: "Draft",
    review: "Needs educator review",
    published: "Published",
    ready: "Ready",
    "needs-supports": "Support not prepared",
    "in-progress": "Happening now",
  };
  const descriptions: Record<typeof status, string> = {
    draft: "Saved work that has not been submitted for professional review.",
    review:
      "An educator must verify wording, assignments, safety, and access before publishing.",
    published: "Reviewed and available to the assigned learners.",
    ready: "The schedule and learner-facing support are published and ready.",
    "needs-supports":
      "This scheduled activity has no reviewed support package linked yet.",
    "in-progress": "This activity is happening at the current device time.",
  };

  return (
    <span className={`status-pill status-${status}`} title={descriptions[status]}>
      {labels[status]}
    </span>
  );
}
