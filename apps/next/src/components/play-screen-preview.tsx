import { PianoKeyboard } from "@/components/piano-keyboard";
import { GuitarChordDiagram } from "@/components/guitar-chord-diagram";
import { getChordNotes } from "@/lib/chord-notes";
import { getGuitarChordShape } from "@/lib/guitar-chord-shape";

// A frozen snapshot of the player for the homepage — the real piano and
// guitar views with hard-coded props, no audio and no controls. Decorative:
// kept out of the a11y tree, the surrounding copy carries the meaning.
const NOTES = getChordNotes("C", "maj7");
const SHAPE = getGuitarChordShape("C", "maj7");

// Mirrors the real player's "Upcoming" bars: width ∝ how long the chord is
// held, with a floor so short chords stay readable.
const UP_NEXT = [
  { label: "Am7", seconds: 4, width: "78%" },
  { label: "Dm7", seconds: 2, width: "45%" },
  { label: "G7", seconds: 6, width: "100%" },
];

function Label({ children }: { children: string }) {
  return (
    <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </span>
  );
}

export function PlayScreenPreview() {
  return (
    <figure
      aria-hidden
      className="relative w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-black/20 ring-1 ring-white/5"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
      />

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-primary">
            Now playing
          </span>
          <span className="font-mono text-[0.7rem] tracking-wide text-muted-foreground">
            92 BPM · C major
          </span>
        </div>

        <div className="relative overflow-hidden rounded-lg border border-border bg-muted/40">
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 w-2/5 bg-primary/15"
          />
          <div className="relative flex items-baseline justify-between px-4 py-3">
            <span className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Cmaj7
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">4s</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/40 p-3">
            <Label>Piano</Label>
            <div className="flex justify-center">
              <PianoKeyboard highlightedNotes={NOTES} />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-border bg-background/40 p-3">
            <Label>Guitar</Label>
            <div className="flex flex-1 items-center justify-center [&_svg]:h-28 [&_svg]:w-auto">
              <GuitarChordDiagram shape={SHAPE} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Up next</Label>
          <ul className="flex flex-col gap-1">
            {UP_NEXT.map((chord) => (
              <li
                key={chord.label}
                style={{ width: chord.width }}
                className="flex min-w-[6rem] items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
              >
                <span className="whitespace-nowrap font-mono">{chord.label}</span>
                <span className="shrink-0 tabular-nums">{chord.seconds}s</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}
