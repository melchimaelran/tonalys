"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileArrowUp, MusicNote, UploadSimple, Wrench, X, YoutubeLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { AnalysisStatus } from "@/components/analysis-status";
import { BackLink } from "@/components/back-link";
import { Eyebrow } from "@/components/eyebrow";
import { UploadDropzone } from "@/components/upload-dropzone";
import { YoutubeLinkForm } from "@/components/youtube-link-form";
import { useJobStatus } from "@/hooks/use-job-status";
import { cn } from "@/lib/utils";

type Source = "file" | "youtube";

// Temporary: YouTube tightened access for servers (bot + PO-token checks
// that block automated imports from our host). The link-import path is
// paused until the worker-side fix ships — flip back to `true` to restore
// the form. See project notes (project_youtube_botcheck_saga).
const YOUTUBE_IMPORT_ENABLED = false;

function YoutubePausedNotice({ onUseFile }: { onUseFile: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 border border-dashed border-border px-6 py-10 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-muted">
        <Wrench aria-hidden className="size-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium">YouTube link import is paused</p>
        <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
          YouTube has tightened access for servers — extra bot and token checks
          now block automated link imports from our host. A fix is in progress
          and this will be back soon.
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onUseFile}>
        <FileArrowUp data-icon="inline-start" aria-hidden />
        Upload an audio file instead
      </Button>
    </div>
  );
}

interface SubmitResponse {
  jobId?: string;
  title?: string;
  message?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [source, setSource] = useState<Source>("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [trackTitle, setTrackTitle] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const jobStatus = useJobStatus(jobId);

  useEffect(() => {
    if (jobStatus.data?.status === "DONE") {
      router.push(`/tracks/${jobStatus.data.trackId}`);
    }
  }, [jobStatus.data?.status, jobStatus.data?.trackId, router]);

  // Abandoning the page mid-analysis cancels the job: the server hard-deletes
  // the track + audio and the worker bails between phases. Covers closing the
  // tab / navigating away (pagehide) and leaving this route (unmount). A job
  // that has already finished or errored is left alone.
  const cancelRef = useRef<{ jobId: string | null; active: boolean }>({
    jobId: null,
    active: false,
  });
  const jobStatusValue = jobStatus.data?.status;

  useEffect(() => {
    const done = jobStatusValue === "DONE" || jobStatusValue === "ERROR";
    cancelRef.current = { jobId, active: jobId !== null && !done };
  }, [jobId, jobStatusValue]);

  useEffect(() => {
    function cancelIfAbandoned() {
      const { jobId: id, active } = cancelRef.current;
      if (id && active && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(`/api/jobs/${id}/cancel`);
      }
    }

    window.addEventListener("pagehide", cancelIfAbandoned);
    return () => {
      window.removeEventListener("pagehide", cancelIfAbandoned);
      cancelIfAbandoned();
    };
  }, []);

  function resetJob() {
    setJobId(null);
    setTrackTitle(null);
    setSubmitError(null);
  }

  function handleSourceChange(next: Source) {
    setSource(next);
    // The dropzone unmounts/remounts across the toggle (losing its own
    // file input), but this lifted selectedFile wouldn't reset on its
    // own — clear it so "Selected: ..." doesn't linger after leaving and
    // coming back to the file tab.
    setSelectedFile(null);
  }

  async function submit(request: () => Promise<Response>) {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await request();
      const data = (await response.json().catch(() => null)) as SubmitResponse | null;

      if (!response.ok || !data?.jobId) {
        setSubmitError(data?.message ?? "Submission failed — please try again");
        return;
      }

      setJobId(data.jobId);
      setTrackTitle(data.title ?? null);
    } catch {
      setSubmitError("Analysis service unavailable — please try again shortly");
    } finally {
      setIsSubmitting(false);
    }
  }

  function submitFile(file: File) {
    void submit(() => {
      const formData = new FormData();
      formData.append("file", file);
      return fetch("/api/upload", { method: "POST", body: formData });
    });
  }

  function submitYoutubeUrl(url: string) {
    void submit(() =>
      fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }),
    );
  }

  const tabClass = (active: boolean) =>
    cn(
      "flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-xs font-medium transition-colors [&_svg]:size-4",
      active
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground",
    );

  return (
    <div className="flex flex-1 justify-center bg-background px-4">
      <main className="flex w-full max-w-2xl flex-col gap-6 py-12">
        <BackLink href="/" label="Home" />

        <div className="flex flex-col gap-2">
          <Eyebrow>Add a track</Eyebrow>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] sm:text-4xl">
            Add a track
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            An audio file or a YouTube link — Tonalys detects the chords, tempo
            and key, synced to playback.
          </p>
        </div>

        <div className="border border-border bg-card">
          {jobId ? (
            <div className="p-6">
              {jobStatus.isError ? (
                <div
                  data-testid="job-status-error"
                  className="flex flex-col items-center gap-3"
                >
                  <p className="text-sm text-destructive">
                    Lost track of this job&apos;s status — please refresh
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetJob}
                  >
                    Try again
                  </Button>
                </div>
              ) : jobStatus.data ? (
                <div
                  data-testid="job-status"
                  className="flex flex-col items-center gap-4"
                >
                  {trackTitle && (
                    <h2 className="text-center text-base font-semibold">{trackTitle}</h2>
                  )}
                  <AnalysisStatus
                    status={jobStatus.data.status}
                    errorMessage={jobStatus.data.errorMessage}
                    queuePosition={jobStatus.data.queuePosition}
                    onRetry={resetJob}
                  />
                </div>
              ) : (
                <p
                  data-testid="job-status"
                  className="text-center text-sm text-muted-foreground"
                >
                  Loading…
                </p>
              )}
            </div>
          ) : (
            <>
              <div
                className="flex border-b border-border"
                role="tablist"
                aria-label="Track source"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === "file"}
                  onClick={() => handleSourceChange("file")}
                  className={tabClass(source === "file")}
                >
                  <FileArrowUp aria-hidden />
                  Upload file
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={source === "youtube"}
                  onClick={() => handleSourceChange("youtube")}
                  className={tabClass(source === "youtube")}
                >
                  <YoutubeLogo aria-hidden />
                  YouTube link
                  {!YOUTUBE_IMPORT_ENABLED && (
                    <span className="ml-1.5 rounded-full border border-border px-1.5 py-px text-[0.6rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Paused
                    </span>
                  )}
                </button>
              </div>

              <div className="flex flex-col gap-4 p-6">
                {source === "file" ? (
                  <>
                    <UploadDropzone onFileSelected={setSelectedFile} />
                    {selectedFile && (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 border border-border px-3 py-2">
                          <MusicNote
                            weight="fill"
                            aria-hidden
                            className="size-3.5 shrink-0 text-primary"
                          />
                          <span className="min-w-0 flex-1 truncate font-mono text-xs">
                            {selectedFile.name}
                          </span>
                          <button
                            type="button"
                            aria-label="Remove selected file"
                            onClick={() => setSelectedFile(null)}
                            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <X aria-hidden className="size-3.5" />
                          </button>
                        </div>
                        <Button
                          type="button"
                          className="w-full"
                          disabled={isSubmitting}
                          onClick={() => submitFile(selectedFile)}
                        >
                          <UploadSimple data-icon="inline-start" aria-hidden />
                          {isSubmitting ? "Uploading…" : "Upload & analyze"}
                        </Button>
                      </div>
                    )}
                  </>
                ) : YOUTUBE_IMPORT_ENABLED ? (
                  <YoutubeLinkForm onUrlSubmitted={submitYoutubeUrl} isSubmitting={isSubmitting} />
                ) : (
                  <YoutubePausedNotice onUseFile={() => handleSourceChange("file")} />
                )}

                {submitError && (
                  <p className="text-xs text-destructive">{submitError}</p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
