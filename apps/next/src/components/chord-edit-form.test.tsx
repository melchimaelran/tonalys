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

    expect(onSave).toHaveBeenCalledWith("G", "minor", null);
  });

  it("offers the full common chord type vocabulary, not just major/minor", () => {
    render(<ChordEditForm root="C" chordType="major" onSave={vi.fn()} onCancel={vi.fn()} />);

    const chordTypeSelect = screen.getByRole("combobox", { name: /chord type/i });
    ["dim", "aug", "sus2", "sus4", "7", "maj7", "9", "maj9", "add9"].forEach((type) => {
      expect(
        Array.from(chordTypeSelect.querySelectorAll("option")).map((o) => o.getAttribute("value")),
      ).toContain(type);
    });
  });

  it("defaults the bass note to 'none' (no slash) when the chord has none", () => {
    render(<ChordEditForm root="C" chordType="major" onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: /bass note/i })).toHaveValue("");
  });

  it("initializes the bass note select from a given slash chord", () => {
    render(
      <ChordEditForm
        root="C"
        chordType="major"
        bassNote="F"
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("combobox", { name: /bass note/i })).toHaveValue("F");
  });

  it("calls onSave with the chosen bass note for a slash chord", () => {
    const onSave = vi.fn();
    render(<ChordEditForm root="C" chordType="major" onSave={onSave} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByRole("combobox", { name: /bass note/i }), {
      target: { value: "F" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith("C", "major", "F");
  });

  it("calls onSave with a null bass note when 'none' is re-selected", () => {
    const onSave = vi.fn();
    render(
      <ChordEditForm
        root="C"
        chordType="major"
        bassNote="F"
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: /bass note/i }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onSave).toHaveBeenCalledWith("C", "major", null);
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
