import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import TrackPage from "./page";

describe("TrackPage", () => {
  it("renders an AudioPlayer pointed at the track's audio endpoint", async () => {
    const ui = await TrackPage({ params: Promise.resolve({ id: "track-1" }) });
    render(ui);

    const audio = document.querySelector("audio");
    expect(audio).toHaveAttribute("src", "/api/tracks/track-1/audio");
  });
});
