import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "@rsc/ui";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authStore } from "../stores/auth-store";
import { LoginPage } from "./login-page";

const loginMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  login: loginMock,
}));

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<h1>Admin dashboard</h1>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
    authStore.setUser(null);
  });

  it("shows field validation errors without calling the API", () => {
    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByText("Email or phone is required")).toBeInTheDocument();
    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("persists the authenticated admin and redirects to the dashboard", async () => {
    loginMock.mockResolvedValue({
      user: { id: "admin-1", role: "SUPER_ADMIN", outletId: null },
    });
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email or phone"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await screen.findByRole("heading", { name: "Admin dashboard" });
    await waitFor(() => {
      expect(authStore.getUser()).toEqual({ id: "admin-1", role: "SUPER_ADMIN", outletId: null });
    });
    expect(loginMock).toHaveBeenCalledWith({
      identifier: "admin@example.com",
      password: "correct-password",
    });
  });

  it("blocks outlet admin users from accessing central admin", async () => {
    loginMock.mockResolvedValue({
      user: { id: "outlet-admin-1", role: "ADMIN", outletId: "outlet-uuid-1" },
    });
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email or phone"), {
      target: { value: "outletadmin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(
        screen.getByText("Access denied. Outlet administrators cannot access Central Operations."),
      ).toBeInTheDocument();
    });
    expect(authStore.getUser()).toBeNull();
  });

  it("blocks customer users from accessing central admin", async () => {
    loginMock.mockResolvedValue({
      user: { id: "customer-1", role: "CUSTOMER", outletId: null },
    });
    renderLogin();

    fireEvent.change(screen.getByLabelText("Email or phone"), {
      target: { value: "customer@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(
        screen.getByText("Access denied. Only central platform administrators can log in here."),
      ).toBeInTheDocument();
    });
    expect(authStore.getUser()).toBeNull();
  });
});
