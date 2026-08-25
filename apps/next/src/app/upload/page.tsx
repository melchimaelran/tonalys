"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadDropzone } from "@/components/upload-dropzone";
import { YoutubeLinkForm } from "@/components/youtube-link-form";
import { useJobStatus } from "@/hooks/use-job-status";

type Source = "file" | "youtube";

interface SubmitResponse {
  jobId?: string;
  message?: string;
}

export default function UploadPage() {
  const [source, setSource] = useState<Source>("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const jobStatus = useJobStatus(jobId);

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
    <div className="flex flex-1 items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Add a track</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {jobId ? (
            jobStatus.isError ? (
              <p data-testid="job-status-error" className="text-sm text-destructive">
                Lost track of this job&apos;s status — please refresh
              </p>
            ) : (
              <p data-testid="job-status" className="text-sm">
                Status: {jobStatus.data?.status ?? "loading"}
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
