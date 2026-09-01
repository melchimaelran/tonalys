"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Circle, CircleNotch, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export interface AnalysisStatusProps {
  status: "PENDING" | "PROCESSING" | "DONE" | "ERROR";
  errorMessage: string | null;
  // How many analyses (running + queued ahead) sit before this one. 0 once
  // the worker has picked this job up. While > 0 the queue view is shown
  // instead of the simulated phase list.
  queuePosition?: number;
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

export function AnalysisStatus({
  status,
  errorMessage,
  queuePosition = 0,
  onRetry,
}: AnalysisStatusProps) {
  const [activePhase, setActivePhase] = useState(0);
  const queued = status === "PENDING" && queuePosition > 0;

  useEffect(() => {
    if (status === "DONE" || status === "ERROR") return;
    if (queued) return;
    if (activePhase >= PHASES.length - 1) return;

    const timeoutId = setTimeout(() => {
      setActivePhase((phase) => Math.min(phase + 1, PHASES.length - 1));
    }, PHASES[activePhase].durationMs);

    return () => clearTimeout(timeoutId);
  }, [activePhase, status, queued]);

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

  if (queued) {
    const ahead = queuePosition - 1;
    return (
      <div role="status" aria-live="polite" className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <CircleNotch aria-hidden className="size-4 shrink-0 animate-spin text-foreground" />
          <p className="text-sm text-muted-foreground">
            Waiting in queue — position {queuePosition}
          </p>
        </div>
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          The server analyses one track at a time —{" "}
          {ahead === 1
            ? "1 track ahead of you is still being processed. Yours starts as soon as it finishes."
            : `${ahead} tracks ahead of you are still being processed. Yours starts as soon as they finish.`}
        </p>
        <p className="text-xs text-muted-foreground">
          Please wait — this can take a few minutes. Keep this tab open.
        </p>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="flex w-full flex-col gap-3">
      <div className="flex w-full flex-col gap-2">
        {PHASES.map((phase, index) => (
          <div key={phase.label} className="flex items-center gap-2">
            {index < activePhase && (
              <CheckCircle aria-hidden weight="fill" className="size-4 shrink-0 text-emerald-600" />
            )}
            {index === activePhase && (
              <CircleNotch aria-hidden className="size-4 shrink-0 animate-spin text-foreground" />
            )}
            {index > activePhase && (
              <Circle aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            )}
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
      <p className="text-xs text-muted-foreground">
        Please wait — analysing the audio can take a few minutes. Keep this tab
        open.
      </p>
    </div>
  );
}
