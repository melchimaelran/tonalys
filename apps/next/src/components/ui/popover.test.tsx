import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";

function Fixture() {
  return (
    <Popover>
      <PopoverTrigger aria-label="More info">i</PopoverTrigger>
      <PopoverContent>Helpful text</PopoverContent>
    </Popover>
  );
}

describe("Popover", () => {
  it("renders the trigger and its children as a button", () => {
    render(<Fixture />);

    expect(screen.getByRole("button", { name: /more info/i })).toBeInTheDocument();
  });

  it("keeps the content hidden until the trigger is clicked", () => {
    render(<Fixture />);

    expect(screen.queryByText("Helpful text")).not.toBeInTheDocument();
  });

  it("shows the content on click and hides it again on a second click", async () => {
    const user = userEvent.setup();
    render(<Fixture />);
    const trigger = screen.getByRole("button", { name: /more info/i });

    await user.click(trigger);
    await waitFor(() => expect(screen.getByText("Helpful text")).toBeInTheDocument());

    await user.click(trigger);
    await waitFor(() =>
      expect(screen.queryByText("Helpful text")).not.toBeInTheDocument(),
    );
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Fixture />);

    await user.click(screen.getByRole("button", { name: /more info/i }));
    await waitFor(() => expect(screen.getByText("Helpful text")).toBeInTheDocument());

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByText("Helpful text")).not.toBeInTheDocument(),
    );
  });
});
