import {
  GUITAR_FRETS_ON_CHORD,
  GUITAR_STRING_COUNT,
  type GuitarChordShape,
} from "@/lib/guitar-chord-shape";

export interface GuitarChordDiagramProps {
  shape: GuitarChordShape | null;
}

const STRING_GAP = 16;
const FRET_GAP = 20;
const TOP = 20;
const LEFT = 10;
const DOT_RADIUS = 6;
const LABEL_MARGIN = 16;

function stringX(index: number) {
  return LEFT + index * STRING_GAP;
}

function fretY(fret: number) {
  return TOP + FRET_GAP * fret;
}

export function GuitarChordDiagram({ shape }: GuitarChordDiagramProps) {
  if (!shape) {
    return (
      <p role="img" aria-label="Guitar chord diagram" className="text-2xl font-semibold">
        —
      </p>
    );
  }

  const width = LEFT * 2 + STRING_GAP * (GUITAR_STRING_COUNT - 1);
  const height = fretY(GUITAR_FRETS_ON_CHORD) + 10;

  return (
    <svg
      role="img"
      aria-label="Guitar chord diagram"
      viewBox={`${-LABEL_MARGIN} 0 ${width + LABEL_MARGIN} ${height}`}
      className="h-40 w-32"
    >
      {Array.from({ length: GUITAR_FRETS_ON_CHORD + 1 }, (_, fret) => (
        <line
          key={`fret-${fret}`}
          x1={stringX(0)}
          x2={stringX(GUITAR_STRING_COUNT - 1)}
          y1={fretY(fret)}
          y2={fretY(fret)}
          stroke="currentColor"
          strokeWidth={fret === 0 && shape.baseFret === 1 ? 3 : 1}
        />
      ))}
      {Array.from({ length: GUITAR_STRING_COUNT }, (_, string) => (
        <line
          key={`string-${string}`}
          x1={stringX(string)}
          x2={stringX(string)}
          y1={fretY(0)}
          y2={fretY(GUITAR_FRETS_ON_CHORD)}
          stroke="currentColor"
          strokeWidth={1}
        />
      ))}
      <text
        data-testid="guitar-base-fret-label"
        x={LEFT - 8}
        y={fretY(1)}
        fontSize={10}
        textAnchor="end"
        fill="currentColor"
      >
        {shape.baseFret}fr
      </text>
      {shape.frets.map((fret, string) =>
        fret <= 0 ? (
          <text
            key={`marker-${string}`}
            data-testid={`guitar-string-marker-${string}`}
            x={stringX(string)}
            y={TOP - 8}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
          >
            {fret === -1 ? "×" : "○"}
          </text>
        ) : null,
      )}
      {shape.barres.map((barreFret) => {
        const stringsOnBarre = shape.frets
          .map((fret, string) => (fret === barreFret ? string : null))
          .filter((string): string is number => string !== null);
        if (stringsOnBarre.length < 2) {
          return null;
        }

        return (
          <line
            key={`barre-${barreFret}`}
            data-testid={`guitar-barre-${barreFret}`}
            x1={stringX(Math.min(...stringsOnBarre))}
            x2={stringX(Math.max(...stringsOnBarre))}
            y1={fretY(barreFret) - FRET_GAP / 2}
            y2={fretY(barreFret) - FRET_GAP / 2}
            stroke="currentColor"
            strokeWidth={DOT_RADIUS * 2}
            strokeLinecap="round"
          />
        );
      })}
      {shape.frets.map((fret, string) =>
        fret > 0 && !shape.barres.includes(fret) ? (
          <circle
            key={`dot-${string}`}
            data-testid={`guitar-dot-string-${string}`}
            cx={stringX(string)}
            cy={fretY(fret) - FRET_GAP / 2}
            r={DOT_RADIUS}
            fill="currentColor"
          />
        ) : null,
      )}
    </svg>
  );
}
