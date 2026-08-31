import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { AnalysisStatus } from "./analysis-status";

describe("AnalysisStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the first phase as active and a status region when PENDING", () => {
    render(<AnalysisStatus status="PENDING" errorMessage={null} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Detecting tempo")).toBeInTheDocument();
  });

  it("advances to the next phase after the first phase's duration elapses", () => {
    render(<AnalysisStatus status="PROCESSING" errorMessage={null} />);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByText("Identifying key")).toBeInTheDocument();
  });

  it("freezes on the last phase and never claims completion, however long it runs", () => {
    render(<AnalysisStatus status="PROCESSING" errorMessage={null} />);

    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(screen.getByText("Transcribing chords")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByText("Transcribing chords")).toBeInTheDocument();
  });

  it("stops advancing once the status becomes ERROR mid-analysis", () => {
    const { rerender } = render(<AnalysisStatus status="PROCESSING" errorMessage={null} />);
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByText("Identifying key")).toBeInTheDocument();

    rerender(<AnalysisStatus status="ERROR" errorMessage="boom" />);
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Transcribing chords")).not.toBeInTheDocument();
  });

  it("shows a completion message and no phase list when DONE", () => {
    render(<AnalysisStatus status="DONE" errorMessage={null} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
    expect(screen.queryByText("Detecting tempo")).not.toBeInTheDocument();
  });

  it("shows an alert with the error message and a retry button when ERROR", () => {
    const onRetry = vi.fn();
    render(<AnalysisStatus status="ERROR" errorMessage="Something broke" onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Something broke")).toBeInTheDocument();

    screen.getByRole("button", { name: /try again/i }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("falls back to a generic message when ERROR has no errorMessage", () => {
    render(<AnalysisStatus status="ERROR" errorMessage={null} />);

    expect(screen.getByText(/analysis failed/i)).toBeInTheDocument();
  });

  it("does not render a retry button when onRetry is not provided", () => {
    render(<AnalysisStatus status="ERROR" errorMessage="boom" />);

    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
  });
});
