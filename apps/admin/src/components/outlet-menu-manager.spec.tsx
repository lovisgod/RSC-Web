import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@rsc/ui";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OutletMenuManager } from "./outlet-menu-manager";

const getOutletMock = vi.hoisted(() => vi.fn());

vi.mock("../lib/api", () => ({
  createItemModifier: vi.fn(),
  createItemModifierGroup: vi.fn(),
  createMenuCategory: vi.fn(),
  createMenuItem: vi.fn(),
  createPreparationSuggestion: vi.fn(),
  deleteItemModifier: vi.fn(),
  deleteItemModifierGroup: vi.fn(),
  deleteMenuCategory: vi.fn(),
  deleteMenuItem: vi.fn(),
  deletePreparationSuggestion: vi.fn(),
  getMenuItemById: vi.fn(),
  getOutlet: getOutletMock,
  listItemModifierGroups: vi.fn(),
  listPreparationSuggestions: vi.fn(),
  updateItemModifier: vi.fn(),
  updateItemModifierGroup: vi.fn(),
  updateMenuCategory: vi.fn(),
  updateMenuItem: vi.fn(),
  updateMenuItemAvailability: vi.fn(),
  uploadMenuItemImage: vi.fn(),
}));

const OUTLET_ID = "11111111-1111-4111-8111-111111111111";
const CATEGORY_ID = "22222222-2222-4222-8222-222222222222";
const LONG_ITEM_NAME = "Spicy Grilled Chicken Wings";
const LONG_CATEGORY_NAME = "Snacks and Grills";

function buildOutlet() {
  const items = Array.from({ length: 14 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    outletId: OUTLET_ID,
    categoryId: CATEGORY_ID,
    name: index === 0 ? LONG_ITEM_NAME : index === 1 ? "Jollof" : `Menu Item Number ${index + 1}`,
    description: null,
    imageUrl: null,
    priceMinor: 150_000,
    currentPriceMinor: 150_000,
    discountPriceMinor: null,
    isDiscountActive: false,
    isAvailable: true,
    sortOrder: index,
  }));

  return {
    id: OUTLET_ID,
    name: "Test Outlet",
    cuisineType: "Local",
    description: null,
    imageUrl: null,
    logoUrl: null,
    bannerUrl: null,
    isOnline: true,
    menuCategories: [
      {
        id: CATEGORY_ID,
        outletId: OUTLET_ID,
        name: LONG_CATEGORY_NAME,
        sortOrder: 0,
        isActive: true,
      },
    ],
    menuItems: items,
    itemModifierGroups: [],
    itemModifiers: [],
    menuItemModifierGroups: [],
  };
}

async function renderManager() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const view = render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <OutletMenuManager outletId={OUTLET_ID} />
      </QueryClientProvider>
    </ThemeProvider>,
  );

  await screen.findByText("Jollof");
  return view;
}

describe("OutletMenuManager", () => {
  beforeEach(() => {
    getOutletMock.mockReset();
    getOutletMock.mockResolvedValue(buildOutlet());
  });

  it("truncates item titles longer than 13 characters and reveals the full title on click", async () => {
    const { container } = await renderManager();

    const title = container.querySelector(
      `.admin-truncated-title[title="${LONG_ITEM_NAME}"]`,
    ) as HTMLElement;
    expect(title).not.toBeNull();
    expect(title.querySelector('[aria-hidden="true"]')?.textContent).toBe("Spicy Grilled…");

    fireEvent.click(title);
    expect(title.querySelector('[aria-hidden="true"]')?.textContent).toBe(LONG_ITEM_NAME);

    fireEvent.click(title);
    expect(title.querySelector('[aria-hidden="true"]')?.textContent).toBe("Spicy Grilled…");
  });

  it("leaves short item titles untouched", async () => {
    const { container } = await renderManager();

    expect(container.querySelector('.admin-truncated-title[title="Jollof"]')).toBeNull();
    expect(screen.getByText("Jollof")).toBeInTheDocument();
  });

  it("reveals the full category title on hover and click", async () => {
    await renderManager();
    fireEvent.click(screen.getByRole("button", { name: "Categories" }));

    const categoryTitle = screen.getByRole("button", { name: LONG_CATEGORY_NAME });
    expect(categoryTitle).toHaveAttribute("title", LONG_CATEGORY_NAME);
    expect(categoryTitle.querySelector('[aria-hidden="true"]')?.textContent).toBe("Snacks and Gr…");

    fireEvent.click(categoryTitle);
    expect(categoryTitle.querySelector('[aria-hidden="true"]')?.textContent).toBe(
      LONG_CATEGORY_NAME,
    );
  });

  it("filters items by name", async () => {
    await renderManager();

    fireEvent.change(screen.getByPlaceholderText("Search items by name"), {
      target: { value: "chicken" },
    });

    expect(await screen.findByText(LONG_ITEM_NAME)).toBeInTheDocument();
    expect(screen.queryByText("Jollof")).not.toBeInTheDocument();
    expect(screen.queryByText(/Menu Item Number/)).not.toBeInTheDocument();
  });

  it("shows an empty state when no item matches the search", async () => {
    await renderManager();

    fireEvent.change(screen.getByPlaceholderText("Search items by name"), {
      target: { value: "does-not-exist" },
    });

    expect(await screen.findByText("No items match your search")).toBeInTheDocument();
  });

  it("paginates the item grid", async () => {
    const { container } = await renderManager();

    expect(container.querySelectorAll(".admin-menu-item-card")).toHaveLength(12);
    expect(screen.getByText(/Showing 1-12 of 14 items/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(container.querySelectorAll(".admin-menu-item-card")).toHaveLength(2);
    expect(screen.getByText(/Showing 13-14 of 14 items/)).toBeInTheDocument();
    expect(screen.getByText("Menu Item Number 14")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(container.querySelectorAll(".admin-menu-item-card")).toHaveLength(12);
  });
});
