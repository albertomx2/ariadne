import Link from "next/link";

export function Brand({
  href = "/workspace",
  showWord = true,
}: {
  href?: string;
  showWord?: boolean;
}) {
  return (
    <Link className="brand" href={href} aria-label="Ariadne home">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-logo-image" />
      </span>
      {showWord ? <span className="brand-word">Ariadne</span> : null}
    </Link>
  );
}
