export interface Outlet {
  id: string;
  name: string;
  cuisines: string[];
  rating: number;
  deliveryTime: string;
  tag?: string;
  headerColor: string;
  image: string;
}

export const OUTLETS: Outlet[] = [
  {
    id: "cactus",
    name: "Cactus",
    cuisines: ["Grills", "BBQ", "Nigerian"],
    rating: 4.8,
    deliveryTime: "25-35 min",
    tag: "Popular",
    headerColor: "#1e3160",
    image: "/images/images/fire_1f525.png",
  },
  {
    id: "salmas",
    name: "Salmas",
    cuisines: ["Sushi", "Noodles", "Thai"],
    rating: 4.6,
    deliveryTime: "30-45 min",
    headerColor: "#2D5A27",
    image: "/images/images/steaming-bowl_1f35c.png",
  },
  {
    id: "farfallino",
    name: "Farfallino Kitchen",
    cuisines: ["Nigerian", "Spicy", "Soups"],
    rating: 4.9,
    deliveryTime: "20-30 min",
    headerColor: "#8B1A1A",
    image: "/images/images/hot-pepper_1f336-fe0f.png",
  },
  {
    id: "black-diamond",
    name: "Black Diamond",
    cuisines: ["Cakes", "Ice Cream", "Pastries"],
    rating: 4.7,
    deliveryTime: "15-25 min",
    headerColor: "#6B21A8",
    image: "/images/images/shortcake_1f370.png",
  },
];
