import type { Metadata } from "next";
import Link from "next/link";
import { CaretDown, Info, UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eyebrow } from "@/components/eyebrow";
import { PlayScreenPreview } from "@/components/play-screen-preview";
import { DemoSongs } from "@/components/demo-songs";

export const metadata: Metadata = {
  title: "Tonalys — the chords to any song",
  description:
    "Upload an audio file or paste a YouTube link and Tonalys transcribes the chords, tempo and key, played back in sync on piano and guitar.",
};

const FEATURES = [
  {
    tag: "chords",
    title: "Beyond major & minor",
    body: "Extended and altered chords, not just triads — 7ths, 9ths, sixths, sus, dim, aug, slash chords and more.",
  },
  {
    tag: "tempo · key",
    title: "Beat and key",
    body: "Tempo in BPM and the song's key, read straight off the audio.",
  },
  {
    tag: "views",
    title: "Piano and guitar",
    body: "Follow along on a keyboard or as fingered chord shapes — whichever you read faster.",
  },
  {
    tag: "practice",
    title: "Built for practice",
    body: "Capo and transpose, an A–B loop, 0.5–2× speed, and fix any chord by hand.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 justify-center bg-background px-4">
      <main className="flex w-full max-w-2xl flex-col divide-y divide-border">
        <section className="flex flex-col gap-4 py-12 duration-500 animate-in fade-in slide-in-from-bottom-3 motion-reduce:animate-none">
          <Eyebrow>Chord · tempo · key</Eyebrow>
          <h1 className="max-w-xl text-balance text-4xl font-semibold tracking-[-0.02em] sm:text-5xl sm:leading-[1.05]">
            The chords to any song, in time with the music.
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Upload an audio file or paste a YouTube link. Tonalys transcribes the
            chords, tempo and key, and plays them back in sync — on piano and
            guitar.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link href="/upload" className={buttonVariants({ size: "lg" })}>
              <UploadSimple
                data-icon="inline-start"
                aria-hidden
                className="transition-transform group-hover/button:-translate-y-px"
              />
              Upload a track
            </Link>
            <Link
              href="/about"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              <Info data-icon="inline-start" aria-hidden className="text-muted-foreground" />
              How it works
            </Link>
            <a
              href="#demo-songs"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              <CaretDown
                data-icon="inline-start"
                aria-hidden
                className="text-muted-foreground transition-transform group-hover/button:translate-y-px"
              />
              View demo songs
            </a>
          </div>
          <div className="pt-5">
            <PlayScreenPreview />
          </div>
        </section>

        <section className="flex flex-col gap-6 py-12">
          <Eyebrow>What it detects</Eyebrow>
          <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.tag}
                className="flex flex-col gap-2 bg-background p-5"
              >
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-primary">
                  {feature.tag}
                </p>
                <h2 className="text-sm font-semibold text-foreground">
                  {feature.title}
                </h2>
                <p className="text-sm text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="demo-songs"
          className="flex scroll-mt-20 flex-col gap-5 py-12"
        >
          <Eyebrow>Try one</Eyebrow>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Demo songs</h2>
            <p className="text-sm text-muted-foreground">
              Tracks we&apos;ve already analysed — open one to explore the
              player.
            </p>
          </div>
          <DemoSongs />
        </section>
      </main>
    </div>
  );
}
