import type { ReactNode } from "react";

// Mono section label with a leading em-dash — the "lead sheet" structural
// device used across the homepage and the upload page.
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
      <span className="text-primary">—</span> {children}
    </p>
  );
}
