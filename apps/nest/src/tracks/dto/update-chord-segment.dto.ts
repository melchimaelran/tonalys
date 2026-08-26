import { IsIn, IsNotEmpty, IsString } from 'class-validator';

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

// Matches what the rest of the app actually supports end to end (piano
// highlighting, guitar shapes) — see ADR-038 for why detection itself is
// major/minor-only in V1.
const CHORD_TYPES = ['major', 'minor'];

export class UpdateChordSegmentDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(CHROMATIC_ROOTS)
  root!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(CHORD_TYPES)
  chordType!: string;
}
