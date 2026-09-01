import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tooltip, TooltipTrigger, TooltipContent } from "./tooltip";

describe("Tooltip", () => {
  it("renders the trigger and its children as a button", () => {
    render(
      <Tooltip>
        <TooltipTrigger aria-label="More info">i</TooltipTrigger>
        <TooltipContent>Helpful text</TooltipContent>
      </Tooltip>,
    );

    expect(screen.getByRole("button", { name: /more info/i })).toBeInTheDocument();
  });

  it("keeps the content hidden until the trigger is interacted with", () => {
    render(
      <Tooltip>
        <TooltipTrigger aria-label="More info">i</TooltipTrigger>
        <TooltipContent>Helpful text</TooltipContent>
      </Tooltip>,
    );

    expect(screen.queryByText("Helpful text")).not.toBeInTheDocument();
  });

  it("reveals the content on hover", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip>
        <TooltipTrigger aria-label="More info" delay={0}>
          i
        </TooltipTrigger>
        <TooltipContent>Helpful text</TooltipContent>
      </Tooltip>,
    );

    await user.hover(screen.getByRole("button", { name: /more info/i }));

    await waitFor(() => expect(screen.getByText("Helpful text")).toBeInTheDocument());
  });

  it("reveals the content on keyboard focus", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip>
        <TooltipTrigger aria-label="More info">i</TooltipTrigger>
        <TooltipContent>Helpful text</TooltipContent>
      </Tooltip>,
    );

    await user.tab();

    await waitFor(() => expect(screen.getByText("Helpful text")).toBeInTheDocument());
  });
});
