import Link from "next/link";
import { UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { TrackLibrary } from "@/components/track-library";

export default function Home() {
  return (
    <div className="flex flex-1 justify-center bg-background p-4">
      <main className="flex w-full max-w-2xl flex-col gap-6">
        <section className="flex flex-col items-start gap-3 pt-4">
          <h1 className="text-2xl font-semibold tracking-tight">Tonalys</h1>
          <p className="text-sm text-muted-foreground">
            Detect chords, tempo and key from any audio file or YouTube link.
          </p>
          <Link href="/upload" className={buttonVariants()}>
            <UploadSimple data-icon="inline-start" aria-hidden />
            Upload a track
          </Link>
        </section>
        <TrackLibrary />
      </main>
    </div>
  );
}
