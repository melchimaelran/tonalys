import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChordEditForm } from "./chord-edit-form";

describe("ChordEditForm", () => {
  it("initializes the root and chord type selects from the given chord", () => {
    render(
      <ChordEditForm
        root="C"
        chordType="major"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox", { name: /root/i })).toHaveValue("C");
    expect(screen.getByRole("combobox", { name: /chord type/i })).toHaveValue("major");
  });

  it("calls onSave with the edited root and chord type when Save is clicked", () => {
    const onSave = vi.fn();
    render(<ChordEditForm root="C" chordType="major" onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByRole("combobox", { name: /root/i }), {
      target: { value: "G" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /chord type/i }), {
      target: { value: "minor" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith("G", "minor");
  });

  it("disables the Save button while saving is in progress", () => {
    render(
      <ChordEditForm
        root="C"
        chordType="major"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        isSaving
      />,
    );

    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(<ChordEditForm root="C" chordType="major" onSave={vi.fn()} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalled();
  });
});
