"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileArrowUp, UploadSimple, YoutubeLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisStatus } from "@/components/analysis-status";
import { BackLink } from "@/components/back-link";
import { UploadDropzone } from "@/components/upload-dropzone";
import { YoutubeLinkForm } from "@/components/youtube-link-form";
import { useJobStatus } from "@/hooks/use-job-status";

type Source = "file" | "youtube";

interface SubmitResponse {
  jobId?: string;
  message?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [source, setSource] = useState<Source>("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
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

  return (
    <div className="flex flex-1 flex-col items-center gap-4 bg-background p-4">
      <div className="w-full max-w-sm">
        <BackLink href="/" label="Library" />
      </div>
      <Card className="mt-auto mb-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>Add a track</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {jobId ? (
            jobStatus.isError ? (
              <div data-testid="job-status-error" className="flex flex-col items-center gap-3">
                <p className="text-sm text-destructive">
                  Lost track of this job&apos;s status — please refresh
                </p>
                <Button type="button" variant="outline" size="sm" onClick={resetJob}>
                  Try again
                </Button>
              </div>
            ) : jobStatus.data ? (
              <div data-testid="job-status" className="flex flex-col items-center gap-4">
                <AnalysisStatus
                  status={jobStatus.data.status}
                  errorMessage={jobStatus.data.errorMessage}
                  queuePosition={jobStatus.data.queuePosition}
                  onRetry={resetJob}
                />
              </div>
            ) : (
              <p data-testid="job-status" className="text-sm text-muted-foreground">
                Loading...
              </p>
            )
          ) : (
            <>
              <div className="flex gap-2" role="tablist" aria-label="Track source">
                <Button
                  type="button"
                  variant={source === "file" ? "default" : "outline"}
                  size="sm"
                  role="tab"
                  aria-selected={source === "file"}
                  onClick={() => handleSourceChange("file")}
                >
                  <FileArrowUp data-icon="inline-start" aria-hidden />
                  Upload file
                </Button>
                <Button
                  type="button"
                  variant={source === "youtube" ? "default" : "outline"}
                  size="sm"
                  role="tab"
                  aria-selected={source === "youtube"}
                  onClick={() => handleSourceChange("youtube")}
                >
                  <YoutubeLogo data-icon="inline-start" aria-hidden />
                  YouTube link
                </Button>
              </div>

              {source === "file" ? (
                <>
                  <UploadDropzone onFileSelected={setSelectedFile} />
                  {selectedFile && (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Selected: {selectedFile.name}
                      </p>
                      <Button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => submitFile(selectedFile)}
                      >
                        <UploadSimple data-icon="inline-start" aria-hidden />
                        {isSubmitting ? "Uploading..." : "Upload"}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <YoutubeLinkForm onUrlSubmitted={submitYoutubeUrl} />
              )}

              {submitError && <p className="text-xs text-destructive">{submitError}</p>}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
