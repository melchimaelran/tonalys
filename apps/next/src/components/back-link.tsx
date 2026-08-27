import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";

interface BackLinkProps {
  href: string;
  label: string;
}

// Explicit destination rather than history.back() — predictable when the
// user landed here from an external referrer or a fresh tab.
export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      <CaretLeft aria-hidden className="size-3.5" />
      {label}
    </Link>
  );
}
