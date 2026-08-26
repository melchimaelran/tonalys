import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudioPlayer } from "./audio-player";

function getAudioElement(container: HTMLElement): HTMLAudioElement {
  return container.querySelector("audio") as HTMLAudioElement;
}

describe("AudioPlayer", () => {
  beforeEach(() => {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
  });

  it("renders a Play button and a seek slider", () => {
    render(<AudioPlayer src="/api/tracks/track-1/audio" />);

    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: /seek/i })).toBeInTheDocument();
  });

  it("plays the audio and shows a Pause button when Play is clicked", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);

    fireEvent.click(screen.getByRole("button", { name: /play/i }));

    expect(audio.play).toHaveBeenCalled();
    fireEvent.play(audio);
    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
  });

  it("pauses the audio and shows a Play button when Pause is clicked", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    fireEvent.play(audio);

    fireEvent.click(screen.getByRole("button", { name: /pause/i }));

    expect(audio.pause).toHaveBeenCalled();
    fireEvent.pause(audio);
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
  });

  it("seeks the audio when the slider is moved", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "duration", { value: 180, configurable: true });
    fireEvent.loadedMetadata(audio);

    fireEvent.change(screen.getByRole("slider", { name: /seek/i }), {
      target: { value: "42" },
    });

    expect(audio.currentTime).toBe(42);
  });

  it("updates the slider's range once the audio duration is known", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "duration", { value: 180, configurable: true });

    fireEvent.loadedMetadata(audio);

    expect(screen.getByRole("slider", { name: /seek/i })).toHaveAttribute("max", "180");
  });

  it("keeps the slider in sync with playback position", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "duration", { value: 180, configurable: true });
    fireEvent.loadedMetadata(audio);
    Object.defineProperty(audio, "currentTime", { value: 30, configurable: true });

    fireEvent.timeUpdate(audio);

    expect(screen.getByRole("slider", { name: /seek/i })).toHaveValue("30");
  });

  it("ignores a non-finite duration instead of setting an invalid slider max", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "duration", { value: Infinity, configurable: true });

    fireEvent.loadedMetadata(audio);

    expect(screen.getByRole("slider", { name: /seek/i })).toHaveAttribute("max", "0");
  });

  it("renders a speed selector defaulting to 1x", () => {
    render(<AudioPlayer src="/api/tracks/track-1/audio" />);

    expect(screen.getByRole("combobox", { name: /speed/i })).toHaveValue("1");
  });

  it("sets the audio's playbackRate when the speed is changed", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);

    fireEvent.change(screen.getByRole("combobox", { name: /speed/i }), {
      target: { value: "1.5" },
    });

    expect(audio.playbackRate).toBe(1.5);
  });

  it("preserves pitch when the speed changes, including vendor-prefixed browsers", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container) as HTMLAudioElement & {
      webkitPreservesPitch?: boolean;
      mozPreservesPitch?: boolean;
    };

    expect(audio.preservesPitch).toBe(true);
    expect(audio.webkitPreservesPitch).toBe(true);
    expect(audio.mozPreservesPitch).toBe(true);

    fireEvent.change(screen.getByRole("combobox", { name: /speed/i }), {
      target: { value: "0.5" },
    });

    expect(audio.preservesPitch).toBe(true);
  });

  it("captures the current time as point A when Set A is clicked, formatted as m:ss", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "currentTime", { value: 72.3, configurable: true });

    fireEvent.click(screen.getByRole("button", { name: /set a/i }));

    expect(screen.getByRole("button", { name: "A 1:12" })).toBeInTheDocument();
  });

  it("captures the current time as point B when Set B is clicked, formatted as m:ss", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "currentTime", { value: 45, configurable: true });

    fireEvent.click(screen.getByRole("button", { name: /set b/i }));

    expect(screen.getByRole("button", { name: "B 0:45" })).toBeInTheDocument();
  });

  it("disables the Loop toggle until both A and B are set", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);

    expect(screen.getByRole("button", { name: /reset/i })).toBeDisabled();

    Object.defineProperty(audio, "currentTime", { value: 10, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set a/i }));
    expect(screen.getByRole("button", { name: /reset/i })).toBeDisabled();

    Object.defineProperty(audio, "currentTime", { value: 20, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set b/i }));
    expect(screen.getByRole("button", { name: /reset/i })).not.toBeDisabled();
  });

  it("disables the Loop toggle when A is not before B", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);

    Object.defineProperty(audio, "currentTime", { value: 30, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set a/i }));
    Object.defineProperty(audio, "currentTime", { value: 20, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set b/i }));

    expect(screen.getByRole("button", { name: /reset/i })).toBeDisabled();
  });

  it("automatically activates the loop once B is set after a valid A", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "currentTime", { value: 10, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set a/i }));

    expect(screen.getByRole("button", { name: /reset/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    Object.defineProperty(audio, "currentTime", { value: 20, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set b/i }));

    expect(screen.getByRole("button", { name: /reset/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("does not auto-activate the loop when B is set before a valid A", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "currentTime", { value: 20, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set b/i }));

    expect(screen.getByRole("button", { name: /reset/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("auto-deactivates the loop if B is re-set below A while it was active", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "currentTime", { value: 20, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set a/i }));
    Object.defineProperty(audio, "currentTime", { value: 30, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set b/i }));

    expect(screen.getByRole("button", { name: /reset/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    Object.defineProperty(audio, "currentTime", { value: 10, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: "B 0:30" }));

    expect(screen.getByRole("button", { name: /reset/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("clears A and B and turns the loop off when the loop toggle is switched off", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "currentTime", { value: 10, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set a/i }));
    Object.defineProperty(audio, "currentTime", { value: 20, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set b/i }));

    const loopButton = screen.getByRole("button", { name: /reset/i });
    expect(loopButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(loopButton);

    expect(loopButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Set A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Set B" })).toBeInTheDocument();
  });

  it("jumps back to A once playback reaches B while the loop is active", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "currentTime", { value: 10, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set a/i }));
    Object.defineProperty(audio, "currentTime", { value: 20, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set b/i }));

    Object.defineProperty(audio, "currentTime", { value: 20, configurable: true, writable: true });
    fireEvent.timeUpdate(audio);

    expect(audio.currentTime).toBe(10);
  });

  it("does not jump back when B is re-set below A while the loop is active", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "currentTime", { value: 20, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set a/i }));
    Object.defineProperty(audio, "currentTime", { value: 30, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set b/i }));

    // Loop is now active (A=20, B=30). Re-marking B below A shouldn't leave
    // the loop jumping back forever the instant playback reaches the new B.
    Object.defineProperty(audio, "currentTime", { value: 10, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: "B 0:30" }));

    Object.defineProperty(audio, "currentTime", { value: 10, configurable: true, writable: true });
    fireEvent.timeUpdate(audio);

    expect(audio.currentTime).toBe(10);
  });

  it("stops jumping back once the loop is turned off", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "currentTime", { value: 10, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set a/i }));
    Object.defineProperty(audio, "currentTime", { value: 20, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set b/i }));
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));

    Object.defineProperty(audio, "currentTime", { value: 25, configurable: true });
    fireEvent.timeUpdate(audio);

    expect(audio.currentTime).toBe(25);
  });

  it("keeps looping correctly when the playback speed isn't 1x", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    fireEvent.change(screen.getByRole("combobox", { name: /speed/i }), {
      target: { value: "1.5" },
    });
    Object.defineProperty(audio, "currentTime", { value: 10, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set a/i }));
    Object.defineProperty(audio, "currentTime", { value: 20, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set b/i }));

    Object.defineProperty(audio, "currentTime", { value: 21, configurable: true, writable: true });
    fireEvent.timeUpdate(audio);

    expect(audio.currentTime).toBe(10);
    expect(audio.playbackRate).toBe(1.5);
  });

  it("marks A and B as vertical markers on the seek bar once each point is set", () => {
    const { container } = render(<AudioPlayer src="/api/tracks/track-1/audio" />);
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "duration", { value: 100, configurable: true });
    fireEvent.loadedMetadata(audio);

    expect(screen.queryByTestId("loop-marker-a")).not.toBeInTheDocument();
    expect(screen.queryByTestId("loop-marker-b")).not.toBeInTheDocument();

    Object.defineProperty(audio, "currentTime", { value: 20, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set a/i }));

    expect(screen.getByTestId("loop-marker-a")).toHaveStyle({ left: "20%" });
    expect(screen.queryByTestId("loop-marker-b")).not.toBeInTheDocument();

    Object.defineProperty(audio, "currentTime", { value: 50, configurable: true });
    fireEvent.click(screen.getByRole("button", { name: /set b/i }));

    expect(screen.getByTestId("loop-marker-b")).toHaveStyle({ left: "50%" });
  });

  it("calls onTimeUpdate with the current playback position", () => {
    const onTimeUpdate = vi.fn();
    const { container } = render(
      <AudioPlayer src="/api/tracks/track-1/audio" onTimeUpdate={onTimeUpdate} />,
    );
    const audio = getAudioElement(container);
    Object.defineProperty(audio, "currentTime", { value: 12.5, configurable: true });

    fireEvent.timeUpdate(audio);

    expect(onTimeUpdate).toHaveBeenCalledWith(12.5);
  });
});
