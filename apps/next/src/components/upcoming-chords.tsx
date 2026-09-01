import { Info } from "@phosphor-icons/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface UpcomingChordDisplay {
  id: string;
  label: string;
  durationSeconds: number;
}

export interface UpcomingChordsProps {
  chords: UpcomingChordDisplay[];
}

export function UpcomingChords({ chords }: UpcomingChordsProps) {
  if (chords.length === 0) return null;

  const maxDuration = Math.max(...chords.map((chord) => chord.durationSeconds), 1);

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        Upcoming
        <Tooltip>
          <TooltipTrigger type="button" aria-label="About the chord bars">
            <Info aria-hidden className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>
            Each row&apos;s width shows how long the chord is held — longer chord,
            wider bar. Very short chords keep a minimum width so they stay
            readable.
          </TooltipContent>
        </Tooltip>
      </div>
      <ul aria-label="Upcoming chords" className="flex w-full flex-col items-start gap-1">
        {chords.map((chord) => (
          <li
            key={chord.id}
            style={{ width: `${(chord.durationSeconds / maxDuration) * 100}%` }}
            className="flex min-w-[6rem] items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground"
          >
            <span>{chord.label}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {chord.durationSeconds}s
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
