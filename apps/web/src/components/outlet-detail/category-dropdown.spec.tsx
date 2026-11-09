import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CategoryDropdown } from "./category-dropdown";

describe("CategoryDropdown", () => {
  it("keeps touch options available when focus leaves without a related target", () => {
    const onSelect = vi.fn();

    render(
      <CategoryDropdown
        categories={[
          { id: "breakfast", name: "Breakfast (Eggs & Omelettes)" },
          { id: "mains", name: "Main Meals" },
        ]}
        selectedId="breakfast"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu category" }));
    fireEvent.blur(document.querySelector(".outlet-category")!);
    fireEvent.click(screen.getByRole("button", { name: "Main Meals" }));

    expect(onSelect).toHaveBeenCalledWith("mains");
  });
});
