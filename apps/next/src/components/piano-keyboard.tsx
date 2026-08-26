import { cn } from "@/lib/utils";

const NOTES_PER_OCTAVE = ["C", "D", "E", "F", "G", "A", "B"];
const OCTAVE_COUNT = 2;
const TOTAL_WHITE_KEYS = NOTES_PER_OCTAVE.length * OCTAVE_COUNT;
const WHITE_KEY_WIDTH = 100 / TOTAL_WHITE_KEYS;

// Each black key sits centered on the boundary right after the white key at
// `afterIndex` (0-based within one octave) — e.g. C# sits on the C/D
// boundary. E and B have no black key after them, matching a real keyboard.
const BLACK_KEYS_PER_OCTAVE = [
  { note: "C#", afterIndex: 0 },
  { note: "D#", afterIndex: 1 },
  { note: "F#", afterIndex: 3 },
  { note: "G#", afterIndex: 4 },
  { note: "A#", afterIndex: 5 },
];
const BLACK_KEY_WIDTH = WHITE_KEY_WIDTH * 0.6;

const octaves = Array.from({ length: OCTAVE_COUNT }, (_, i) => i + 1);

export interface HighlightedNote {
  note: string;
  octave: number;
}

export interface PianoKeyboardProps {
  highlightedNotes: HighlightedNote[];
}

function isHighlighted(highlightedNotes: HighlightedNote[], note: string, octave: number) {
  return highlightedNotes.some((h) => h.note === note && h.octave === octave);
}

export function PianoKeyboard({ highlightedNotes }: PianoKeyboardProps) {
  return (
    <div
      role="img"
      aria-label="Piano keyboard"
      className="relative flex w-full max-w-md aspect-[7/2]"
    >
      {octaves.flatMap((octave) =>
        NOTES_PER_OCTAVE.map((note) => (
          <div
            key={`${note}-${octave}`}
            data-testid={`piano-key-${note}-${octave}`}
            className={cn(
              "h-full flex-1 border border-neutral-400",
              isHighlighted(highlightedNotes, note, octave) ? "bg-primary" : "bg-white",
            )}
          />
        )),
      )}
      {octaves.flatMap((octave, octaveIndex) =>
        BLACK_KEYS_PER_OCTAVE.map(({ note, afterIndex }) => (
          <div
            key={`${note}-${octave}`}
            data-testid={`piano-key-${note}-${octave}`}
            className={cn(
              "absolute top-0 h-[60%]",
              isHighlighted(highlightedNotes, note, octave) ? "bg-primary" : "bg-neutral-900",
            )}
            style={{
              left: `${(octaveIndex * NOTES_PER_OCTAVE.length + afterIndex + 1) * WHITE_KEY_WIDTH}%`,
              width: `${BLACK_KEY_WIDTH}%`,
              transform: "translateX(-50%)",
            }}
          />
        )),
      )}
    </div>
  );
}
