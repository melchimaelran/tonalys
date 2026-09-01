import { PianoKeyboard } from "@/components/piano-keyboard";
import { GuitarChordDiagram } from "@/components/guitar-chord-diagram";
import { getChordNotes } from "@/lib/chord-notes";
import { getGuitarChordShape } from "@/lib/guitar-chord-shape";

// A frozen snapshot of the player for the homepage — the real piano and
// guitar views with hard-coded props, no audio and no controls. Decorative:
// kept out of the a11y tree, the surrounding copy carries the meaning.
const NOTES = getChordNotes("C", "maj7");
const SHAPE = getGuitarChordShape("C", "maj7");

function ViewLabel({ children }: { children: string }) {
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
      className="mx-auto w-full max-w-sm border border-border bg-card"
    >
      <div className="flex items-center justify-between px-3 pt-2 font-mono text-[0.7rem] tracking-wide">
        <span className="text-primary">Cmaj7</span>
        <span className="text-muted-foreground">92 BPM · C major</span>
      </div>

      <div className="mx-3 mt-2 h-px bg-border">
        <div className="h-px w-2/5 bg-primary" />
      </div>

      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-col gap-1.5">
          <ViewLabel>Piano</ViewLabel>
          <div className="mx-auto w-full max-w-[300px]">
            <PianoKeyboard highlightedNotes={NOTES} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <ViewLabel>Guitar</ViewLabel>
          <div className="[&_svg]:h-24 [&_svg]:w-auto">
            <GuitarChordDiagram shape={SHAPE} />
          </div>
        </div>

        <p className="border-t border-border pt-3 font-mono text-xs text-muted-foreground">
          next&ensp;<span className="text-foreground/70">Am7</span> · Dm7 · G7
        </p>
      </div>
    </figure>
  );
}
