"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Circle, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export interface AnalysisStatusProps {
  status: "PENDING" | "PROCESSING" | "DONE" | "ERROR";
  errorMessage: string | null;
  onRetry?: () => void;
}

// Illustrative only — not measured. Simulated client-side because job
// status only ever reports PENDING/PROCESSING/DONE/ERROR (no backend
// step tracking). Order mirrors the real worker pipeline
// (apps/worker/app/analysis.py): tempo -> key -> chords.
const PHASES = [
  { label: "Detecting tempo", durationMs: 2500 },
  { label: "Identifying key", durationMs: 2500 },
  { label: "Transcribing chords", durationMs: 5000 },
] as const;

export function AnalysisStatus({ status, errorMessage, onRetry }: AnalysisStatusProps) {
  const [activePhase, setActivePhase] = useState(0);

  useEffect(() => {
    if (status === "DONE" || status === "ERROR") return;
    if (activePhase >= PHASES.length - 1) return;

    const timeoutId = setTimeout(() => {
      setActivePhase((phase) => Math.min(phase + 1, PHASES.length - 1));
    }, PHASES[activePhase].durationMs);

    return () => clearTimeout(timeoutId);
  }, [activePhase, status]);

  if (status === "ERROR") {
    return (
      <div role="alert" className="flex flex-col items-center gap-3">
        <WarningCircle aria-hidden className="size-6 text-destructive" />
        <p className="text-sm text-destructive">{errorMessage ?? "Analysis failed."}</p>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  if (status === "DONE") {
    return (
      <div role="status" className="flex items-center gap-3">
        <CheckCircle aria-hidden weight="fill" className="size-5 text-emerald-600" />
        <p className="text-sm">Analysis complete — opening your track...</p>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="flex w-full flex-col gap-2">
      {PHASES.map((phase, index) => (
        <div key={phase.label} className="flex items-center gap-2">
          {index < activePhase && (
            <CheckCircle weight="fill" className="size-4 shrink-0 text-emerald-600" />
          )}
          {index === activePhase && (
            <CircleNotch className="size-4 shrink-0 animate-spin text-foreground" />
          )}
          {index > activePhase && <Circle className="size-4 shrink-0 text-muted-foreground" />}
          <p
            className={
              index === activePhase
                ? "text-sm text-foreground"
                : "text-sm text-muted-foreground"
            }
          >
            {phase.label}
          </p>
        </div>
      ))}
    </div>
  );
}
