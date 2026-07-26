import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignInForm } from "./sign-in-form";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  signIn: vi.fn(),
  claimCartOwner: vi.fn(),
  reconcileOwner: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/src/lib/api", () => ({
  apiClient: {
    login: mocks.login,
    logout: mocks.logout,
  },
}));

vi.mock("@/src/stores/auth-store", () => ({
  useAuthStore: (selector: (state: { signIn: typeof mocks.signIn }) => unknown) =>
    selector({ signIn: mocks.signIn }),
}));

vi.mock("@/src/stores/cart-store", () => ({
  useCartStore: (
    selector: (state: {
      claimActiveSessionOwner: typeof mocks.claimCartOwner;
      reconcileOwner: typeof mocks.reconcileOwner;
    }) => unknown,
  ) =>
    selector({
      claimActiveSessionOwner: mocks.claimCartOwner,
      reconcileOwner: mocks.reconcileOwner,
    }),
}));

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SignInForm />
    </QueryClientProvider>,
  );
}

describe("SignInForm", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  it("shows required field errors without calling the API", async () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Log In" }));

    expect(await screen.findByText("Email or phone number is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("rejects an admin account and cleans up its customer-portal session", async () => {
    mocks.login.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN" },
    });
    mocks.logout.mockResolvedValue({});
    renderForm();

    fireEvent.change(screen.getByPlaceholderText("you@example.com or 0803…"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "correct-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log In" }));

    expect(
      await screen.findByText("Use the correct admin or rider portal for this account."),
    ).toBeInTheDocument();
    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
});
