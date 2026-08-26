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
});
