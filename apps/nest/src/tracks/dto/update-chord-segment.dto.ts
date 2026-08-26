import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

const CHROMATIC_ROOTS = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

// A curated common subset of chords-db's ~50 suffixes per root — see
// apps/next/src/lib/notes.ts's CHORD_TYPES (kept in sync manually; Nest and
// Next don't share a module). Auto-detection stays major/minor-only in V1
// (ADR-038) — this list is for manual correction, which needs the fuller
// vocabulary a human ear can identify but the detector can't yet.
const CHORD_TYPES = [
  'major',
  'minor',
  'dim',
  'dim7',
  'aug',
  'sus2',
  'sus4',
  '6',
  'm6',
  '7',
  'm7',
  'maj7',
  'mmaj7',
  '9',
  'maj9',
  'm9',
  'add9',
];

export class UpdateChordSegmentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(CHROMATIC_ROOTS)
  root!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(CHORD_TYPES)
  chordType!: string;

  // A slash chord's bass note (e.g. "C/F" → root "C", bassNote "F").
  // Optional/nullable — omitted or null means no slash, bass = root.
  @IsOptional()
  @IsString()
  @IsIn(CHROMATIC_ROOTS)
  bassNote?: string | null;
}
