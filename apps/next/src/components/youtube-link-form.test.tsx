import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { YoutubeLinkForm } from "./youtube-link-form";

describe("YoutubeLinkForm", () => {
  it("renders a URL input with a placeholder", () => {
    render(<YoutubeLinkForm />);

    const input = screen.getByLabelText(/youtube link/i);
    expect(input).toHaveAttribute("type", "url");
    expect(input).toHaveAttribute("placeholder", "https://www.youtube.com/watch?v=...");
  });

  it("rejects a non-YouTube URL and shows an error", () => {
    const onUrlSubmitted = vi.fn();
    render(<YoutubeLinkForm onUrlSubmitted={onUrlSubmitted} />);

    fireEvent.change(screen.getByLabelText(/youtube link/i), {
      target: { value: "https://example.com/not-youtube" },
    });
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    expect(onUrlSubmitted).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a valid youtube video url/i)).toBeInTheDocument();
  });

  it("rejects free text that isn't a URL at all", () => {
    const onUrlSubmitted = vi.fn();
    render(<YoutubeLinkForm onUrlSubmitted={onUrlSubmitted} />);

    fireEvent.change(screen.getByLabelText(/youtube link/i), {
      target: { value: "not a url" },
    });
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    expect(onUrlSubmitted).not.toHaveBeenCalled();
    expect(screen.getByText(/enter a valid youtube video url/i)).toBeInTheDocument();
  });

  it("accepts a standard youtube.com/watch URL", () => {
    const onUrlSubmitted = vi.fn();
    render(<YoutubeLinkForm onUrlSubmitted={onUrlSubmitted} />);

    fireEvent.change(screen.getByLabelText(/youtube link/i), {
      target: { value: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    });
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    expect(onUrlSubmitted).toHaveBeenCalledWith(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(screen.queryByText(/enter a valid youtube video url/i)).not.toBeInTheDocument();
  });

  it("accepts a shortened youtu.be URL", () => {
    const onUrlSubmitted = vi.fn();
    render(<YoutubeLinkForm onUrlSubmitted={onUrlSubmitted} />);

    fireEvent.change(screen.getByLabelText(/youtube link/i), {
      target: { value: "https://youtu.be/dQw4w9WgXcQ" },
    });
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    expect(onUrlSubmitted).toHaveBeenCalledWith("https://youtu.be/dQw4w9WgXcQ");
  });

  it("trims surrounding whitespace before validating and submitting", () => {
    const onUrlSubmitted = vi.fn();
    render(<YoutubeLinkForm onUrlSubmitted={onUrlSubmitted} />);

    fireEvent.change(screen.getByLabelText(/youtube link/i), {
      target: { value: "  https://youtu.be/dQw4w9WgXcQ  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /analyze/i }));

    expect(onUrlSubmitted).toHaveBeenCalledWith("https://youtu.be/dQw4w9WgXcQ");
  });

  it("clears a previous error once a valid URL is submitted", () => {
    const onUrlSubmitted = vi.fn();
    render(<YoutubeLinkForm onUrlSubmitted={onUrlSubmitted} />);
    const input = screen.getByLabelText(/youtube link/i);
    const submit = screen.getByRole("button", { name: /analyze/i });

    fireEvent.change(input, { target: { value: "not a url" } });
    fireEvent.click(submit);
    expect(screen.getByText(/enter a valid youtube video url/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "https://youtu.be/dQw4w9WgXcQ" } });
    fireEvent.click(submit);

    expect(screen.queryByText(/enter a valid youtube video url/i)).not.toBeInTheDocument();
    expect(onUrlSubmitted).toHaveBeenCalledWith("https://youtu.be/dQw4w9WgXcQ");
  });
});
