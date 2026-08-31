export interface UpcomingChordDisplay {
  id: string;
  label: string;
}

export interface UpcomingChordsProps {
  chords: UpcomingChordDisplay[];
}

export function UpcomingChords({ chords }: UpcomingChordsProps) {
  if (chords.length === 0) return null;

  return (
    <ul aria-label="Upcoming chords" className="flex w-full flex-col gap-1">
      {chords.map((chord) => (
        <li
          key={chord.id}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground"
        >
          {chord.label}
        </li>
      ))}
    </ul>
  );
}
