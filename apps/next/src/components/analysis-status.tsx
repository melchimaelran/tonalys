export interface AnalysisStatusProps {
  status: "PENDING" | "PROCESSING" | "DONE" | "ERROR";
  errorMessage: string | null;
}

const WAITING_LABEL: Record<"PENDING" | "PROCESSING", string> = {
  PENDING: "Waiting to start...",
  PROCESSING: "Analyzing your track...",
};

export function AnalysisStatus({ status, errorMessage }: AnalysisStatusProps) {
  if (status === "PENDING" || status === "PROCESSING") {
    return (
      <div className="flex items-center gap-3">
        <span
          role="status"
          aria-label={WAITING_LABEL[status]}
          className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
        />
        <p className="text-sm">{WAITING_LABEL[status]}</p>
      </div>
    );
  }

  if (status === "DONE") {
    return <p className="text-sm">Analysis complete.</p>;
  }

  return <p className="text-sm text-destructive">{errorMessage ?? "Analysis failed."}</p>;
}
