import type { Metadata } from "next";
import { GithubLogo, LinkedinLogo } from "@phosphor-icons/react/dist/ssr";

const GITHUB_URL = "https://github.com/melchimaelran/tonalys";
const LINKEDIN_URL = "https://www.linkedin.com/in/melchimael-roeh-429ab6210/";

export const metadata: Metadata = {
  title: "About — Tonalys",
  description:
    "Tonalys is a music analysis web app: chord, tempo and key detection from an audio file or a YouTube link.",
};

const STACK = [
  "Next.js (App Router)",
  "NestJS",
  "Python + Essentia",
  "PostgreSQL",
  "Redis",
  "RabbitMQ",
  "MinIO",
  "Docker Compose",
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="flex flex-1 justify-center bg-background p-4">
      <main className="flex w-full max-w-2xl flex-col gap-8 py-8">
        <header className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">About Tonalys</h1>
          <p className="text-sm text-muted-foreground">
            Tonalys is a music analysis web app. From an uploaded audio file or a
            YouTube link, it detects the chords, tempo and key of a track and
            displays them in sync with playback — a piano view and guitar tabs —
            with capo, transpose and manual chord correction.
          </p>
        </header>

        <Section title="Why it exists">
          <p>Tonalys serves three purposes at once:</p>
          <ul className="list-disc pl-5">
            <li>a real personal tool for learning songs by ear;</li>
            <li>
              a public portfolio piece showing a transparent analysis pipeline —
              upload → queue → worker → result — rather than a commercial black
              box;
            </li>
            <li>
              a learning vehicle for Docker/Compose, the full test pyramid,
              Next.js, NestJS and Claude Code subagents.
            </li>
          </ul>
        </Section>

        <Section title="How it works">
          <p>
            An upload or YouTube link creates a track and an analysis job. The
            job is queued over RabbitMQ; a Python worker downloads or reads the
            audio, runs chord/tempo/key detection with Essentia, and writes the
            results back. The frontend polls the job and then renders the chords
            synced to playback.
          </p>
          <p className="flex flex-wrap gap-1.5">
            {STACK.map((tech) => (
              <span
                key={tech}
                className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tech}
              </span>
            ))}
          </p>
        </Section>

        <Section title="A note on YouTube">
          <p>
            YouTube audio extraction is provided for personal use only. Tonalys
            is single-user, gated behind authentication, and has no public
            sharing of analyzed tracks.
          </p>
        </Section>

        <Section title="Links">
          <div className="flex flex-col gap-2">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-foreground hover:underline"
            >
              <GithubLogo aria-hidden className="size-4" />
              GitHub repository
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-foreground hover:underline"
            >
              <LinkedinLogo aria-hidden className="size-4" />
              LinkedIn — Melchimael Roeh
            </a>
          </div>
        </Section>
      </main>
    </div>
  );
}
