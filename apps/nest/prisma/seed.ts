import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// A few demo tracks so a fresh local DB has a populated homepage. No audio
// (audioFileKey stays null — the player shows chords but has nothing to
// play); real demos come from actually analysing songs.
const DEMO_TRACKS = [
  {
    title: 'Test Track',
    durationSeconds: 6,
    tempoBpm: 120,
    keyRoot: 'C',
    keyScale: 'major',
    chordSegments: [
      { startTime: 0, endTime: 2, root: 'C', chordType: 'major' },
      { startTime: 2, endTime: 4, root: 'G', chordType: 'major' },
      { startTime: 4, endTime: 6, root: 'A', chordType: 'minor' },
    ],
  },
  {
    title: 'Jazz II-V-I',
    durationSeconds: 8,
    tempoBpm: 96,
    keyRoot: 'C',
    keyScale: 'major',
    chordSegments: [
      { startTime: 0, endTime: 3, root: 'D', chordType: 'm7' },
      { startTime: 3, endTime: 6, root: 'G', chordType: '7' },
      { startTime: 6, endTime: 8, root: 'C', chordType: 'maj7' },
    ],
  },
  {
    title: 'Sus & Slash',
    durationSeconds: 8,
    tempoBpm: 110,
    keyRoot: 'D',
    keyScale: 'major',
    chordSegments: [
      { startTime: 0, endTime: 2, root: 'D', chordType: 'sus4' },
      { startTime: 2, endTime: 4, root: 'D', chordType: 'major' },
      {
        startTime: 4,
        endTime: 6,
        root: 'A',
        chordType: 'major',
        bassNote: 'C#',
      },
      { startTime: 6, endTime: 8, root: 'G', chordType: 'major' },
    ],
  },
];

async function main() {
  for (const { chordSegments, ...track } of DEMO_TRACKS) {
    const created = await prisma.track.create({
      data: {
        ...track,
        sourceType: 'UPLOAD',
        status: 'READY',
        isDemo: true,
        chordSegments: { create: chordSegments },
      },
    });
    console.log('Seeded demo track:', created.id, `(${created.title})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
