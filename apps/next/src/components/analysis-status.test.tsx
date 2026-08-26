import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalysisStatus } from "./analysis-status";

describe("AnalysisStatus", () => {
  it("shows a spinner and waiting message while PENDING", () => {
    render(<AnalysisStatus status="PENDING" errorMessage={null} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/waiting to start/i)).toBeInTheDocument();
  });

  it("shows a spinner and progress message while PROCESSING", () => {
    render(<AnalysisStatus status="PROCESSING" errorMessage={null} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/analyzing/i)).toBeInTheDocument();
  });

  it("shows a completion message and no spinner when DONE", () => {
    render(<AnalysisStatus status="DONE" errorMessage={null} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
  });

  it("shows the error message and no spinner when ERROR", () => {
    render(<AnalysisStatus status="ERROR" errorMessage="Something broke" />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Something broke")).toBeInTheDocument();
  });

  it("falls back to a generic error message when ERROR has no errorMessage", () => {
    render(<AnalysisStatus status="ERROR" errorMessage={null} />);

    expect(screen.getByText(/analysis failed/i)).toBeInTheDocument();
  });
});
