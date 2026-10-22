#!/usr/bin/env python3
"""Generate the Salmas menu seed data from the SALMA MENU 2026 workbook.

The workbook is the source of truth. Every category and item below maps to an
explicit range of worksheet rows so the generated seed stays reviewable.

Run locally (needs the workbook and the image folder):

    python3 apps/api/src/database/generate-salmas-seed.py

Outputs:
    apps/api/src/database/seeds/salmas-menu.json
    apps/api/src/database/seeds/salmas-menu.data.ts
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from typing import Any

import openpyxl

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
SEEDS_DIR = os.path.join(REPO_ROOT, "apps", "api", "src", "database", "seeds")
OUTPUT_JSON_PATH = os.path.join(SEEDS_DIR, "salmas-menu.json")
CLOUDINARY_MAP_PATH = os.path.join(SEEDS_DIR, "salmas-cloudinary-urls.json")


def load_url_map() -> dict[str, str]:
    """Delivered Cloudinary URLs for images that were already uploaded."""
    if not os.path.exists(CLOUDINARY_MAP_PATH):
        return {}
    try:
        with open(CLOUDINARY_MAP_PATH) as handle:
            raw = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return {}
    return {key: value for key, value in raw.items() if isinstance(value, str)}

EXCEL_PATH = os.environ.get(
    "SALMAS_EXCEL_PATH",
    "/Users/justin/Desktop/DO/SALMAS NEW QR/Copy of SALMA MENU 2026 1.xlsx",
)
IMAGES_ROOT = os.environ.get("SALMAS_IMAGES_ROOT", "/Users/justin/Desktop/DO/SALMAS NEW QR")

OUTLET_ID = "35b9e0d4-9616-42a9-9cd2-7c5cdd7a5741"
OUTLET_NAME = "Salmas"

FOOD_SHEET = "BREAKFAST & A LA CARTE"
DRINKS_SHEET = "BEVERAGES"
SHISHA_SHEET = "SHISHA BAR"

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".heic", ".webp")
PREFERRED_IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")

# Prices are read from the workbook without editorial overrides. In particular,
# explicit values such as the workbook's 750 for Hot Chocolate stay 750.
PRICE_OVERRIDES: dict[tuple[str, int], tuple[int, str]] = {}

# Photos the worksheet never references but that clearly belong to an item.
# The key is the final item name.
IMAGE_OVERRIDES: dict[str, str | None] = {
    "Citrus Rocca Halloumi Salad": "SALADS/CITRUS SALAD.jpg",
    "Rocca Beetroot & Feta Salad": "SALADS/ROCCA BEET.jpg",
    "Kaak Halloumi & Mozzarella": "BREAKFAST/KAAK.JPG",
    "Fatayer Bakli (Oven)": "BREAKFAST/FATAYER.JPG",
    "Shish Kabab": "GRILL/KABAB KHECHKHACH.jpg",
    "Chicken Shawarma Platter": "HOT MEZZE/HOMMOS PESTO & CHICKEN SHAWARMA.jpg",
    "Beef or Chicken Shawarma (Platter)": "HOT MEZZE/HOMMOS PESTO & CHICKEN SHAWARMA.jpg",
    # The only photos for these two are the wrong dish, so they ship without art.
    "Kafta (Sandwich)": None,
    "Soujouk (Sandwich)": None,
    "Soujouk (Platter)": None,
    "Kafta (Platter)": "GRILL/KAFTA.jpg",
    # The worksheet points both sambousek rows at the same photo.
    "Meat Samboussek": "PASTRIES/MEAT SAMBOUSSEK.jpg",
    "Cheese Samboussek": "PASTRIES/CHEESE SAMBOUSSEK.jpg",
}

# ---------------------------------------------------------------------------
# Text cleanup
# ---------------------------------------------------------------------------

# Explicit names. Keys are compared against the raw worksheet title.
TITLE_OVERRIDES: dict[str, str] = {
    "LABNEH - OPTION  GARLIC OR SPICY": "Labneh",
    "LABNEH - OPTION GARLIC OR SPICY": "Labneh",
    "HALF CHCIKEN": "Half Chicken",
    "WHOLE CHCIKEN": "Whole Chicken",
    "SALMA'S BURGER WARP": "Salma's Burger Wrap",
    "SALAM'S MANOUCHE": "Salma's Manouche",
    "SOUJOUK W BANADOURA": "Soujouk with Banadora",
    "GRILLED FISH-GROUPER": "Grilled Fish (Grouper)",
    "CHEF'S SAMKE HARRA- SPICY FISH": "Chef's Samke Harra",
    "FRIED QATAEF BEL ASHTA": "Fried Qatayef Bel Ashta",
    "KALLAJ LAYALI LEBNEN WITH VANILLA ICE CREAM": "Kallaj Layali Lebnen with Vanilla Ice Cream",
    "HALAWET HALAWI BEL JEBN": "Halawet Halawi Bel Jebn",
    "PISTACHIO AND OSSMALIEH ROLL": "Pistachio and Ossmalieh Roll",
    "TABLIYEH NAYEH SMALL": "Tabliyeh Nayeh (Small)",
    "TABLIYEH NAYEH LARGE": "Tabliyeh Nayeh (Large)",
    "MINERAL WATER SMALL": "Mineral Water (Small)",
    "MINERAL WATER LARGE": "Mineral Water (Large)",
    "ORIENTAL FRAPPUCCINO": "Oriental Frappuccino",
    "BLUE HAWALL": "Blue Hawaii",
    "GUINESS STOUT": "Guinness Stout",
    "MALTA GUINESS": "Malta Guinness",
    "DRAUGHT HENIEKEN": "Draught Heineken",
    "J.W BLACK LABEL": "Johnnie Walker Black Label",
    "J.W GREEN LABEL": "Johnnie Walker Green Label",
    "J.W GOLD LABEL": "Johnnie Walker Gold Label",
    "J.W BLUE LABEL": "Johnnie Walker Blue Label",
    "MOET AND CHANDON BRUT": "Moet & Chandon Brut",
    "MOET AND CHANDON ROSE": "Moet & Chandon Rose",
    "MOET AND CHANDON NECTAR": "Moet & Chandon Nectar",
    "DOM PERIGNON BRUT": "Dom Perignon Brut",
    "DOM PERIGNON ROSE": "Dom Perignon Rose",
    "LAURENT PERRIER BRUT": "Laurent-Perrier Brut",
    "LAURENT PERRIER ROSE": "Laurent-Perrier Rose",
    "VEUVE CLICQUOT BRUT": "Veuve Clicquot Brut",
    "VEUVE CLICQUOT ROSE": "Veuve Clicquot Rose",
    "M.D": "M.D.",
    "20/24": "20/24",
    "PER GLASS": "Arak by the Glass",
    "BY THE GLASS": "Prosecco by the Glass",
    "SOUR / SWEET": "Sour or Sweet",
    "GREEN FOUCS": "Green Focus",
    "PEOSECCO": "Prosecco",
    "JD'S LUST": "JD's Lust",
    "CARLITOS SECRET": "Carlito's Secret",
    "CARLITO'S WAY": "Carlito's Way",
    "BEEF NAIJAWARMA": "Beef Naijawarma",
    "AMARATTO SOUR": "Amaretto Sour",
    "MARTINI EXTRA DAY": "Martini Extra Dry",
    "MARY J BLIGE SUN GODNESS": "Mary J Blige Sun Goddess",
    "MARY J BLIGE SUN GODDNESS": "Mary J Blige Sun Goddess",
    "7UP": "7Up",
    "7UP FREE": "7Up Free",
    "DOM PERIGNON BRUT": "Dom Pérignon Brut",
    "DOM PERIGNON ROSE": "Dom Pérignon Rosé",
    "MOET AND CHANDON BRUT": "Moët & Chandon Brut",
    "MOET AND CHANDON ROSE": "Moët & Chandon Rosé",
    "MOET AND CHANDON NECTAR": "Moët & Chandon Nectar",
    "REMY MARTIN XO": "Rémy Martin XO",
    "REMY MARTIN VSOP": "Rémy Martin VSOP",
    "MARTEL VS": "Martell VS",
    "MARTEL VSOP": "Martell VSOP",
    "MARTEL XO": "Martell XO",
    "HENNESSY VS": "Hennessy VS",
    "HENNESSY VSOP": "Hennessy VSOP",
    "HENNESSY XO": "Hennessy XO",
    "CLASE AZUL ANEJO": "Clase Azul Añejo",
    "DON JULIO REPOSADOS": "Don Julio Reposado",
    "VEUVE CLICQUOT ROSE": "Veuve Clicquot Rosé",
    "LAURENT PERRIER ROSE": "Laurent-Perrier Rosé",
    "F.JEANTET COTES DU RHONE 2018": "F. Jeantet Cotes du Rhone 2018",
}

DESC_REPLACEMENTS: dict[str, str] = {
    "hommos": "hummos",
    "perfrct": "perfect",
    "prefrct": "perfect",
    "tooped": "topped",
    "pomegrenate": "pomegranate",
    "pomegrenate ": "pomegranate ",
    "gralic": "garlic",
    "enchanced": "enhanced",
    "chli sauce": "chili sauce",
    "bourghul": "bulgur",
    "pickels": "pickles",
    "toni water": "tonic water",
    "wih ": "with ",
    "cocnut": "coconut",
    "3cups": "3 cups",
    "2halawet": "2 halawet",
    "salam's": "salma's",
    "creme de coco": "creme de cocoa",
    "crème de coco": "creme de cocoa",
    "lemo": "lemon",
    "parsley tomato": "parsley, tomato",
    "debsremen": "debs remen",
    "sie": "sieve",
    "freshing": "refreshing",
    "bolezet": "bouzet",
    "flambeed": "flambeed",
    "debs remen": "debs remen",
    "middle eastern": "middle eastern",
    "served with": "served with",
}

# Words that stay lowercase inside a title.
LOWERCASE_WORDS = {
    "a",
    "an",
    "and",
    "at",
    "by",
    "de",
    "du",
    "for",
    "in",
    "la",
    "le",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
}

# Tokens that carry no meaning when matching an image file to an item name.
IMAGE_STOPWORDS = {
    "and",
    "the",
    "with",
    "salma",
    "salmas",
    "salma's",
    "special",
    "our",
    "of",
    "s",
}


def _title_word(word: str) -> str:
    if "'" in word:
        parts = word.split("'")
        rendered = []
        for part in parts:
            if len(part) <= 2 and part.isalpha():
                rendered.append(part.lower())
            else:
                rendered.append(part[:1].upper() + part[1:].lower())
        return "'".join(rendered)
    if "." in word:
        segments = [segment for segment in word.split(".") if segment]
        rendered = [segment[:1].upper() + segment[1:].lower() for segment in segments]
        joined = ". ".join(rendered)
        return f"{joined}." if word.endswith(".") else joined
    return word[:1].upper() + word[1:].lower()


def clean_title(raw: str) -> str:
    """Turn an all-caps worksheet title into a customer facing name."""
    stripped = re.sub(r"\s+", " ", raw or "").strip()
    if not stripped:
        return ""
    override = TITLE_OVERRIDES.get(stripped.upper())
    if override:
        return override

    words: list[str] = []
    for index, word in enumerate(stripped.split(" ")):
        if word in {"&", "-", "/"}:
            words.append(word)
            continue
        lowered = word.lower()
        if index > 0 and lowered in LOWERCASE_WORDS:
            words.append(lowered)
            continue
        words.append(_title_word(word))

    title = re.sub(r"\s+", " ", " ".join(words)).strip()
    title = title.replace(" ,", ",")
    title = re.sub(r"\s*,\s*", ", ", title)
    return title[:1].upper() + title[1:]


def _title_case_description(text: str) -> str:
    """Render an all-caps worksheet description as a readable sentence."""
    rendered: list[str] = []
    for index, word in enumerate(text.split(" ")):
        core = word.strip(",.;:()&")
        if core.isalpha() and core.isupper() and len(core) > 1:
            if index > 0 and core.lower() in LOWERCASE_WORDS:
                rendered.append(word.lower())
            else:
                rendered.append(word[:1].upper() + word[1:].lower())
        else:
            rendered.append(word)
    return " ".join(rendered)


def clean_desc(raw: str) -> str:
    """Normalise a worksheet description into a single clean sentence."""
    text = re.sub(r"\s+", " ", raw or "").strip()
    if not text:
        return ""
    for wrong, right in DESC_REPLACEMENTS.items():
        text = re.sub(rf"\b{re.escape(wrong)}\b", right, text, flags=re.IGNORECASE)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"\s+-\s+", "-", text)
    text = re.sub(r"\s*,\s*", ", ", text)
    text = re.sub(r"\s+", " ", text).strip()
    if not any(character.islower() for character in text):
        text = _title_case_description(text)
    text = re.sub(r"\. ([a-z])", lambda match: f". {match.group(1).upper()}", text)
    text = text[:1].upper() + text[1:]
    return text


def naira_to_minor(value: Any) -> int:
    """Salmas prices are written in whole Naira (16000 = N 16,000)."""
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


def format_naira(minor: int) -> str:
    return f"N{minor // 100:,}"


# ---------------------------------------------------------------------------
# Sheet helpers
# ---------------------------------------------------------------------------


def cell_value(ws: Any, row: int, column: int) -> Any:
    value = ws.cell(row=row, column=column).value
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def cell_text(ws: Any, row: int, column: int) -> str:
    value = cell_value(ws, row, column)
    if value is None or isinstance(value, (int, float)):
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


# ---------------------------------------------------------------------------
# Seed model
# ---------------------------------------------------------------------------


@dataclass
class Item:
    name: str
    price_minor: int
    description: str | None = None
    image_source: str | None = None
    modifier_group_refs: list[str] = field(default_factory=list)


@dataclass
class Category:
    name: str
    items: list[Item] = field(default_factory=list)


@dataclass
class Block:
    """A category backed by an explicit worksheet row range."""

    name: str
    sheet: str
    rows: list[int]
    suffix: str = ""
    skip: set[int] = field(default_factory=set)
    image_folder: str | None = None
    titles: dict[int, str] = field(default_factory=dict)
    descriptions: dict[int, str] = field(default_factory=dict)
    prices: dict[int, int] = field(default_factory=dict)
    image_overrides: dict[int, str | None] = field(default_factory=dict)
    modifier_refs: dict[int, list[str]] = field(default_factory=dict)
    description_append: dict[int, str] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Image resolution
# ---------------------------------------------------------------------------


class ImageIndex:
    def __init__(self, root: str) -> None:
        self.root = root
        self.by_relative_path: dict[str, str] = {}
        self.by_folder: dict[str, list[str]] = {}
        for dirpath, _dirnames, filenames in os.walk(root):
            for filename in filenames:
                if not filename.lower().endswith(IMAGE_EXTENSIONS):
                    continue
                absolute = os.path.join(dirpath, filename)
                relative = os.path.relpath(absolute, root)
                self.by_relative_path[relative.lower()] = relative
                folder = os.path.dirname(relative)
                self.by_folder.setdefault(folder.lower(), []).append(relative)

    def resolve(self, raw_path: str, item_name: str, folder_hint: str | None) -> str | None:
        if raw_path:
            relative = self._normalise(raw_path)
            if relative and relative.lower() in self.by_relative_path:
                return self._prefer_jpeg(relative.lower())
            if relative:
                sibling = self._sibling(relative)
                if sibling:
                    return sibling

        if folder_hint:
            match = self._match_in_folder(folder_hint, item_name)
            if match:
                return match

        return self._match_anywhere(item_name)

    def _normalise(self, raw_path: str) -> str:
        cleaned = raw_path.replace("\\", "/").strip()
        cleaned = re.sub(r"^\.\./", "", cleaned)
        cleaned = re.sub(r"^Desktop/", "", cleaned)
        cleaned = re.sub(r"^(?:\.\./)*SALMAS NEW QR/", "", cleaned, flags=re.IGNORECASE)
        cleaned = cleaned.lstrip("/")
        if not cleaned:
            return ""
        folder, _, filename = cleaned.rpartition("/")
        folder = folder.strip()
        if folder:
            return f"{folder}/{filename}"
        return filename

    def _prefer_jpeg(self, relative_lower: str) -> str:
        """Prefer a JPEG twin over the referenced HEIC/other format."""
        stem, extension = os.path.splitext(relative_lower)
        if extension in PREFERRED_IMAGE_EXTENSIONS:
            return self.by_relative_path[relative_lower]
        for candidate_extension in PREFERRED_IMAGE_EXTENSIONS:
            candidate = stem + candidate_extension
            if candidate in self.by_relative_path:
                return self.by_relative_path[candidate]
        # Some exports carry a "-2" suffix on the JPEG only.
        for candidate_extension in PREFERRED_IMAGE_EXTENSIONS:
            for suffix in ("-2", "-3", "-1"):
                candidate = stem + suffix + candidate_extension
                if candidate in self.by_relative_path:
                    return self.by_relative_path[candidate]
        return self.by_relative_path[relative_lower]

    def _sibling(self, relative: str) -> str | None:
        """Same folder and stem, different extension."""
        folder, _, filename = relative.rpartition("/")
        stem, _extension = os.path.splitext(filename.lower())
        if not stem:
            return None
        folder_prefix = f"{folder}/" if folder else ""
        candidates = [stem]
        candidates.extend(f"{stem}{suffix}" for suffix in ("-2", "-3", "-1"))
        for candidate_stem in candidates:
            for candidate_extension in PREFERRED_IMAGE_EXTENSIONS:
                candidate = f"{folder_prefix}{candidate_stem}{candidate_extension}"
                if candidate.lower() in self.by_relative_path:
                    return self.by_relative_path[candidate.lower()]
        return None

    def _match_in_folder(self, folder: str, item_name: str) -> str | None:
        candidates = self.by_folder.get(folder.lower(), [])
        return self._best_match(candidates, item_name, allow_single_token=True)

    def _match_anywhere(self, item_name: str) -> str | None:
        return self._best_match(list(self.by_relative_path.values()), item_name, allow_single_token=False)

    def _best_match(
        self, candidates: list[str], item_name: str, allow_single_token: bool
    ) -> str | None:
        """Match an item to a photo file.

        Only exact token matches are accepted, plus single word file names that
        repeat the last word of the item (TAOUK.jpg for "Shish Taouk"). A photo
        of the wrong dish is worse than no photo at all.
        """
        item_tokens = image_token_list(item_name)
        if not item_tokens:
            return None
        item_token_set = set(item_tokens)
        last_token = item_tokens[-1]

        best: tuple[int, str] | None = None
        for candidate in sorted(candidates):
            candidate_tokens = image_token_list(os.path.splitext(os.path.basename(candidate))[0])
            if not candidate_tokens:
                continue
            candidate_token_set = set(candidate_tokens)
            if candidate_token_set == item_token_set:
                score = 100
            elif (
                allow_single_token
                and len(candidate_token_set) == 1
                and candidate_token_set == {last_token}
            ):
                score = 50
            else:
                continue
            if best is None or score > best[0]:
                best = (score, candidate)
        return best[1] if best else None


def image_tokens(text: str) -> set[str]:
    return set(image_token_list(text))


def image_token_list(text: str) -> list[str]:
    tokens = [token for token in re.findall(r"[a-z0-9]+", text.lower())]
    return [
        token for token in tokens if token not in IMAGE_STOPWORDS and len(token) > 1
    ]


# ---------------------------------------------------------------------------
# Modifier groups
# ---------------------------------------------------------------------------


MODIFIER_GROUPS: list[dict[str, Any]] = [
    {
        "name": "Labneh Option",
        "minSelections": 1,
        "maxSelections": 1,
        "isRequired": True,
        "modifiers": [
            {"name": "Garlic", "priceDeltaMinor": 0},
            {"name": "Spicy", "priceDeltaMinor": 0},
        ],
    },
    {
        "name": "Hummus Add-ons",
        "minSelections": 0,
        "maxSelections": 1,
        "isRequired": False,
        "modifiers": [
            {"name": "Add Pine Nuts", "priceDeltaMinor": 300000},
        ],
    },
    {
        "name": "Salad Add-ons",
        "minSelections": 0,
        "maxSelections": 1,
        "isRequired": False,
        "modifiers": [
            {"name": "Add Chicken", "priceDeltaMinor": 450000},
        ],
    },
    {
        "name": "Balila Add-ons",
        "minSelections": 0,
        "maxSelections": 1,
        "isRequired": False,
        "modifiers": [
            {"name": "Add Tahini", "priceDeltaMinor": 0},
        ],
    },
    {
        "name": "Kaddouchat Choice",
        "minSelections": 1,
        "maxSelections": 1,
        "isRequired": True,
        "modifiers": [
            {"name": "Halloumi", "priceDeltaMinor": 0},
            {"name": "Falafel Pops", "priceDeltaMinor": 0},
            {"name": "Kafta", "priceDeltaMinor": 0},
            {"name": "Taouk", "priceDeltaMinor": 0},
            {"name": "Cauliflower", "priceDeltaMinor": 0},
        ],
    },
    {
        "name": "Flavored Hummus Choice",
        "minSelections": 1,
        "maxSelections": 1,
        "isRequired": True,
        "modifiers": [
            {"name": "Chatta", "priceDeltaMinor": 0},
            {"name": "Olives", "priceDeltaMinor": 0},
            {"name": "Walnuts", "priceDeltaMinor": 0},
        ],
    },
    {
        "name": "Quartet Hummus Choice",
        "minSelections": 1,
        "maxSelections": 1,
        "isRequired": True,
        "modifiers": [
            {"name": "Chatta", "priceDeltaMinor": 0},
            {"name": "Pesto", "priceDeltaMinor": 0},
            {"name": "Olives", "priceDeltaMinor": 0},
            {"name": "Walnuts", "priceDeltaMinor": 0},
        ],
    },
    {
        "name": "Spicy Sauce",
        "minSelections": 0,
        "maxSelections": 1,
        "isRequired": False,
        "modifiers": [
            {"name": "Add Spicy Sauce", "priceDeltaMinor": 0},
        ],
    },
    {
        "name": "Shawarma Portion",
        "minSelections": 1,
        "maxSelections": 1,
        "isRequired": True,
        "modifiers": [
            {"name": "Sandwich", "priceDeltaMinor": 0},
            {"name": "Sajj", "priceDeltaMinor": 300000},
            {"name": "Platter", "priceDeltaMinor": 900000},
        ],
    },
    {
        "name": "Shisha Flavors",
        "minSelections": 1,
        "maxSelections": 1,
        "isRequired": True,
        "modifiers": [
            {"name": "Double Apple", "priceDeltaMinor": 0},
            {"name": "Orange", "priceDeltaMinor": 0},
            {"name": "Lemon & Mint", "priceDeltaMinor": 0},
            {"name": "Blueberry", "priceDeltaMinor": 0},
            {"name": "Watermelon & Mint", "priceDeltaMinor": 0},
            {"name": "Bubble Gum & Cinnamon", "priceDeltaMinor": 0},
            {"name": "Grape", "priceDeltaMinor": 0},
            {"name": "Watermelon", "priceDeltaMinor": 0},
            {"name": "Strawberry", "priceDeltaMinor": 0},
            {"name": "Bubble Gum", "priceDeltaMinor": 0},
            {"name": "Mint & Cream", "priceDeltaMinor": 0},
        ],
    },
    {
        "name": "Shisha Extras",
        "minSelections": 0,
        "maxSelections": 1,
        "isRequired": False,
        "modifiers": [
            {"name": "Pineapple Head", "priceDeltaMinor": 400000},
        ],
    },
]


# ---------------------------------------------------------------------------
# Category definitions
# ---------------------------------------------------------------------------


def food_blocks() -> list[Block]:
    return [
        Block(
            name="Our Plates",
            sheet=FOOD_SHEET,
            rows=list(range(5, 13)),
            image_folder="breakfast",
            titles={8: "Labneh"},
            descriptions={
                8: "Strained yoghurt, choose garlic or spicy.",
                10: "Chickpeas marinated with lemon, garlic and olive oil dressing. Add tahini.",
            },
            modifier_refs={
                8: ["Labneh Option"],
                10: ["Balila Add-ons"],
            },
        ),
        Block(
            name="The Oven",
            sheet=FOOD_SHEET,
            rows=list(range(14, 23)),
            suffix=" (Oven)",
            image_folder="oven",
        ),
        Block(
            name="Eggs Explorer",
            sheet=FOOD_SHEET,
            rows=list(range(24, 31)),
            image_folder="breakfast",
        ),
        Block(
            name="Sweet Tooth",
            sheet=FOOD_SHEET,
            rows=list(range(32, 34)),
            suffix=" (Breakfast)",
        ),
        Block(
            name="Hummus Family",
            sheet=FOOD_SHEET,
            rows=list(range(44, 52)),
            image_folder="hommos family",
            modifier_refs={
                44: ["Hummus Add-ons"],
                46: ["Hummus Add-ons"],
                47: ["Hummus Add-ons"],
                48: ["Hummus Add-ons"],
                49: ["Hummus Add-ons"],
                50: ["Hummus Add-ons", "Flavored Hummus Choice"],
                51: ["Hummus Add-ons", "Quartet Hummus Choice"],
            },
        ),
        Block(
            name="Raw Section",
            sheet=FOOD_SHEET,
            rows=list(range(53, 59)),
        ),
        Block(
            name="Soups",
            sheet=FOOD_SHEET,
            rows=list(range(60, 62)),
            image_folder="soup",
        ),
        Block(
            name="Salads",
            sheet=FOOD_SHEET,
            rows=list(range(63, 74)),
            image_folder="salads",
            modifier_refs={
                67: ["Salad Add-ons"],
                69: ["Salad Add-ons"],
            },
        ),
        Block(
            name="Cold Mezze",
            sheet=FOOD_SHEET,
            rows=list(range(75, 88)),
            suffix=" (Mezze)",
            image_folder="cold mezze",
            titles={86: "Labneh"},
            descriptions={
                84: (
                    "Spicy fish. Baked grouper filet layered in 2 layers of sauce: traboulsi "
                    "and beyruti."
                ),
                86: "Strained yoghurt, choose garlic or spicy.",
            },
            modifier_refs={86: ["Labneh Option"]},
            description_append={82: "Topped with crispy pita bread."},
        ),
        Block(
            name="Hot Mezze",
            sheet=FOOD_SHEET,
            rows=list(range(89, 112)),
            image_folder="hot mezze",
            titles={98: "Kaddouchat"},
            descriptions={
                98: "A selection of 5 mini warps. Your choice: halloumi, falafel pops, kafta, taouk or cauliflower.",
            },
            modifier_refs={98: ["Kaddouchat Choice"]},
        ),
        Block(
            name="Pastries",
            sheet=FOOD_SHEET,
            rows=list(range(113, 121)),
            image_folder="pastries",
        ),
        Block(
            name="Fatet Family",
            sheet=FOOD_SHEET,
            rows=list(range(122, 126)),
            image_folder="fatet family",
        ),
        Block(
            name="Tabliyet Salma's",
            sheet=FOOD_SHEET,
            rows=list(range(127, 137)),
            suffix=" (Platter)",
            descriptions={
                row: "Sandwiches and platters served with round cut special french fries, hommos and pickles."
                for row in range(127, 137)
            },
        ),
        Block(
            name="Salma's Baked Tacos",
            sheet=FOOD_SHEET,
            rows=list(range(138, 141)),
            image_folder="tacos",
        ),
        Block(
            name="Our Specials",
            sheet=FOOD_SHEET,
            rows=list(range(142, 144)),
            image_folder="specials",
        ),
        Block(
            name="Sides",
            sheet=FOOD_SHEET,
            rows=list(range(145, 152)),
        ),
        Block(
            name="From The Grill",
            sheet=FOOD_SHEET,
            rows=list(range(153, 173)),
            image_folder="grill",
            skip={164},
            titles={
                163: "Mixed Grill (2-4 pax)",
                165: "Mixed Grill (4-8 pax)",
            },
            descriptions={
                163: (
                    "Charcoal-grilled skewers of seasoned lamb, goat filet and chicken cubes, "
                    "served with garlic sauce, grilled vegetables, grilled tomatoes and onions. "
                    "2 of each skewer."
                ),
                165: (
                    "Charcoal-grilled skewers of seasoned lamb, goat filet and chicken cubes, "
                    "served with garlic sauce, grilled vegetables, grilled tomatoes and onions. "
                    "4 of each skewer."
                ),
            },
            modifier_refs={
                159: ["Spicy Sauce"],
                161: ["Spicy Sauce"],
                169: ["Spicy Sauce"],
            },
            description_append={
                153: "Served with grilled vegetables, 10 bites of makanek sandwich, 8 slices of kafta arayess and 12 pcs of chicken wings.",
            },
        ),
        Block(
            name="From The Oven",
            sheet=FOOD_SHEET,
            rows=list(range(174, 181)),
            suffix=" (Baked)",
            image_folder="oven",
            titles={176: "Lahm Bi Ajin"},
        ),
        Block(
            name="Desserts",
            sheet=FOOD_SHEET,
            rows=list(range(182, 199)),
            image_folder="desserts",
            descriptions={
                194: (
                    "A creamy lebanese dessert featuring a semolina pudding base topped with a "
                    "layer of whipped cream and garnished with fragrant sugar syrup and crushed "
                    "pistachios, light and refreshing."
                ),
            },
        ),
        Block(
            name="Hot Beverages",
            sheet=FOOD_SHEET,
            rows=list(range(200, 208)),
        ),
        Block(
            name="Sandwiches",
            sheet=FOOD_SHEET,
            rows=list(range(229, 244)),
            suffix=" (Sandwich)",
            titles={
                241: "Shawarma Sandwich",
                242: "Shawarma Sajj",
                243: "Shawarma Platter",
            },
            descriptions={
                241: "Sunday special only. Sandwich.",
                242: "Sajj.",
                243: "Platter.",
            },
            modifier_refs={241: ["Shawarma Portion"]},
        ),
    ]


# ---------------------------------------------------------------------------
# Builders
# ---------------------------------------------------------------------------


def build_block(block: Block, worksheets: dict[str, Any], images: ImageIndex) -> Category:
    ws = worksheets[block.sheet]
    category = Category(name=block.name)

    for row in block.rows:
        if row in block.skip:
            continue
        raw_title = cell_text(ws, row, 6)
        title = block.titles.get(row) or clean_title(raw_title)
        if not title:
            continue
        raw_description = cell_text(ws, row, 12)
        raw_price = cell_value(ws, row, 19)
        if raw_price is None and not is_number(raw_price):
            continue

        description = block.descriptions.get(row) or clean_desc(raw_description)
        appended = block.description_append.get(row)
        if appended:
            base = re.sub(r"[\s,]+and$", "", description, flags=re.IGNORECASE).rstrip(" ,")
            if base and not base.endswith("."):
                base += "."
            description = f"{base} {appended}" if base else appended

        if row in block.prices:
            price_minor = block.prices[row]
        elif (block.sheet, row) in PRICE_OVERRIDES:
            price_minor = PRICE_OVERRIDES[(block.sheet, row)][0]
        else:
            price_minor = naira_to_minor(raw_price)

        raw_image = cell_text(ws, row, 22)
        if row in block.image_overrides:
            image_source = block.image_overrides[row]
        else:
            image_source = images.resolve(raw_image, title, block.image_folder)

        category.items.append(
            Item(
                # The category already supplies this context in the menu UI.
                name=title,
                price_minor=price_minor,
                description=description or None,
                image_source=image_source,
                modifier_group_refs=list(block.modifier_refs.get(row, [])),
            )
        )

    return category


def build_set_salmas(worksheets: dict[str, Any]) -> Category:
    """Rows 35-42 describe one package for two people."""
    ws = worksheets[FOOD_SHEET]
    contents = [cell_text(ws, row, 6) for row in range(36, 43)]
    contents = [clean_title(content) for content in contents if content]
    if len(contents) > 1:
        description = (
            "Package for 2: " + ", ".join(contents[:-1]) + " and " + contents[-1] + "."
        )
    else:
        description = "Package for 2."
    return Category(
        name="Set Salma's",
        items=[
            Item(
                name="Set Salma's Package",
                price_minor=naira_to_minor(cell_value(ws, 35, 19)),
                description=description,
            )
        ],
    )



def build_spirits(
    worksheets: dict[str, Any], name: str, rows: list[int]
) -> Category:
    """Spirit rows carry a single-shot price in column 12 and a bottle price in column 19."""
    ws = worksheets[DRINKS_SHEET]
    category = Category(name=name)

    for row in rows:
        raw_title = cell_text(ws, row, 6)
        if not raw_title:
            continue
        bottle_value = cell_value(ws, row, 19)
        single_value = cell_value(ws, row, 12)
        bottle = naira_to_minor(bottle_value) if is_number(bottle_value) else None
        single = naira_to_minor(single_value) if is_number(single_value) else None
        if bottle is None and single is None:
            continue

        parts: list[str] = []
        if bottle is not None:
            parts.append(f"Bottle: {format_naira(bottle)}")
        if single is not None:
            parts.append(f"Single: {format_naira(single)}")

        category.items.append(
            Item(
                name=clean_title(raw_title),
                price_minor=bottle if bottle is not None else (single or 0),
                description=" | ".join(parts),
            )
        )

    return category


def build_arak(worksheets: dict[str, Any]) -> Category:
    """Arak rows list quarter, half and full bottle prices in columns 16, 17 and 19."""
    ws = worksheets[DRINKS_SHEET]
    category = Category(name="Arak")

    for row in range(127, 132):
        raw_title = cell_text(ws, row, 6)
        if not raw_title:
            continue
        quarter = cell_value(ws, row, 16)
        half = cell_value(ws, row, 17)
        bottle = cell_value(ws, row, 19)
        quarter_minor = naira_to_minor(quarter) if is_number(quarter) else None
        half_minor = naira_to_minor(half) if is_number(half) else None
        bottle_minor = naira_to_minor(bottle) if is_number(bottle) else None

        if quarter_minor is None and half_minor is None and bottle_minor is None:
            continue

        parts: list[str] = []
        if bottle_minor is not None:
            parts.append(f"Bottle: {format_naira(bottle_minor)}")
        if half_minor is not None:
            parts.append(f"1/2 Bottle: {format_naira(half_minor)}")
        if quarter_minor is not None:
            parts.append(f"1/4 Bottle: {format_naira(quarter_minor)}")

        price_minor = bottle_minor or half_minor or quarter_minor or 0
        category.items.append(
            Item(
                name=clean_title(raw_title),
                price_minor=price_minor,
                description=" | ".join(parts),
            )
        )

    return category


WINE_COUNTRIES = {
    "SOUTH AFRICA": "South Africa",
    "FRANCE": "France",
    "CHILE": "Chile",
    "LEBANON": "Lebanon",
    "ITALY": "Italy",
    "ARGENTINA": "Argentina",
    "PORTUGAL": "Portugal",
    "NEW ZEALAND": "New Zealand",
    "FRNACE": "France",
}


def split_wine_title(raw: str) -> tuple[str, str | None]:
    """Wine rows read "NAME - COUNTRY"; keep the country as the description."""
    match = re.match(r"^(.*?)\s*-\s*([^-]+)$", raw.strip())
    if not match:
        return raw.strip(), None
    name, country = match.group(1).strip(), match.group(2).strip()
    canonical = WINE_COUNTRIES.get(country.upper())
    if canonical is None:
        return raw.strip(), None
    return name, canonical.title()


def build_wine(
    worksheets: dict[str, Any],
    name: str,
    rows: list[int],
    price_column: int = 19,
    description_override: str | None = None,
) -> Category:
    ws = worksheets[DRINKS_SHEET]
    category = Category(name=name)

    for row in rows:
        raw_title = cell_text(ws, row, 6)
        if not raw_title:
            continue
        price_value = cell_value(ws, row, price_column)
        if not is_number(price_value):
            continue
        raw_name, country = split_wine_title(raw_title)
        item_name = clean_title(raw_name)
        description = description_override or country
        if item_name == "Serengeti":
            item_name = f"Serengeti {'Red' if name == 'Red Wines' else 'White'}"
        category.items.append(
            Item(
                name=item_name,
                price_minor=naira_to_minor(price_value),
                description=description,
            )
        )

    return category


def build_shisha(worksheets: dict[str, Any]) -> Category:
    ws = worksheets[SHISHA_SHEET]
    regular_price = naira_to_minor(cell_value(ws, 5, 19))
    special_price = naira_to_minor(cell_value(ws, 7, 19))
    return Category(
        name="Shisha Bar",
        items=[
            Item(
                name="Regular Shisha",
                price_minor=regular_price,
                description="Choose your flavour.",
                modifier_group_refs=["Shisha Flavors", "Shisha Extras"],
            ),
            Item(
                name="Special Shisha",
                price_minor=special_price,
                description="Any regular flavour served with a pineapple head.",
                modifier_group_refs=["Shisha Flavors"],
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    workbook = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    worksheets = {name: workbook[name] for name in workbook.sheetnames}
    images = ImageIndex(IMAGES_ROOT)

    categories: list[Category] = []
    for block in food_blocks():
        categories.append(build_block(block, worksheets, images))

    categories.insert(4, build_set_salmas(worksheets))

    categories.extend(
        [
            build_block(
                Block(
                    name="Signature Cocktails",
                    sheet=DRINKS_SHEET,
                    rows=list(range(5, 20)),
                    skip={17, 19},
                ),
                worksheets,
                images,
            ),
            build_block(
                Block(
                    name="Salma's Margaritas",
                    sheet=DRINKS_SHEET,
                    rows=list(range(21, 24)),
                ),
                worksheets,
                images,
            ),
            build_block(
                Block(
                    name="Spritz & Martini Cocktails",
                    sheet=DRINKS_SHEET,
                    rows=list(range(25, 33)),
                ),
                worksheets,
                images,
            ),
            build_block(
                Block(
                    name="Cocktails",
                    sheet=DRINKS_SHEET,
                    rows=list(range(34, 45)),
                ),
                worksheets,
                images,
            ),
            build_block(
                Block(
                    name="Mocktails",
                    sheet=DRINKS_SHEET,
                    rows=list(range(46, 57)),
                ),
                worksheets,
                images,
            ),
            build_spirits(worksheets, "Tequila", list(range(60, 71))),
            build_spirits(worksheets, "Vodka", list(range(72, 75))),
            build_spirits(worksheets, "Gin", list(range(76, 84))),
            build_spirits(worksheets, "Single Malt", list(range(85, 94))),
            build_spirits(worksheets, "Whiskey", list(range(95, 104))),
            build_spirits(worksheets, "Cognac", list(range(105, 113))),
            build_spirits(worksheets, "Rum & Other Spirits", list(range(114, 125))),
            build_arak(worksheets),
            build_block(
                Block(
                    name="Cold Beverages",
                    sheet=DRINKS_SHEET,
                    rows=list(range(133, 155)),
                ),
                worksheets,
                images,
            ),
            build_wine(worksheets, "Red Wines", list(range(158, 182))),
            build_wine(worksheets, "White Wines", list(range(183, 197))),
            build_wine(worksheets, "Rose Wines", list(range(198, 204))),
            build_block(
                Block(
                    name="Champagne",
                    sheet=DRINKS_SHEET,
                    rows=list(range(206, 215)),
                ),
                worksheets,
                images,
            ),
            build_block(
                Block(
                    name="Prosecco",
                    sheet=DRINKS_SHEET,
                    rows=list(range(216, 218)),
                ),
                worksheets,
                images,
            ),
            build_shisha(worksheets),
        ]
    )

    # House wine sits with the red wines in the worksheet but is its own entry.
    house_wine = build_wine(
        worksheets, "House Wines", [157], description_override="House wine served by the glass"
    )
    red_wine_index = next(
        index for index, category in enumerate(categories) if category.name == "Red Wines"
    )
    categories.insert(red_wine_index, house_wine)

    # Signature cocktail continuations.
    signatures = next(
        category for category in categories if category.name == "Signature Cocktails"
    )
    vino = next(item for item in signatures.items if item.name == "Vino Tequila Twilight")
    vino.description = f"{vino.description}. Refreshing and unique."
    lavender = next(item for item in signatures.items if item.name == "Lavender Cucumber Fizz")
    lavender.description = (
        f"{lavender.description} topped with a hint of blue curacao, perfectly floral and crisp."
    ).strip()

    # Photos the worksheet never links are attached by hand.
    for category in categories:
        for item in category.items:
            if item.name in IMAGE_OVERRIDES:
                item.image_source = IMAGE_OVERRIDES[item.name]

    # Photos that were already uploaded carry their delivered Cloudinary URL.
    url_map = load_url_map()

    # Sort order follows the printed menu.
    category_payload: list[dict[str, Any]] = []
    for index, category in enumerate(categories):
        items_payload = []
        for item_index, item in enumerate(category.items):
            items_payload.append(
                {
                    "name": item.name,
                    "description": item.description,
                    "priceMinor": item.price_minor,
                    "imageUrl": url_map.get(item.image_source or ""),
                    "imageSource": item.image_source,
                    "isAvailable": True,
                    "sortOrder": item_index,
                    "modifierGroupRefs": item.modifier_group_refs,
                }
            )
        category_payload.append(
            {
                "name": category.name,
                "sortOrder": index,
                "isActive": True,
                "items": items_payload,
            }
        )

    output = {
        "outletId": OUTLET_ID,
        "outletName": OUTLET_NAME,
        "modifierGroups": MODIFIER_GROUPS,
        "categories": category_payload,
    }

    os.makedirs(SEEDS_DIR, exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w") as handle:
        handle.write(dump_json(output))
        handle.write("\n")

    # TypeScript mirror (kept in the build output so the seed script can run
    # inside the API container without the workbook).
    ts_path = OUTPUT_JSON_PATH.replace(".json", ".data.ts")
    with open(ts_path, "w") as handle:
        handle.write("// Auto-generated Salmas menu seed data\n")
        handle.write("export interface SalmasSeedData {\n")
        handle.write("  outletId: string;\n")
        handle.write("  outletName: string;\n")
        handle.write("  modifierGroups: Array<{\n")
        handle.write("    name: string;\n")
        handle.write("    minSelections: number;\n")
        handle.write("    maxSelections: number;\n")
        handle.write("    isRequired: boolean;\n")
        handle.write("    modifiers: Array<{ name: string; priceDeltaMinor: number }>;\n")
        handle.write("  }>;\n")
        handle.write("  categories: Array<{\n")
        handle.write("    name: string;\n")
        handle.write("    sortOrder: number;\n")
        handle.write("    isActive: boolean;\n")
        handle.write("    items: Array<{\n")
        handle.write("      name: string;\n")
        handle.write("      description: string | null;\n")
        handle.write("      priceMinor: number;\n")
        handle.write("      imageUrl: string | null;\n")
        handle.write("      imageSource: string | null;\n")
        handle.write("      isAvailable: boolean;\n")
        handle.write("      sortOrder: number;\n")
        handle.write("      modifierGroupRefs: string[];\n")
        handle.write("    }>;\n")
        handle.write("  }>;\n")
        handle.write("}\n\n")
        handle.write("export const salmasMenuData: SalmasSeedData = ")
        handle.write(dump_typescript(output))
        handle.write(";\n")

    report(output)


def dump_json(payload: Any) -> str:
    """JSON in the same shape Prettier produces (short string arrays inline)."""
    text = json.dumps(payload, indent=2, ensure_ascii=False)

    def collapse(match: re.Match[str]) -> str:
        prefix = match.group("prefix")
        items = re.findall(r'"(?:[^"\\]|\\.)*"', match.group("body"))
        collapsed = f"{prefix}[" + ", ".join(items) + "]"
        if len(collapsed) > 100:
            return match.group(0)
        return collapsed

    return re.sub(
        r'(?P<prefix>^[ ]*"[^"]+": )\[\n(?P<body>(?:[ ]+"(?:[^"\\]|\\.)*",?\n)+)[ ]*\]',
        collapse,
        text,
        flags=re.MULTILINE,
    )


def dump_typescript(payload: Any, indent: int = 0) -> str:
    """TypeScript literal in the same shape Prettier produces."""
    pad = " " * indent
    if payload is None:
        return "null"
    if isinstance(payload, bool):
        return "true" if payload else "false"
    if isinstance(payload, (int, float)):
        return json.dumps(payload)
    if isinstance(payload, str):
        return json.dumps(payload, ensure_ascii=False)
    if isinstance(payload, list):
        if not payload:
            return "[]"
        if all(isinstance(entry, str) for entry in payload):
            collapsed = (
                "[" + ", ".join(json.dumps(entry, ensure_ascii=False) for entry in payload) + "]"
            )
            if len(pad) + len(collapsed) <= 100:
                return collapsed
        entries = ",\n".join(f"{pad}  {dump_typescript(entry, indent + 2)}" for entry in payload)
        return "[\n" + entries + f",\n{pad}]"
    if isinstance(payload, dict):
        if not payload:
            return "{}"
        entries = []
        for key, value in payload.items():
            rendered = dump_typescript(value, indent + 2)
            inline = f"{pad}  {key}: {rendered}"
            if len(inline) + 1 <= 100 or isinstance(value, (list, dict)):
                entries.append(inline)
            else:
                entries.append(f"{pad}  {key}:\n{pad}    {rendered}")
        return "{\n" + ",\n".join(entries) + f",\n{pad}}}"
    raise TypeError(f"Unsupported payload type: {type(payload)!r}")


def report(output: dict[str, Any]) -> None:
    names: dict[str, list[str]] = {}
    missing_images: list[str] = []
    total_items = 0
    with_image = 0

    for category in output["categories"]:
        for item in category["items"]:
            total_items += 1
            names.setdefault(item["name"], []).append(category["name"])
            if item["imageSource"]:
                with_image += 1
            else:
                missing_images.append(f"{category['name']} / {item['name']}")

    duplicates = {name: cats for name, cats in names.items() if len(cats) > 1}

    print("Salmas seed generated")
    print(f"  categories       : {len(output['categories'])}")
    print(f"  items            : {total_items}")
    print(f"  items with image : {with_image}")
    print(f"  modifier groups  : {len(output['modifierGroups'])}")
    print(f"  written          : {OUTPUT_JSON_PATH}")
    if PRICE_OVERRIDES:
        print("\n  PRICE OVERRIDES (worksheet value replaced):")
        for (sheet, row), (minor, reason) in PRICE_OVERRIDES.items():
            print(f"    - {sheet} row {row}: N{minor // 100:,} - {reason}")
    if duplicates:
        print("\n  DUPLICATE ITEM NAMES (seed upserts on name):")
        for name, cats in sorted(duplicates.items()):
            print(f"    - {name}: {', '.join(cats)}")
    if missing_images:
        print("\n  ITEMS WITHOUT AN IMAGE:")
        for entry in missing_images:
            print(f"    - {entry}")


if __name__ == "__main__":
    main()
