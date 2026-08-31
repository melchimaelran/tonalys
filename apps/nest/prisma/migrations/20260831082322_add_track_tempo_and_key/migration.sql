-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "key_root" TEXT,
ADD COLUMN     "key_scale" TEXT,
ADD COLUMN     "tempo_bpm" DOUBLE PRECISION;
