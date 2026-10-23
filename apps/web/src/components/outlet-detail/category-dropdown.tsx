"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { MenuCategory } from "@/src/lib/data/outlet-menu";
import { labelClass } from "@/src/lib/form-styles";

export function CategoryDropdown({
  categories,
  selectedId,
  onSelect,
}: {
  categories: MenuCategory[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const labelId = useId();
  const selected = categories.find((category) => category.id === selectedId);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      const options = root.current?.querySelectorAll<HTMLButtonElement>("[data-category-option]");
      const index = Math.max(
        0,
        categories.findIndex((category) => category.id === selectedId),
      );
      options?.[index]?.focus();
    }
  }, [open, categories, selectedId]);

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      trigger.current?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (!open) {
      setOpen(true);
      return;
    }
    const options = Array.from(
      root.current?.querySelectorAll<HTMLButtonElement>("[data-category-option]") ?? [],
    );
    const index = options.findIndex((option) => option === document.activeElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? options.length - 1
          : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
    options[next]?.focus();
  }

  return (
    <div
      ref={root}
      className="outlet-category"
      onKeyDown={handleKeys}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <span id={labelId} className={labelClass}>
        Menu category
      </span>
      <button
        ref={trigger}
        type="button"
        className="outlet-category__trigger"
        aria-label="Menu category"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={categories.length === 0}
        onClick={() => setOpen(!open)}
      >
        <span>{selected?.name ?? "No categories available"}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && categories.length > 0 && (
        <div id={panelId} role="group" aria-labelledby={labelId} className="outlet-category__panel">
          {/* All is intentionally omitted. */}
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              data-category-option
              aria-pressed={category.id === selectedId}
              className="outlet-category__option"
              onClick={() => {
                onSelect(category.id);
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <span>{category.name}</span>
              {category.id === selectedId && (
                <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
