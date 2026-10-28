#!/usr/bin/env python3
"""Generate the Taste of Naija menu seed data from the TASTE OF NAIJA.xlsx workbook.

Run locally:
    python3 apps/api/src/database/generate-taste-of-naija-seed.py

Outputs:
    apps/api/src/database/seeds/taste-of-naija-menu.json
    apps/api/src/database/seeds/taste-of-naija-menu.data.ts
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

import openpyxl

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
SEEDS_DIR = os.path.join(REPO_ROOT, "apps", "api", "src", "database", "seeds")
OUTPUT_JSON_PATH = os.path.join(SEEDS_DIR, "taste-of-naija-menu.json")
CLOUDINARY_MAP_PATH = os.path.join(SEEDS_DIR, "taste-of-naija-cloudinary-urls.json")

EXCEL_PATH = os.environ.get(
    "TASTE_OF_NAIJA_EXCEL_PATH",
    "/Users/justin/Desktop/DO/TASTE OF NAIJA.xlsx",
)

OUTLET_ID = "14122d88-0eea-4462-a862-85bc4c293d6b"
OUTLET_NAME = "Taste of Naija"

FOOD_SHEET = "SHEET 1"


def load_url_map() -> dict[str, str]:
    if not os.path.exists(CLOUDINARY_MAP_PATH):
        return {}
    try:
        with open(CLOUDINARY_MAP_PATH) as handle:
            raw = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {}
    return {key: value for key, value in raw.items() if isinstance(value, str)}


# ---------------------------------------------------------------------------
# Text helpers
# ---------------------------------------------------------------------------

LOWERCASE_WORDS = {
    "a", "an", "and", "at", "by", "de", "du", "for",
    "in", "la", "le", "of", "on", "or", "the", "to", "with",
}


def clean_title(raw: str) -> str:
    stripped = re.sub(r"\s+", " ", raw or "").strip()
    if not stripped:
        return ""
    words: list[str] = []
    for index, word in enumerate(stripped.split(" ")):
        if word in {"&", "-", "/"}:
            words.append(word)
            continue
        lowered = word.lower()
        if index > 0 and lowered in LOWERCASE_WORDS:
            words.append(lowered)
            continue
        words.append(word[:1].upper() + word[1:].lower())
    title = re.sub(r"\s+", " ", " ".join(words)).strip()
    return title[:1].upper() + title[1:]


def clean_desc(raw: str) -> str:
    text = re.sub(r"\s+", " ", raw or "").strip()
    if not text:
        return ""
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"\s+-\s+", "-", text)
    text = re.sub(r"\s*,\s*", ", ", text)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\. ([a-z])", lambda m: f". {m.group(1).upper()}", text)
    return text[:1].upper() + text[1:]


def naira_to_minor(value: Any) -> int:
    if value is None:
        return 0
    if isinstance(value, str):
        cleaned = value.strip().replace(",", "").replace(" ", "")
        if not cleaned:
            return 0
        try:
            value = float(cleaned)
        except ValueError:
            return 0
    return int(round(float(value) * 100))


# ---------------------------------------------------------------------------
# Image mapping — explicit override table keyed by item name -> relative path
# ---------------------------------------------------------------------------

IMAGE_OVERRIDES: dict[str, str | None] = {
    "Beef Samosa": "STARTERS/SAMOSA.jpg",
    "Spring Rolls": "STARTERS/SPRING ROLLS.jpg",
    "Peppered Snails": "STARTERS/PEPPERED SNAILS.jpg",
    "Peppered Goat Meat": "STARTERS/PEPPERED GOAT MEAT.jpg",
    "BD Combo": "STARTERS/BD COMBO.jpg",
    "Fish Pepper Soup": "STARTERS/FISH SOUP.jpg",
    "Goat Meat Pepper Soup": "STARTERS/GOAT PEPPER SOUP.jpg",
    "Edikang Ikong": "CLASSIC NIGERIAN SOUPS/EDIKANG IKONG.jpg",
    "Ogbono": "CLASSIC NIGERIAN SOUPS/OGBONO.jpg",
    "Afang": "CLASSIC NIGERIAN SOUPS/AFANG.jpg",
    "Bitter Leaf": "CLASSIC NIGERIAN SOUPS/BITTER LEAF.jpg",
    "Egusi": "CLASSIC NIGERIAN SOUPS/EGUSSI.jpg",
    "Okro": "CLASSIC NIGERIAN SOUPS/OKRO.jpg",
    "Efo Riro": "CLASSIC NIGERIAN SOUPS/EFORIRO.jpg",
    "Oha": "CLASSIC NIGERIAN SOUPS/OHA.jpg",
    "Chicken Jollof Spaghetti": "SIGNATURE TOUCH/CHICKEN JOLLOF SPAGHETTI.jpg",
    "Seafood Okro": "SIGNATURE TOUCH/SEAFOOD OKRO.jpg",
    "Seafood Egusi": "SIGNATURE TOUCH/SEAFOOD EGUSSI.jpg",
    "Prawns Efo Riro": "SIGNATURE TOUCH/PRAWNS EFO RIRO.jpg",
    "Ofada Stew with White Rice": "SIGNATURE TOUCH/OFADA STEW WITH WHITE RICE.jpg",
    "Fish Stew": "TRADITIONAL NIGERIAN DISHES/FISH STEW.jpg",
    "Beef Stew": "TRADITIONAL NIGERIAN DISHES/BEEF STEW.jpg",
    "Goat Meat Stew": "TRADITIONAL NIGERIAN DISHES/GOAT MEAT STEW.jpg",
    "Chicken Stew": "TRADITIONAL NIGERIAN DISHES/CHICKEN STEW.jpg",
    "Diamond Chicken": "TRADITIONAL NIGERIAN DISHES/DIAMOND CHICKEN.jpg",
}


def match_image(item_name: str, url_map: dict[str, str]) -> str | None:
    relative = IMAGE_OVERRIDES.get(item_name)
    if relative is None:
        return None
    for key in (relative, os.path.basename(relative), os.path.basename(relative).lower()):
        if key in url_map:
            return url_map[key]
    return None


# ---------------------------------------------------------------------------
# Build menu data
# ---------------------------------------------------------------------------


def build_menu(url_map: dict[str, str]) -> dict[str, Any]:
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb[FOOD_SHEET]

    def cv(row: int, col: int) -> Any:
        v = ws.cell(row=row, column=col).value
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    def ct(row: int, col: int) -> str:
        v = cv(row, col)
        return re.sub(r"\s+", " ", str(v)).strip() if v is not None else ""

    # --- Starters (rows 5-9 + pepper soups rows 11-12) ---
    pepper_soup_desc = "Traditional Nigerian spicy broth prepared with aromatic herbs and spices."
    starters: list[dict[str, Any]] = [
        {
            "name": "Beef Samosa",
            "description": clean_desc(ct(5, 12)),
            "priceMinor": naira_to_minor(cv(5, 19)),
            "imageUrl": match_image("Beef Samosa", url_map),
            "isAvailable": True,
            "modifierGroupRefs": [],
        },
        {
            "name": "Spring Rolls",
            "description": clean_desc(ct(6, 12)),
            "priceMinor": naira_to_minor(cv(6, 19)),
            "imageUrl": match_image("Spring Rolls", url_map),
            "isAvailable": True,
            "modifierGroupRefs": [],
        },
        {
            "name": "Peppered Snails",
            "description": clean_desc(ct(7, 12)),
            "priceMinor": naira_to_minor(cv(7, 19)),
            "imageUrl": match_image("Peppered Snails", url_map),
            "isAvailable": True,
            "modifierGroupRefs": [],
        },
        {
            "name": "Peppered Goat Meat",
            "description": clean_desc(ct(8, 12)),
            "priceMinor": naira_to_minor(cv(8, 19)),
            "imageUrl": match_image("Peppered Goat Meat", url_map),
            "isAvailable": True,
            "modifierGroupRefs": [],
        },
        {
            "name": "BD Combo",
            "description": clean_desc(ct(9, 12)),
            "priceMinor": naira_to_minor(cv(9, 19)),
            "imageUrl": match_image("BD Combo", url_map),
            "isAvailable": True,
            "modifierGroupRefs": [],
        },
        {
            "name": "Fish Pepper Soup",
            "description": pepper_soup_desc,
            "priceMinor": naira_to_minor(cv(11, 19)),
            "imageUrl": match_image("Fish Pepper Soup", url_map),
            "isAvailable": True,
            "modifierGroupRefs": [],
        },
        {
            "name": "Goat Meat Pepper Soup",
            "description": pepper_soup_desc,
            "priceMinor": naira_to_minor(cv(12, 19)),
            "imageUrl": match_image("Goat Meat Pepper Soup", url_map),
            "isAvailable": True,
            "modifierGroupRefs": [],
        },
    ]

    # --- Classic Nigerian Soups (rows 15-22, shared price row 15) ---
    soup_desc = (
        "Served with your choice of beef, fish, or chicken, and one accompaniment: "
        "Garri, Pounded Yam, Semo, or White Rice."
    )
    soup_price = naira_to_minor(cv(15, 19))
    soup_names = [
        (15, "Edikang Ikong"),
        (16, "Ogbono"),
        (17, "Afang"),
        (18, "Bitter Leaf"),
        (19, "Egusi"),
        (20, "Okro"),
        (21, "Efo Riro"),
        (22, "Oha"),
    ]
    soups: list[dict[str, Any]] = [
        {
            "name": name,
            "description": soup_desc,
            "priceMinor": soup_price,
            "imageUrl": match_image(name, url_map),
            "isAvailable": True,
            "modifierGroupRefs": ["Soup Protein Choice", "Soup Accompaniment Choice"],
        }
        for _, name in soup_names
    ]

    # --- Signature Touch (rows 32-36) ---
    signature_rows = [
        (32, "Chicken Jollof Spaghetti"),
        (33, "Seafood Okro"),
        (34, "Seafood Egusi"),
        (35, "Prawns Efo Riro"),
        (36, "Ofada Stew with White Rice"),
    ]
    signature: list[dict[str, Any]] = [
        {
            "name": name,
            "description": clean_desc(ct(row, 12)),
            "priceMinor": naira_to_minor(cv(row, 19)),
            "imageUrl": match_image(name, url_map),
            "isAvailable": True,
            "modifierGroupRefs": [],
        }
        for row, name in signature_rows
    ]

    # --- Traditional Nigerian Dishes (rows 38-42) ---
    traditional_rows = [
        (38, "Fish Stew"),
        (39, "Beef Stew"),
        (40, "Goat Meat Stew"),
        (41, "Chicken Stew"),
        (42, "Diamond Chicken"),
    ]
    traditional: list[dict[str, Any]] = [
        {
            "name": name,
            "description": clean_desc(ct(row, 12)),
            "priceMinor": naira_to_minor(cv(row, 19)),
            "imageUrl": match_image(name, url_map),
            "isAvailable": True,
            "modifierGroupRefs": ["Main Dish Side Choice"],
        }
        for row, name in traditional_rows
    ]

    # --- Modifier groups ---
    modifier_groups: list[dict[str, Any]] = [
        {
            "name": "Soup Protein Choice",
            "minSelections": 1,
            "maxSelections": 1,
            "isRequired": True,
            "modifiers": [
                {"name": "Beef", "priceDeltaMinor": 0},
                {"name": "Fish", "priceDeltaMinor": 0},
                {"name": "Chicken", "priceDeltaMinor": 0},
            ],
        },
        {
            "name": "Soup Accompaniment Choice",
            "minSelections": 1,
            "maxSelections": 1,
            "isRequired": True,
            "modifiers": [
                {"name": "Garri", "priceDeltaMinor": 0},
                {"name": "Pounded Yam", "priceDeltaMinor": 0},
                {"name": "Semo", "priceDeltaMinor": 0},
                {"name": "White Rice", "priceDeltaMinor": 0},
            ],
        },
        {
            "name": "Soup Protein Add-on",
            "minSelections": 0,
            "maxSelections": 5,
            "isRequired": False,
            "modifiers": [
                {"name": "Extra Fish", "priceDeltaMinor": 650000},
                {"name": "Extra Chicken", "priceDeltaMinor": 650000},
                {"name": "Extra Beef", "priceDeltaMinor": 650000},
                {"name": "Extra Goat Meat", "priceDeltaMinor": 650000},
                {"name": "Extra Shrimp", "priceDeltaMinor": 950000},
            ],
        },
        {
            "name": "Extra Swallow",
            "minSelections": 0,
            "maxSelections": 1,
            "isRequired": False,
            "modifiers": [
                {"name": "Extra Garri", "priceDeltaMinor": 900000},
                {"name": "Extra Pounded Yam", "priceDeltaMinor": 900000},
                {"name": "Extra Semo", "priceDeltaMinor": 900000},
            ],
        },
        {
            "name": "Main Dish Side Choice",
            "minSelections": 1,
            "maxSelections": 1,
            "isRequired": True,
            "modifiers": [
                {"name": "French Fries", "priceDeltaMinor": 0},
                {"name": "White Rice", "priceDeltaMinor": 0},
                {"name": "Fried Rice", "priceDeltaMinor": 0},
                {"name": "Jollof Rice", "priceDeltaMinor": 0},
                {"name": "Basmati Rice", "priceDeltaMinor": 0},
                {"name": "Mashed Potatoes", "priceDeltaMinor": 0},
                {"name": "Yam Fries", "priceDeltaMinor": 0},
                {"name": "Fried Plantain", "priceDeltaMinor": 0},
                {"name": "Sauteed Spaghetti", "priceDeltaMinor": 0},
            ],
        },
    ]

    categories = [
        {
            "name": "Starters",
            "sortOrder": 0,
            "isActive": True,
            "items": [{"sortOrder": i, **it} for i, it in enumerate(starters)],
        },
        {
            "name": "Classic Nigerian Soups",
            "sortOrder": 1,
            "isActive": True,
            "items": [{"sortOrder": i, **it} for i, it in enumerate(soups)],
        },
        {
            "name": "Signature Touch",
            "sortOrder": 2,
            "isActive": True,
            "items": [{"sortOrder": i, **it} for i, it in enumerate(signature)],
        },
        {
            "name": "Traditional Nigerian Dishes",
            "sortOrder": 3,
            "isActive": True,
            "items": [{"sortOrder": i, **it} for i, it in enumerate(traditional)],
        },
    ]

    return {
        "outletId": OUTLET_ID,
        "outletName": OUTLET_NAME,
        "modifierGroups": modifier_groups,
        "categories": categories,
    }


def write_ts(data: dict[str, Any], ts_path: str) -> None:
    with open(ts_path, "w") as f:
        f.write("// Auto-generated Taste of Naija menu seed data — do not edit by hand.\n")
        f.write("// Re-generate: python3 apps/api/src/database/generate-taste-of-naija-seed.py\n\n")
        f.write("export interface TasteOfNaijaSeedData {\n")
        f.write("  outletId: string;\n")
        f.write("  outletName: string;\n")
        f.write("  modifierGroups: Array<{\n")
        f.write("    name: string;\n")
        f.write("    minSelections: number;\n")
        f.write("    maxSelections: number;\n")
        f.write("    isRequired: boolean;\n")
        f.write("    modifiers: Array<{ name: string; priceDeltaMinor: number }>;\n")
        f.write("  }>;\n")
        f.write("  categories: Array<{\n")
        f.write("    name: string;\n")
        f.write("    sortOrder: number;\n")
        f.write("    isActive: boolean;\n")
        f.write("    items: Array<{\n")
        f.write("      name: string;\n")
        f.write("      description: string | null;\n")
        f.write("      priceMinor: number;\n")
        f.write("      imageUrl: string | null;\n")
        f.write("      isAvailable: boolean;\n")
        f.write("      sortOrder: number;\n")
        f.write("      modifierGroupRefs: string[];\n")
        f.write("    }>;\n")
        f.write("  }>;\n")
        f.write("}\n\n")
        f.write("export const tasteOfNaijaMenuData: TasteOfNaijaSeedData = ")
        json.dump(data, f, indent=2)
        f.write(";\n")


def main() -> None:
    url_map = load_url_map()
    data = build_menu(url_map)

    os.makedirs(SEEDS_DIR, exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w") as f:
        json.dump(data, f, indent=2)

    ts_path = OUTPUT_JSON_PATH.replace(".json", ".data.ts")
    write_ts(data, ts_path)

    total_items = sum(len(c["items"]) for c in data["categories"])
    items_with_images = sum(
        1
        for c in data["categories"]
        for it in c["items"]
        if it["imageUrl"] is not None
    )

    print("✅  Taste of Naija seed generated")
    print(f"   Categories     : {len(data['categories'])}")
    print(f"   Total items    : {total_items}")
    print(f"   With images    : {items_with_images}")
    print(f"   Modifier groups: {len(data['modifierGroups'])}")
    print(f"   JSON  -> {OUTPUT_JSON_PATH}")
    print(f"   TS    -> {ts_path}")


if __name__ == "__main__":
    main()
