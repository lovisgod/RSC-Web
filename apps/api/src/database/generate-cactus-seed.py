from __future__ import annotations
import json
import os
import re
import openpyxl

EXCEL_PATH = "/Users/justin/Desktop/DO/CACTUS NEW QR/CACTUS MENU 2026.xlsx"
CLOUDINARY_MAP_PATH = "/Users/justin/Projects/rsc/rsc-web-monorepo/apps/api/src/database/seeds/cactus-cloudinary-urls.json"
OUTPUT_JSON_PATH = "/Users/justin/Projects/rsc/rsc-web-monorepo/apps/api/src/database/seeds/cactus-menu.json"

TYPO_REPLACEMENTS = {
    "PHILLY STEAK OMELETTE": "Philly Steak Omelette",
    "CAPPUCCION": "Cappuccino",
    "ESPRESSO COFFE": "Espresso Coffee",
    "CAFFE LATTE": "Caffè Latte",
    "CAFFE MOCHA": "Caffè Mocha",
    "MALTA GUINESS": "Malta Guinness",
    "GUINESS": "Guinness",
    "ORIGIN BEER": "Orijin Beer",
    "JACK DANIEL'S": "Jack Daniel's",
    "MARTINI XTRA DRY": "Martini Extra Dry",
    "PATRON SLIVER": "Patron Silver",
    "MARTELL SWIFF": "Martell Blue Swift",
    "MARTEL XO": "Martell XO",
    "JW RED LABEL": "Johnnie Walker Red Label",
    "JW BLACK LABEL": "Johnnie Walker Black Label",
    "JW GREEN LABEL": "Johnnie Walker Green Label",
    "JW GOLD LABEL": "Johnnie Walker Gold Label",
    "JW BLUE LABEL": "Johnnie Walker Blue Label",
    "BEEROJITO": "Beerojito",
    "STRONG BEERETTO": "Strong Beeretto",
    "PINA COLADA": "Piña Colada",
    "MOET&CHANDON": "Moët & Chandon",
    "VEUVE CLIQUOT": "Veuve Clicquot",
    "DOM PERIGNON": "Dom Pérignon",
    "LAURENT PERRIER": "Laurent-Perrier",
    "CHABLIS DOMAINE DE COLOMBIER": "Chablis Domaine de Colombier",
    "DOMAINE DE LA GARENNE": "Domaine de la Garenne Sancerre Blanc",
    "VILLA ANTINORI TOSCANA": "Villa Antinori Toscana",
    "JEANTET COTE DE RHONE": "Jeantet Côtes du Rhône",
    "ROCHE MAZET MUSCADET": "Roche Mazet Muscadet",
    "CHATEAU GRAND RENOM": "Château Grand Renom",
    "DECLAN SWEET WHITE": "Declan Sweet White",
    "DECLAN SWEET RED": "Declan Sweet Red",
    "ALMA DE VEGA TEMPRANILLO": "Alma de Vega Tempranillo",
    "ALMA DE VEGA SEMI SWEET WHITE": "Alma de Vega Semi Sweet White",
    "FOOTPRINT SHIRAZ": "Footprint Shiraz",
    "MILLSTEAM PINOTAGE": "Millstream Pinotage",
    "MILLSTEAM": "Millstream",
    "LONGSHAMPS": "Longchamps",
    "PETIT PALACE SWEET": "Petit Palais Sweet",
    "BOLOGNAISE": "Bolognese",
    "ARRABIATA": "Arrabbiata",
    "CENTRECUT": "Center Cut Steak",
    "PIEZZARO": "Piezzaro",
    "CHOCOLAT MOU": "Chocolat Mou",
    "BAILEYS TRIFFLE": "Baileys Trifle",
    "MIGHTY CHICKEN": "Mighty Chicken Burger",
    "SMASHY": "Smashy Burger",
    "SMASHED SIZZLING": "Smashed Sizzling Burger",
    "SIGNATURE": "Cactus Signature Burger",
    "THE CLASSIC": "The Classic Burger",
    "STREET STYLE": "Street Style Burger",
    "DOUBLE DECKER": "Double Decker Club",
    "FULL CCC": "Full Crispy Chicken Club",
    "BEEF NAIJAWARMA": "Beef Naijawarma",
    "CHICKEN NAIJAWARMA": "Chicken Naijawarma",
    "WHOLE CATCH": "Whole Catch Grilled Fish",
    "SEAFOOD RICE FIESTA": "Seafood Rice Fiesta",
    "LAMB & ROSEMARY POTATO": "Lamb & Rosemary Potatoes",
    "AQUAFINA SMALL": "Aquafina Water (Small)",
    "AQUAFINA BIG": "Aquafina Water (Large)",
    "7UP": "7Up",
    "7UP FREE": "7Up Zero Sugar",
    "PEPSI": "Pepsi",
    "DIET PEPSI": "Diet Pepsi",
    "MIRINDA": "Mirinda",
    "BITTER LEMON": "Schweppes Bitter Lemon",
    "SODA WATER": "Schweppes Soda Water",
    "TONIC WATER": "Schweppes Tonic Water",
    "PERRIER": "Perrier Sparkling Water",
    "CHAPMAN": "Cactus Chapman",
    "ENERGY DRINK": "Energy Drink",
    "PACKED JUICE": "Fruit Juice (Glass)",
    "PACKED CRANBERRY JUICE": "Cranberry Juice (Glass)",
    "ORANGE OR PINEAPPLE": "Fresh Orange or Pineapple Juice",
    "APPLE, CARROT": "Fresh Apple & Carrot Juice",
    "ADD GINGER": "Add Fresh Ginger Booster",
    "ICE GINGER PEACH": "Iced Ginger Peach",
    "RASPBERRY GINGER COOLER": "Raspberry Ginger Cooler",
    "PINEAPPLE COCONUT NOJITO": "Pineapple Coconut Nojito",
    "BANANA STRAWBERRY DELIGHT": "Banana Strawberry Delight",
    "KIWI MADNESS": "Kiwi Madness",
    "VIRGIN MULE": "Virgin Mule",
    "BANANA COLADA": "Banana Colada",
    "PLANTERS": "Planters Punch",
    "NOJITO": "Classic Nojito",
    "VIRGIN COLADA": "Virgin Colada",
    "SWEET SUNRISE": "Sweet Sunrise",
}

DESC_TYPO_REPLACEMENTS = {
    "TRUKEY": "turkey",
    "DOBULE": "double",
    "VANILLLA": "vanilla",
    "CHOCLATE": "chocolate",
    "COCOLATE": "chocolate",
    "VANILA": "vanilla",
    "SIDE DIS": "side dishes",
    "BOLOGNAISE": "bolognese",
    "ARRABIATA": "arrabbiata",
    "TEQILA": "tequila",
    "RHUM": "rum",
    "ITAY": "Italy",
    "GRILLED CHICKENBREAST": "grilled chicken breast",
    "MA&CHEESE": "mac & cheese",
    "BBQSAUCE": "BBQ sauce",
    "CHIPS": "french fries",
    "SERVE CUT": "served cut",
}

def clean_title(raw: str) -> str:
    if not raw:
        return ""
    s = raw.strip()
    s = re.sub(r'\s+', ' ', s)
    
    for typo, fix in TYPO_REPLACEMENTS.items():
        if typo.lower() == s.lower():
            return fix

    words = s.split()
    capitalized = []
    lower_connectors = {
        "and", "or", "of", "with", "the", "a", "an", "in", "on", "at", "to", "for", "by", "de", "du", "la", "le"
    }
    for idx, w in enumerate(words):
        lw = w.lower()
        if idx > 0 and lw in lower_connectors and not (w.startswith("(") or w.endswith(")")):
            capitalized.append(lw)
        elif "'" in w:
            parts = w.split("'")
            fixed_parts = [p.capitalize() for p in parts]
            capitalized.append("'".join(fixed_parts))
        else:
            capitalized.append(w.capitalize())

    res = " ".join(capitalized)
    res = re.sub(r'\bJw\b', 'Johnnie Walker', res, flags=re.I)
    res = re.sub(r'\bBbq\b', 'BBQ', res, flags=re.I)
    res = re.sub(r'\bXo\b', 'XO', res, flags=re.I)
    res = re.sub(r'\bVsop\b', 'VSOP', res, flags=re.I)
    res = re.sub(r'\bVs\b', 'VS', res, flags=re.I)
    res = re.sub(r'\bMl\b', 'ml', res, flags=re.I)
    res = re.sub(r'\b1\.5l\b', '1.5L', res, flags=re.I)
    return res

def clean_desc(raw: str) -> str:
    if not raw:
        return ""
    s = raw.strip()
    for typo, fix in DESC_TYPO_REPLACEMENTS.items():
        s = re.sub(re.escape(typo), fix, s, flags=re.IGNORECASE)

    s = re.sub(r',([^\s])', r', \1', s)
    s = re.sub(r'\s+', ' ', s)

    if len(s) > 1:
        s = s[0].upper() + s[1:].lower()
        s = re.sub(r'(\.\s+[a-z])', lambda m: m.group(1).upper(), s)
        proper_nouns = [
            "BBQ", "Lagos", "French", "Italian", "American", "Nigerian", "Cactus",
            "Baileys", "Hennessy", "Martell", "Remy Martin", "Martini", "Moët", "Veuve Clicquot",
            "Dom Pérignon", "Jack Daniel's", "Bacardi", "Campari", "Schweppes", "Heineken",
            "Guinness", "Perrier", "Aquafina", "Pepsi", "Mirinda", "7Up", "Tequila",
            "Prosecco", "Champagne", "France", "Italy", "Spain", "South Africa"
        ]
        for pn in proper_nouns:
            s = re.sub(r'\b' + re.escape(pn) + r'\b', pn, s, flags=re.IGNORECASE)
    return s.strip()

def parse_price_minor(raw_val) -> int:
    if raw_val is None:
        return 0
    if isinstance(raw_val, str):
        cleaned = raw_val.strip().replace(" ", "").replace(",", "")
        if cleaned == "9000":
            cleaned = "90000"
        try:
            val = float(cleaned)
        except ValueError:
            return 0
    else:
        val = float(raw_val)

    # Cactus prices are written in full Naira (e.g. 27000 = ₦27,000)
    return int(round(val * 100))

def match_image(img_path: str, item_name: str, cloudinary_urls: dict) -> str | None:
    if img_path:
        raw = img_path.strip()
        fname = os.path.basename(raw).lower()
        if fname in cloudinary_urls:
            return cloudinary_urls[fname]
        if raw.lower() in cloudinary_urls:
            return cloudinary_urls[raw.lower()]
        
        base_no_ext, ext = os.path.splitext(fname)
        alt_ext = ".jpg" if ext == ".jpeg" else ".jpeg"
        alt_fname = base_no_ext + alt_ext
        if alt_fname in cloudinary_urls:
            return cloudinary_urls[alt_fname]

    # Fallback to item_name matching
    if item_name:
        clean_norm = re.sub(r'[^a-z0-9]', '', item_name.lower())
        for k, url in cloudinary_urls.items():
            if "/" in k:
                continue
            base_k = os.path.splitext(k)[0]
            k_norm = re.sub(r'[^a-z0-9]', '', base_k)
            if k_norm and (k_norm == clean_norm or clean_norm in k_norm or k_norm in clean_norm):
                # Avoid overly loose matches (e.g. "chicken" matching everything)
                if len(k_norm) >= 6 and len(clean_norm) >= 6:
                    return url

    return None

def main():
    cloudinary_urls = {}
    if os.path.exists(CLOUDINARY_MAP_PATH):
        try:
            with open(CLOUDINARY_MAP_PATH, "r") as f:
                cloudinary_urls = json.load(f)
        except Exception as e:
            print(f"Error loading Cloudinary map: {e}")

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)

    categories_list = []
    cat_items = {}

    # =========================================================================
    # 1. FOOD MENU
    # =========================================================================
    ws_food = wb["FOOD MENU"]
    current_cat = None

    for r in range(10, 215):
        c2 = ws_food.cell(row=r, column=2).value
        c6 = ws_food.cell(row=r, column=6).value
        c12 = ws_food.cell(row=r, column=12).value
        c19 = ws_food.cell(row=r, column=19).value
        c22 = ws_food.cell(row=r, column=22).value

        c2_str = str(c2).strip() if c2 else ""
        c6_str = str(c6).strip() if c6 else ""
        c12_str = str(c12).strip() if c12 else ""

        # Section / Category detection
        if c2_str:
            if "EGGS" in c2_str:
                current_cat = "Breakfast (Eggs & Omelettes)"
            elif "SAVORY" in c2_str:
                current_cat = "Breakfast (Savory)"
            elif "SWEET TOUCH" in c2_str:
                current_cat = "Breakfast (Sweet Touch)"
            elif "SHARING IS CARING" in c2_str:
                current_cat = "Sharing is Caring (Starters & Platters)"
            elif "SALAD" in c2_str:
                current_cat = "Salads"
            elif "SANDWICHES" in c2_str:
                current_cat = "Sandwiches"
            elif "BURGERS" in c2_str:
                current_cat = "Burgers"
            elif "PASTA" in c2_str:
                current_cat = "Pasta"
            elif "PIZZA" in c2_str:
                current_cat = "Pizzas"
            elif "MAIN EVENT" in c2_str:
                current_cat = "Main Event (Meat & Seafood)"
            elif "CACTUS SIGNATURE" in c2_str:
                current_cat = "Cactus Signature Dishes"
            elif "CHICKEN" in c2_str:
                current_cat = "Chicken (Make Your Own Plate)"
            elif "KIDS MENU" in c2_str:
                current_cat = "Kids Menu"
            elif "DESSERT" in c2_str:
                current_cat = "Desserts"
            elif "COFFEE" in c2_str:
                current_cat = "Coffee & Hot Drinks"
            elif "BEVERAGE" in c2_str:
                current_cat = "Beverages & Soft Drinks"

            if current_cat and current_cat not in categories_list:
                categories_list.append(current_cat)

        # Handle Extra Side Dishes in Food Menu (Rows 131-143)
        if r == 131:
            current_cat = "Extra Side Dishes"
            if current_cat not in categories_list:
                categories_list.append(current_cat)

        # Skip rows that are pure header instruction notes
        if r in [48, 64, 74, 85, 96, 116, 154, 158, 175]:
            continue

        title = None
        desc = None
        price = c19

        if current_cat == "Extra Side Dishes":
            # For extra sides rows, title is in c12 (or c6 on row 131)
            title = c12_str or c6_str
            desc = "Side dish"
        elif current_cat == "Chicken (Make Your Own Plate)":
            if r in [151, 152, 153]:
                title = c12_str
                desc = "Choose your chicken style, sauce, and side dish"
            elif r in [155, 156, 157]:
                # Sauces can also be listed if ordered separately
                continue
        elif r in [129, 130]:
            # Add-ons for Teriyaki Noodles handled via modifier group
            continue
        elif r in [205, 207]:
            # Juice pack variations
            if r == 205:
                title = "Fruit Juice (1L Pack)"
                desc = "Apple, orange, or pineapple"
            elif r == 207:
                title = "Cranberry Juice (1.5L Pack)"
                desc = "Pure cranberry juice pack"
        else:
            title = c6_str or (c2_str if not c2_str.startswith("CATEGORY") else "")
            desc = c12_str

        if not title or price is None:
            continue

        item_title = clean_title(title)
        item_desc = clean_desc(desc)
        price_minor = parse_price_minor(price)
        image_url = match_image(str(c22) if c22 else "", item_title, cloudinary_urls)

        # Modifier group links
        modifier_group_refs = []
        if current_cat in ["Breakfast (Eggs & Omelettes)", "Breakfast (Savory)"]:
            modifier_group_refs.append("Breakfast Boosters")
        elif current_cat == "Salads":
            modifier_group_refs.append("Salad Dressing Choice")
        elif current_cat == "Sandwiches":
            modifier_group_refs.append("Sandwich Side Choice")
        elif current_cat == "Pasta":
            modifier_group_refs.append("Pasta Shape Choice")
            modifier_group_refs.append("Pasta Add-ons")
        elif current_cat == "Pizzas":
            modifier_group_refs.append("Pizza Toppers")
        elif current_cat == "Main Event (Meat & Seafood)":
            if "teriyaki noodles" in item_title.lower():
                modifier_group_refs.append("Teriyaki Noodles Add-ons")
            else:
                modifier_group_refs.append("Main Course Side Choice")
        elif current_cat == "Cactus Signature Dishes":
            if any(k in item_title.lower() for k in ["lamb", "whole catch", "medley"]):
                modifier_group_refs.append("Main Course Side Choice")
        elif current_cat == "Chicken (Make Your Own Plate)":
            modifier_group_refs.append("Chicken Sauce Choice")
            modifier_group_refs.append("Main Course Side Choice")
        elif current_cat == "Coffee & Hot Drinks":
            modifier_group_refs.append("Coffee Syrups & Boosters")

        cat_items.setdefault(current_cat, []).append({
            "name": item_title,
            "description": item_desc or None,
            "priceMinor": price_minor,
            "imageUrl": image_url,
            "isAvailable": True,
            "modifierGroupRefs": modifier_group_refs
        })

    # =========================================================================
    # 2. DRINKS MENU
    # =========================================================================
    ws_drinks = wb["DRINKS MENU"]
    current_cat = None

    drink_cat_map = {
        "FRESH JUICES": "Fresh Juices",
        "SMOOTHIES": "Smoothies",
        "SIGNATURE MOCKTAILS": "Signature Mocktails",
        "BEER": "Beers & Ciders",
        "VERMOUTH": "Vermouth & Bitters",
        "LIQUEUR": "Liqueurs",
        "TEQUILA": "Tequila",
        "GIN": "Gin",
        "COGNAC": "Cognac",
        "VODKA": "Vodka",
        "WHISKEY": "Whiskey",
        "COCKTAILS": "Classic Cocktails",
        "CLASSIC COCKTAILS": "Classic Cocktails",
        "TROPICAL COCKTAILS": "Tropical Cocktails",
        "REFRESHING &LIGHT COCKTAILS": "Refreshing & Light Cocktails",
        "DESSERT COCKTAILS": "Dessert Cocktails",
        "STRONG & STIRRED COCKTAILS": "Strong & Stirred Cocktails",
        "UNIQUE COCKTAILS": "Unique Signature Cocktails",
        "SPARKLING COCKTAILS": "Sparkling Cocktails",
        "SPICY & WARM COCKTAILS": "Spicy & Warm Cocktails",
    }

    r = 5
    while r <= 175:
        c2 = ws_drinks.cell(row=r, column=2).value
        c5 = ws_drinks.cell(row=r, column=5).value
        c6 = ws_drinks.cell(row=r, column=6).value
        c12 = ws_drinks.cell(row=r, column=12).value
        c14 = ws_drinks.cell(row=r, column=14).value

        c2_str = str(c2).strip() if c2 else ""
        c5_str = str(c5).strip() if c5 else ""
        c6_str = str(c6).strip() if c6 else ""

        for key, cat_name in drink_cat_map.items():
            if key in c2_str.upper():
                current_cat = cat_name
                if current_cat not in categories_list:
                    categories_list.append(current_cat)
                break

        # Check for Spirits with Single / Bottle rows
        if current_cat in ["Vermouth & Bitters", "Liqueurs", "Tequila", "Gin", "Cognac", "Vodka", "Whiskey"]:
            if c5_str and c6_str == "SINGLE" and c12:
                single_price = int(c12)
                title = c5_str
                bottle_price = None

                # Check next row for bottle price
                next_c5 = ws_drinks.cell(row=r+1, column=5).value
                next_c6 = ws_drinks.cell(row=r+1, column=6).value
                next_c12 = ws_drinks.cell(row=r+1, column=12).value
                if (not next_c5 or str(next_c5).strip() == "") and str(next_c6).strip() == "BOTTLE" and next_c12:
                    bottle_price = int(next_c12)
                    r += 1  # Skip the next row since consumed

                item_title = clean_title(title)
                price_minor = (bottle_price if bottle_price else single_price) * 100
                image_url = match_image(str(c14) if c14 else "", item_title, cloudinary_urls)

                cat_items.setdefault(current_cat, []).append({
                    "name": item_title,
                    "description": desc,
                    "priceMinor": price_minor,
                    "imageUrl": image_url,
                    "isAvailable": True,
                    "modifierGroupRefs": []
                })
                r += 1
                continue
            elif c5_str and c6_str == "BOTTLE" and c12:
                bottle_price = int(c12)
                item_title = clean_title(c5_str)
                price_minor = bottle_price * 100
                image_url = match_image(str(c14) if c14 else "", item_title, cloudinary_urls)

                cat_items.setdefault(current_cat, []).append({
                    "name": item_title,
                    "description": desc,
                    "priceMinor": price_minor,
                    "imageUrl": image_url,
                    "isAvailable": True,
                    "modifierGroupRefs": []
                })
                r += 1
                continue

        # Standard drink items
        if c5_str:
            title = c5_str
            desc = c6_str if c6_str and c6_str not in ["SINGLE", "BOTTLE"] else ""
            price = c12

            # Hot Toddy fallback price
            if "hot toddy" in title.lower() and price is None:
                price = 15000

            if price is not None:
                item_title = clean_title(title)
                item_desc = clean_desc(desc)
                price_minor = parse_price_minor(price)
                image_url = match_image(str(c14) if c14 else "", item_title, cloudinary_urls)

                cat_items.setdefault(current_cat, []).append({
                    "name": item_title,
                    "description": item_desc or None,
                    "priceMinor": price_minor,
                    "imageUrl": image_url,
                    "isAvailable": True,
                    "modifierGroupRefs": []
                })

        r += 1

    # =========================================================================
    # 3. WINE SELECTION
    # =========================================================================
    ws_wine = wb["WINE SELECTION"]
    current_cat = None

    wine_cat_map = {
        "WHITE WINE": "White Wines",
        "RED WINE": "Red Wines",
        "ROSE WINE": "Rosé Wines",
        "SWEET WINE": "Sweet Wines",
        "CHAMPAGNE": "Champagne & Sparkling Wine",
        "PROSECCO": "Champagne & Sparkling Wine",
    }

    r = 5
    while r <= ws_wine.max_row:
        c2 = ws_wine.cell(row=r, column=2).value
        c6 = ws_wine.cell(row=r, column=6).value
        c12 = ws_wine.cell(row=r, column=12).value
        c19 = ws_wine.cell(row=r, column=19).value
        c22 = ws_wine.cell(row=r, column=22).value

        c2_str = str(c2).strip() if c2 else ""
        c6_str = str(c6).strip() if c6 else ""
        c12_str = str(c12).strip() if c12 else ""

        for k, name in wine_cat_map.items():
            if k in c2_str.upper():
                current_cat = name
                if current_cat not in categories_list:
                    categories_list.append(current_cat)
                break

        # Check for House Wine Glass / Bottle pairing
        if "HOUSE" in c6_str.upper() and ("GLASS" in c12_str.upper() or c19):
            glass_price = parse_price_minor(c19)
            bottle_price = None

            next_c6 = ws_wine.cell(row=r+1, column=6).value
            next_c12 = ws_wine.cell(row=r+1, column=12).value
            next_c19 = ws_wine.cell(row=r+1, column=19).value
            if "BOTTLE" in str(next_c12).upper() and next_c19:
                bottle_price = parse_price_minor(next_c19)
                r += 1

            item_title = clean_title(f"House {current_cat.rstrip('s')}")
            price_minor = bottle_price if bottle_price else glass_price
            desc = f"Bottle: ₦{(bottle_price or 0)//100:,} | Glass: ₦{glass_price//100:,}"

            cat_items.setdefault(current_cat, []).append({
                "name": item_title,
                "description": desc,
                "priceMinor": price_minor,
                "imageUrl": None,
                "isAvailable": True,
                "modifierGroupRefs": []
            })
            r += 1
            continue

        if c2_str.upper() == "PROSECCO" and "GLASS" in c12_str.upper():
            glass_price = parse_price_minor(c19)
            next_c19 = ws_wine.cell(row=r+1, column=19).value
            bottle_price = parse_price_minor(next_c19) if next_c19 else 9000000
            r += 1

            cat_items.setdefault(current_cat, []).append({
                "name": "House Prosecco",
                "description": f"Bottle: ₦{bottle_price//100:,} | Glass: ₦{glass_price//100:,}",
                "priceMinor": bottle_price,
                "imageUrl": None,
                "isAvailable": True,
                "modifierGroupRefs": []
            })
            r += 1
            continue

        if c6_str and c19 is not None:
            title = c6_str
            desc = c12_str if c12_str and not c12_str.upper().startswith("CATEGORY") else ""
            item_title = clean_title(title)
            item_desc = clean_desc(desc)
            price_minor = parse_price_minor(c19)
            image_url = match_image(str(c22) if c22 else "", item_title, cloudinary_urls)

            cat_items.setdefault(current_cat, []).append({
                "name": item_title,
                "description": item_desc or None,
                "priceMinor": price_minor,
                "imageUrl": image_url,
                "isAvailable": True,
                "modifierGroupRefs": []
            })

        r += 1

    # =========================================================================
    # 4. SHISHA BAR
    # =========================================================================
    ws_shisha = wb["SHISHA BAR"]
    current_cat = "Shisha Bar"
    categories_list.append(current_cat)

    cat_items[current_cat] = [
        {
            "name": "Premium Shisha",
            "description": "Double Apple, Orange, Lemon & Mint, Blueberry, Watermelon & Mint, Bubble Gum & Cinnamon, Grape, Watermelon, Strawberry, Lemon, Mint & Cream.",
            "priceMinor": 1600000,
            "imageUrl": None,
            "isAvailable": True,
            "modifierGroupRefs": []
        }
    ]

    # =========================================================================
    # MODIFIER GROUPS
    # =========================================================================
    modifier_groups = [
        {
            "name": "Breakfast Boosters",
            "minSelections": 0,
            "maxSelections": 10,
            "isRequired": False,
            "modifiers": [
                { "name": "Bacon", "priceDeltaMinor": 450000 },
                { "name": "Ham or Turkey", "priceDeltaMinor": 450000 },
                { "name": "Cheese", "priceDeltaMinor": 450000 },
                { "name": "Grilled Sausage", "priceDeltaMinor": 300000 },
                { "name": "Tuna", "priceDeltaMinor": 600000 },
                { "name": "Shrimp", "priceDeltaMinor": 700000 },
                { "name": "Grilled Vegetables", "priceDeltaMinor": 300000 },
                { "name": "Porridge Beans", "priceDeltaMinor": 300000 },
                { "name": "Baked Beans", "priceDeltaMinor": 300000 },
                { "name": "Extra Egg", "priceDeltaMinor": 200000 },
                { "name": "Homemade Sausage", "priceDeltaMinor": 300000 },
            ]
        },
        {
            "name": "Main Course Side Choice",
            "minSelections": 1,
            "maxSelections": 1,
            "isRequired": True,
            "modifiers": [
                { "name": "French Fries", "priceDeltaMinor": 0 },
                { "name": "Yam Fries", "priceDeltaMinor": 0 },
                { "name": "Mashed Potato", "priceDeltaMinor": 0 },
                { "name": "Steamed Rice", "priceDeltaMinor": 0 },
                { "name": "Jollof Rice", "priceDeltaMinor": 0 },
                { "name": "Sautéed Vegetables", "priceDeltaMinor": 0 },
                { "name": "Fried Rice", "priceDeltaMinor": 0 },
                { "name": "Coleslaw", "priceDeltaMinor": 0 },
                { "name": "Spicy Pasta", "priceDeltaMinor": 0 },
            ]
        },
        {
            "name": "Sandwich Side Choice",
            "minSelections": 1,
            "maxSelections": 1,
            "isRequired": True,
            "modifiers": [
                { "name": "French Fries", "priceDeltaMinor": 0 },
                { "name": "Fried Yam", "priceDeltaMinor": 0 },
                { "name": "Fried Sweet Potatoes", "priceDeltaMinor": 0 },
                { "name": "Side Salad", "priceDeltaMinor": 0 },
            ]
        },
        {
            "name": "Salad Dressing Choice",
            "minSelections": 1,
            "maxSelections": 1,
            "isRequired": True,
            "modifiers": [
                { "name": "Lemon Oil", "priceDeltaMinor": 0 },
                { "name": "Thousand Island", "priceDeltaMinor": 0 },
                { "name": "Balsamic Vinaigrette", "priceDeltaMinor": 0 },
                { "name": "Lemon Mayonnaise", "priceDeltaMinor": 0 },
            ]
        },
        {
            "name": "Pasta Shape Choice",
            "minSelections": 1,
            "maxSelections": 1,
            "isRequired": True,
            "modifiers": [
                { "name": "Spaghetti", "priceDeltaMinor": 0 },
                { "name": "Tagliatelle", "priceDeltaMinor": 0 },
                { "name": "Penne", "priceDeltaMinor": 0 },
            ]
        },
        {
            "name": "Pasta Add-ons",
            "minSelections": 0,
            "maxSelections": 1,
            "isRequired": False,
            "modifiers": [
                { "name": "Add Fresh Parmesan", "priceDeltaMinor": 400000 },
            ]
        },
        {
            "name": "Pizza Toppers",
            "minSelections": 0,
            "maxSelections": 8,
            "isRequired": False,
            "modifiers": [
                { "name": "Extra Ham", "priceDeltaMinor": 450000 },
                { "name": "Extra Turkey", "priceDeltaMinor": 400000 },
                { "name": "Chorizo", "priceDeltaMinor": 400000 },
                { "name": "Sausage", "priceDeltaMinor": 400000 },
                { "name": "Chicken", "priceDeltaMinor": 400000 },
                { "name": "Black Olives", "priceDeltaMinor": 200000 },
                { "name": "Fresh Parmesan", "priceDeltaMinor": 400000 },
                { "name": "Smoked Salmon", "priceDeltaMinor": 900000 },
                { "name": "Shrimps", "priceDeltaMinor": 700000 },
                { "name": "Pepperoni", "priceDeltaMinor": 400000 },
            ]
        },
        {
            "name": "Chicken Sauce Choice",
            "minSelections": 1,
            "maxSelections": 1,
            "isRequired": True,
            "modifiers": [
                { "name": "Spicy Mushroom Sauce", "priceDeltaMinor": 500000 },
                { "name": "Oga Sauce", "priceDeltaMinor": 500000 },
                { "name": "Cactus Sauce", "priceDeltaMinor": 700000 },
                { "name": "No Sauce", "priceDeltaMinor": 0 },
            ]
        },
        {
            "name": "Coffee Syrups & Boosters",
            "minSelections": 0,
            "maxSelections": 3,
            "isRequired": False,
            "modifiers": [
                { "name": "Hazelnut Syrup", "priceDeltaMinor": 200000 },
                { "name": "Vanilla Syrup", "priceDeltaMinor": 200000 },
                { "name": "Caramel Syrup", "priceDeltaMinor": 200000 },
                { "name": "Chocolate Syrup", "priceDeltaMinor": 200000 },
                { "name": "Mint Syrup", "priceDeltaMinor": 200000 },
                { "name": "Coconut Syrup", "priceDeltaMinor": 200000 },
            ]
        },
        {
            "name": "Teriyaki Noodles Add-ons",
            "minSelections": 0,
            "maxSelections": 2,
            "isRequired": False,
            "modifiers": [
                { "name": "Add Chicken", "priceDeltaMinor": 450000 },
                { "name": "Add Shrimps", "priceDeltaMinor": 700000 },
            ]
        }
    ]

    # Assemble output
    output_data = {
        "outletId": "cdd3920c-b3b9-40e8-9d58-b7fb32c67328",
        "outletName": "Cactus",
        "modifierGroups": modifier_groups,
        "categories": [
            {
                "name": cat_name,
                "sortOrder": idx,
                "isActive": True,
                "items": [
                    { **item, "sortOrder": i }
                    for i, item in enumerate(cat_items.get(cat_name, []))
                ]
            }
            for idx, cat_name in enumerate(categories_list)
            if cat_name in cat_items and len(cat_items[cat_name]) > 0
        ]
    }

    os.makedirs(os.path.dirname(OUTPUT_JSON_PATH), exist_ok=True)
    with open(OUTPUT_JSON_PATH, "w") as f:
        json.dump(output_data, f, indent=2)

    total_items = sum(len(c["items"]) for c in output_data["categories"])
    items_with_images = sum(
        1 for c in output_data["categories"] for it in c["items"] if it["imageUrl"] is not None
    )

    print(f"✅ Generated Cactus seed data:")
    print(f"   Categories: {len(output_data['categories'])}")
    print(f"   Total items: {total_items}")
    print(f"   Items with images: {items_with_images}")
    print(f"   Modifier groups: {len(modifier_groups)}")

    ts_path = OUTPUT_JSON_PATH.replace('.json', '.data.ts')
    with open(ts_path, 'w') as f:
        f.write('// Auto-generated Cactus menu seed data\n')
        f.write('export interface CactusSeedData {\n')
        f.write('  outletId: string;\n')
        f.write('  outletName: string;\n')
        f.write('  modifierGroups: Array<{\n')
        f.write('    name: string;\n')
        f.write('    minSelections: number;\n')
        f.write('    maxSelections: number;\n')
        f.write('    isRequired: boolean;\n')
        f.write('    modifiers: Array<{ name: string; priceDeltaMinor: number }>;\n')
        f.write('  }>;\n')
        f.write('  categories: Array<{\n')
        f.write('    name: string;\n')
        f.write('    sortOrder: number;\n')
        f.write('    isActive: boolean;\n')
        f.write('    items: Array<{\n')
        f.write('      name: string;\n')
        f.write('      description: string | null;\n')
        f.write('      priceMinor: number;\n')
        f.write('      imageUrl: string | null;\n')
        f.write('      isAvailable: boolean;\n')
        f.write('      sortOrder: number;\n')
        f.write('      modifierGroupRefs: string[];\n')
        f.write('    }>;\n')
        f.write('  }>;\n')
        f.write('}\n\n')
        f.write('export const cactusMenuData: CactusSeedData = ')
        json.dump(output_data, f, indent=2)
        f.write(';\n')

    print(f"   Written to: {OUTPUT_JSON_PATH} and {ts_path}")

if __name__ == "__main__":
    main()
