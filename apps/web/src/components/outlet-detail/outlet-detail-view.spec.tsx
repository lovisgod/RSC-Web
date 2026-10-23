import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OutletDetailView } from "./outlet-detail-view";

const mocks = vi.hoisted(() => ({ useOutletMenu: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/src/hooks/use-outlet-menu", () => ({ useOutletMenu: mocks.useOutletMenu }));
vi.mock("./menu-item-card", () => ({
  MenuItemCard: ({ item }: { item: { name: string } }) => <div>{item.name}</div>,
}));
vi.mock("./item-detail-modal", () => ({ ItemDetailModal: () => null }));

const menu = {
  outletName: "Test Kitchen",
  cuisines: [],
  image: "",
  headerColor: "transparent",
  isOnline: true,
  categories: [
    { id: "starters", name: "Starters" },
    { id: "mains", name: "Main Meals" },
  ],
  items: [
    { id: "rolls", categoryId: "starters", name: "Spring Rolls" },
    { id: "rice", categoryId: "mains", name: "Jollof Rice" },
  ],
};

describe("outlet category selection", () => {
  beforeEach(() => mocks.useOutletMenu.mockReturnValue({ data: menu }));

  it("shows only the first category and switches meals with the dropdown", () => {
    render(<OutletDetailView id="outlet" />);
    expect(screen.queryByRole("option", { name: "All" })).not.toBeInTheDocument();
    expect(screen.getByText("Spring Rolls")).toBeInTheDocument();
    expect(screen.queryByText("Jollof Rice")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Menu category" }));
    fireEvent.click(screen.getByRole("button", { name: "Main Meals" }));
    expect(screen.getByText("Jollof Rice")).toBeInTheDocument();
    expect(screen.queryByText("Spring Rolls")).not.toBeInTheDocument();
  });

  it("falls back when the selected category disappears after a refresh", () => {
    const { rerender } = render(<OutletDetailView id="outlet" />);
    fireEvent.click(screen.getByRole("button", { name: "Menu category" }));
    fireEvent.click(screen.getByRole("button", { name: "Main Meals" }));
    mocks.useOutletMenu.mockReturnValue({ data: { ...menu, categories: [menu.categories[0]] } });
    rerender(<OutletDetailView id="outlet" />);
    expect(screen.getByRole("button", { name: "Menu category" })).toHaveTextContent("Starters");
    expect(screen.queryByText("Jollof Rice")).not.toBeInTheDocument();
  });

  it("never falls back to all meals when categories are missing", () => {
    mocks.useOutletMenu.mockReturnValue({ data: { ...menu, categories: [] } });
    render(<OutletDetailView id="outlet" />);
    expect(screen.getByRole("button", { name: "Menu category" })).toBeDisabled();
    expect(screen.getByText("No menu categories available yet.")).toBeInTheDocument();
    expect(screen.queryByText("Spring Rolls")).not.toBeInTheDocument();
    expect(screen.queryByText("Jollof Rice")).not.toBeInTheDocument();
  });
});
