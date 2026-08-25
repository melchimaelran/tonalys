import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryProvider } from "./query-provider";

describe("QueryProvider", () => {
  it("renders its children", () => {
    render(
      <QueryProvider>
        <p>content</p>
      </QueryProvider>,
    );

    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
