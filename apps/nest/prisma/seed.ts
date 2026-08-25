import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const track = await prisma.track.create({
    data: {
      title: 'Test Track',
      sourceType: 'UPLOAD',
      status: 'READY',
      chordSegments: {
        create: [
          { startTime: 0, endTime: 2, root: 'C', chordType: 'major' },
          { startTime: 2, endTime: 4, root: 'G', chordType: 'major' },
          { startTime: 4, endTime: 6, root: 'A', chordType: 'minor' },
        ],
      },
    },
  });

  console.log('Seeded track:', track.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
