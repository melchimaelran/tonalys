import { formatChordLabel } from "@/lib/chord-label";
import type { ChordSegment } from "@/lib/find-chord-at-time";

export interface CurrentChordDisplayProps {
  chord: ChordSegment | null;
  progress?: number;
  durationSeconds?: number;
}

export function CurrentChordDisplay({
  chord,
  progress = 0,
  durationSeconds,
}: CurrentChordDisplayProps) {
  const clampedProgress = Math.min(1, Math.max(0, progress));

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 overflow-hidden rounded-md border border-border bg-muted/40">
        <div
          data-testid="chord-progress-fill"
          className="absolute inset-y-0 left-0 bg-orange-500/30"
          style={{ width: `${clampedProgress * 100}%` }}
        />
        <p role="status" aria-live="polite" className="relative px-4 py-2 text-2xl font-semibold">
          {chord ? formatChordLabel(chord) : "—"}
        </p>
      </div>
      {chord && durationSeconds !== undefined && (
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{durationSeconds}s</span>
      )}
    </div>
  );
}
