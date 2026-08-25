import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    push.mockClear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders the login form", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows a loading state while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolveFetch: (value: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), "me@tonalys.dev");
    await user.type(screen.getByLabelText(/password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();

    resolveFetch!(new Response(null, { status: 200 }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("redirects to / when the password is correct", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 200 }));

    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), "me@tonalys.dev");
    await user.type(screen.getByLabelText(/password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("shows an error and stays on the page when the password is wrong", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));

    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), "me@tonalys.dev");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid password/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows an error and resets loading when the request fails outright", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), "me@tonalys.dev");
    await user.type(screen.getByLabelText(/password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).not.toBeDisabled();
  });

  it("disables the inputs while the request is in flight", async () => {
    const user = userEvent.setup();
    let resolveFetch: (value: Response) => void;
    vi.mocked(fetch).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    render(<LoginPage />);
    await user.type(screen.getByLabelText(/email/i), "me@tonalys.dev");
    await user.type(screen.getByLabelText(/password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/password/i)).toBeDisabled();

    resolveFetch!(new Response(null, { status: 200 }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });
});
