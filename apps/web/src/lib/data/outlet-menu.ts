import { OUTLETS } from "@/src/lib/data/outlets";

export interface MenuExtra {
  id: string;
  name: string;
  priceMinor: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  priceMinor: number;
  categoryId: string;
  image: string;
  bgColor: string;
  note?: string;
  extras?: MenuExtra[];
}

export interface MenuCategory {
  id: string;
  name: string;
}

export interface OutletMenu {
  outletId: string;
  outletName: string;
  cuisines: string[];
  rating: number;
  deliveryTime: string;
  deliveryFeeMinor: number;
  headerColor: string;
  image: string;
  categories: MenuCategory[];
  items: MenuItem[];
}

const MENUS: Record<string, OutletMenu> = {
  cactus: {
    outletId: "cactus",
    outletName: "Cactus",
    cuisines: ["Grills", "BBQ", "Nigerian"],
    rating: 4.8,
    deliveryTime: "25-35 min",
    deliveryFeeMinor: 50000,
    headerColor: "#1e3160",
    image: "/images/images/fire_1f525.png",
    categories: [
      { id: "starters", name: "Starters" },
      { id: "grills", name: "Grills" },
      { id: "sides", name: "Sides" },
      { id: "drinks", name: "Drinks" },
    ],
    items: [
      {
        id: "suya-skewers",
        name: "Suya Skewers",
        description: "Spiced grilled beef skewers with onion & tomato",
        priceMinor: 250000,
        categoryId: "starters",
        image: "/images/images/oden_1f362.png",
        bgColor: "#FFF3E0",
        note: "🌿 Peanut-free option available upon kitchen request.",
        extras: [
          { id: "dodo", name: "Fried Plantain (Dodo)", priceMinor: 80000 },
          { id: "coleslaw", name: "House Coleslaw", priceMinor: 60000 },
          { id: "pepper", name: "Extra Pepper Sauce", priceMinor: 50000 },
        ],
      },
      {
        id: "peppered-snails",
        name: "Peppered Snails",
        description: "Garden snails in rich tomato pepper sauce",
        priceMinor: 350000,
        categoryId: "starters",
        image: "/images/images/snail_1f40c.png",
        bgColor: "#F3E5F5",
      },
      {
        id: "spring-rolls",
        name: "Spring Rolls (6pc)",
        description: "Crispy vegetable filled rolls, served with sauce",
        priceMinor: 200000,
        categoryId: "starters",
        image: "/images/images/dumpling_1f95f.png",
        bgColor: "#FFF8E1",
      },
      {
        id: "chicken-suya",
        name: "Chicken Suya",
        description: "Marinated chicken strips grilled over open flame",
        priceMinor: 320000,
        categoryId: "grills",
        image: "/images/images/poultry-leg_1f357.png",
        bgColor: "#FBE9E7",
      },
      {
        id: "beef-ribs",
        name: "Peppered Beef Ribs",
        description: "Slow-cooked beef ribs in a rich pepper crust",
        priceMinor: 450000,
        categoryId: "grills",
        image: "🥩",
        bgColor: "#FCE4EC",
        extras: [
          { id: "sauce", name: "BBQ Sauce", priceMinor: 30000 },
          { id: "coleslaw", name: "House Coleslaw", priceMinor: 60000 },
        ],
      },
      {
        id: "catfish-grill",
        name: "Grilled Catfish",
        description: "Whole catfish chargrilled with pepper marinade",
        priceMinor: 550000,
        categoryId: "grills",
        image: "🐟",
        bgColor: "#E3F2FD",
      },
      {
        id: "jollof-rice",
        name: "Party Jollof Rice",
        description: "Smoky oven-cooked jollof with tomato blend",
        priceMinor: 150000,
        categoryId: "sides",
        image: "🍚",
        bgColor: "#E8F5E9",
      },
      {
        id: "fried-plantain",
        name: "Fried Plantain (Dodo)",
        description: "Golden sweet plantain, lightly salted",
        priceMinor: 80000,
        categoryId: "sides",
        image: "🍌",
        bgColor: "#FFFDE7",
      },
      {
        id: "pounded-yam",
        name: "Pounded Yam & Egusi",
        description: "Smooth pounded yam with rich egusi melon soup",
        priceMinor: 200000,
        categoryId: "sides",
        image: "🍲",
        bgColor: "#FFF3E0",
      },
      {
        id: "zobo",
        name: "Zobo Drink",
        description: "Chilled hibiscus drink with ginger",
        priceMinor: 100000,
        categoryId: "drinks",
        image: "/images/images/cup-with-straw_1f964.png",
        bgColor: "#FCE4EC",
      },
      {
        id: "chapman",
        name: "Chapman",
        description: "Classic Nigerian fruit punch cocktail",
        priceMinor: 120000,
        categoryId: "drinks",
        image: "🍹",
        bgColor: "#E3F2FD",
      },
    ],
  },
  salmas: {
    outletId: "salmas",
    outletName: "Salmas",
    cuisines: ["African", "Jollof", "Grills"],
    rating: 4.6,
    deliveryTime: "30-45 min",
    deliveryFeeMinor: 60000,
    headerColor: "#2D5A27",
    image: "/images/images/steaming-bowl_1f35c.png",
    categories: [
      { id: "bowls", name: "Bowls" },
      { id: "platters", name: "Platters" },
      { id: "drinks", name: "Drinks" },
    ],
    items: [
      {
        id: "jollof-bowl",
        name: "Jollof Bowl",
        description: "Smoky jollof rice with grilled chicken and plantain",
        priceMinor: 180000,
        categoryId: "bowls",
        image: "🍛",
        bgColor: "#E8F5E9",
        extras: [
          { id: "extra-chicken", name: "Extra Chicken", priceMinor: 100000 },
          { id: "plantain", name: "Extra Plantain", priceMinor: 50000 },
        ],
      },
      {
        id: "afang-bowl",
        name: "Afang Soup Bowl",
        description: "Rich afang leaf soup with assorted meat",
        priceMinor: 220000,
        categoryId: "bowls",
        image: "🥗",
        bgColor: "#F1F8E9",
      },
      {
        id: "grills-platter",
        name: "Mixed Grill Platter",
        description: "Assorted grilled meats with spicy dipping sauce",
        priceMinor: 650000,
        categoryId: "platters",
        image: "/images/images/meat-on-bone_1f356.png",
        bgColor: "#FBE9E7",
      },
      {
        id: "kunu",
        name: "Kunu Drink",
        description: "Traditional millet drink, lightly sweetened",
        priceMinor: 90000,
        categoryId: "drinks",
        image: "🥛",
        bgColor: "#FFFDE7",
      },
    ],
  },
  farfallino: {
    outletId: "farfallino",
    outletName: "Farfallino Kitchen",
    cuisines: ["Nigerian", "Spicy", "Soups"],
    rating: 4.9,
    deliveryTime: "20-30 min",
    deliveryFeeMinor: 40000,
    headerColor: "#8B1A1A",
    image: "/images/images/hot-pepper_1f336-fe0f.png",
    categories: [
      { id: "soups", name: "Soups" },
      { id: "rice", name: "Rice" },
      { id: "protein", name: "Protein" },
    ],
    items: [
      {
        id: "egusi-soup",
        name: "Egusi Soup",
        description: "Ground melon seed soup with bitter leaf and assorted meat",
        priceMinor: 250000,
        categoryId: "soups",
        image: "🍲",
        bgColor: "#FFF3E0",
      },
      {
        id: "oha-soup",
        name: "Oha Soup",
        description: "Delicate oha leaf soup with stockfish",
        priceMinor: 280000,
        categoryId: "soups",
        image: "🥘",
        bgColor: "#E8F5E9",
      },
      {
        id: "fried-rice",
        name: "Nigerian Fried Rice",
        description: "Flavourful fried rice with mixed vegetables",
        priceMinor: 160000,
        categoryId: "rice",
        image: "🍳",
        bgColor: "#FFF8E1",
      },
      {
        id: "ponmo",
        name: "Ponmo (Cow Skin)",
        description: "Seasoned and tender cow skin",
        priceMinor: 120000,
        categoryId: "protein",
        image: "🥩",
        bgColor: "#FCE4EC",
      },
    ],
  },
  "black-diamond": {
    outletId: "black-diamond",
    outletName: "Black Diamond",
    cuisines: ["Cakes", "Ice Cream", "Pastries"],
    rating: 4.7,
    deliveryTime: "15-25 min",
    deliveryFeeMinor: 30000,
    headerColor: "#6B21A8",
    image: "/images/images/shortcake_1f370.png",
    categories: [
      { id: "cakes", name: "Cakes" },
      { id: "ice-cream", name: "Ice Cream" },
      { id: "pastries", name: "Pastries" },
    ],
    items: [
      {
        id: "gelato-cake",
        name: "Gelato Cake",
        description: "Layered sponge with artisan gelato and berry compote",
        priceMinor: 570000,
        categoryId: "cakes",
        image: "/images/images/birthday-cake_1f382.png",
        bgColor: "#F3E5F5",
        extras: [
          { id: "candles", name: "Birthday Candles", priceMinor: 10000 },
          { id: "message", name: "Personalised Message Plaque", priceMinor: 30000 },
        ],
      },
      {
        id: "choco-fudge",
        name: "Chocolate Fudge Cake",
        description: "Triple-layer chocolate with ganache drizzle",
        priceMinor: 480000,
        categoryId: "cakes",
        image: "/images/images/chocolate-bar_1f36b.png",
        bgColor: "#EFEBE9",
      },
      {
        id: "vanilla-gelato",
        name: "Vanilla Bean Gelato",
        description: "Smooth Italian gelato with real vanilla specks",
        priceMinor: 150000,
        categoryId: "ice-cream",
        image: "🍨",
        bgColor: "#FFF8E1",
      },
      {
        id: "chocolate-croissant",
        name: "Chocolate Croissant",
        description: "Buttery flaky pastry with dark chocolate filling",
        priceMinor: 120000,
        categoryId: "pastries",
        image: "/images/images/croissant_1f950.png",
        bgColor: "#FFF3E0",
      },
    ],
  },
};

export function getOutletMenu(id: string): OutletMenu | null {
  // fallback: match by id or build a stub from OUTLETS list
  if (MENUS[id]) return MENUS[id];

  const outlet = OUTLETS.find((o) => o.id === id);
  if (!outlet) return null;

  return {
    outletId: outlet.id,
    outletName: outlet.name,
    cuisines: outlet.cuisines,
    rating: outlet.rating,
    deliveryTime: outlet.deliveryTime,
    deliveryFeeMinor: 50000,
    headerColor: outlet.headerColor,
    image: outlet.image,
    categories: [{ id: "menu", name: "Menu" }],
    items: [],
  };
}
