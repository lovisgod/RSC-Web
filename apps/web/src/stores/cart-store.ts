"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Cart, CartItem } from "@/src/lib/data/cart";

interface AddItemParams {
  outletId: string;
  outletName: string;
  item: CartItem;
}

interface CartState {
  cart: Cart;
  ownerUserId: string | null;
  cartsByUserId: Record<string, Cart>;
  addItem: (params: AddItemParams) => void;
  removeItem: (outletId: string, lineId: string) => void;
  updateQuantity: (outletId: string, lineId: string, quantity: number) => void;
  claimActiveSessionOwner: (userId: string) => void;
  reconcileOwner: (userId: string) => void;
  releaseActiveSessionOwner: () => void;
  clear: () => void;
}

const EMPTY_CART: Cart = { groups: [], deliveryFeeMinor: 0 };

function isCart(value: unknown): value is Cart {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<Cart>;
  return Array.isArray(candidate.groups);
}

function cartItemSignature(item: CartItem): string {
  const modifiers = [...(item.modifiers ?? [])]
    .map((modifier) => modifier.modifierId)
    .sort()
    .join(",");

  return `${item.id}|${item.notes.trim()}|${modifiers}`;
}

function createCartLineId(item: CartItem): string {
  if (item.lineId) return item.lineId;

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getCartLineId(item: CartItem): string {
  return item.lineId ?? item.id;
}

function addMissingLineIds(cart: Cart): Cart {
  return {
    ...cart,
    groups: cart.groups.map((group) => ({
      ...group,
      items: group.items.map((item) => ({
        ...item,
        lineId: createCartLineId(item),
      })),
    })),
  };
}

function hasCartItems(cart: Cart): boolean {
  return cart.groups.some((group) => group.items.length > 0);
}

function withCurrentCartSaved(state: CartState): Record<string, Cart> {
  if (!state.ownerUserId || !hasCartItems(state.cart)) {
    return state.cartsByUserId;
  }

  return {
    ...state.cartsByUserId,
    [state.ownerUserId]: state.cart,
  };
}

function mergeCartIntoCart(baseCart: Cart, incomingCart: Cart): Cart {
  if (!hasCartItems(incomingCart)) return baseCart;
  if (!hasCartItems(baseCart)) return incomingCart;

  const groups = baseCart.groups.map((group) => ({
    ...group,
    items: [...group.items],
  }));

  for (const incomingGroup of incomingCart.groups) {
    const groupIdx = groups.findIndex((group) => group.outletId === incomingGroup.outletId);

    if (groupIdx === -1) {
      groups.push({
        ...incomingGroup,
        items: incomingGroup.items.map((item) => ({
          ...item,
          lineId: createCartLineId(item),
        })),
      });
      continue;
    }

    const group = groups[groupIdx]!;

    for (const incomingItem of incomingGroup.items) {
      const incomingSignature = cartItemSignature(incomingItem);
      const existingIdx = group.items.findIndex(
        (item) => cartItemSignature(item) === incomingSignature,
      );

      if (existingIdx === -1) {
        group.items.push({ ...incomingItem, lineId: createCartLineId(incomingItem) });
      } else {
        group.items[existingIdx] = {
          ...group.items[existingIdx]!,
          quantity: group.items[existingIdx]!.quantity + incomingItem.quantity,
        };
      }
    }
  }

  return { ...baseCart, groups };
}

function withActiveCartCommitted(
  state: CartState,
  cart: Cart,
): Pick<CartState, "cart" | "cartsByUserId"> {
  if (!state.ownerUserId) {
    return { cart, cartsByUserId: state.cartsByUserId };
  }

  return {
    cart,
    cartsByUserId: {
      ...state.cartsByUserId,
      [state.ownerUserId]: cart,
    },
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: EMPTY_CART,
      ownerUserId: null,
      cartsByUserId: {},

      addItem: ({ outletId, outletName, item }) =>
        set((state) => {
          const groups = [...state.cart.groups];
          const groupIdx = groups.findIndex((g) => g.outletId === outletId);
          const cartItem = { ...item, lineId: createCartLineId(item) };

          if (groupIdx === -1) {
            groups.push({ outletId, outletName, items: [cartItem] });
          } else {
            const group = { ...groups[groupIdx]!, items: [...groups[groupIdx]!.items] };
            const incomingSignature = cartItemSignature(cartItem);
            const existingIdx = group.items.findIndex(
              (i) => cartItemSignature(i) === incomingSignature,
            );

            if (existingIdx === -1) {
              group.items.push(cartItem);
            } else {
              group.items[existingIdx] = {
                ...group.items[existingIdx]!,
                quantity: group.items[existingIdx]!.quantity + cartItem.quantity,
              };
            }
            groups[groupIdx] = group;
          }

          return withActiveCartCommitted(state, { ...state.cart, groups });
        }),

      removeItem: (outletId, lineId) =>
        set((state) => {
          const groups = state.cart.groups
            .map((g) =>
              g.outletId !== outletId
                ? g
                : { ...g, items: g.items.filter((i) => getCartLineId(i) !== lineId) },
            )
            .filter((g) => g.items.length > 0);
          return withActiveCartCommitted(state, { ...state.cart, groups });
        }),

      updateQuantity: (outletId, lineId, quantity) =>
        set((state) => {
          if (quantity <= 0) return state;
          const groups = state.cart.groups.map((g) =>
            g.outletId !== outletId
              ? g
              : {
                  ...g,
                  items: g.items.map((i) => (getCartLineId(i) === lineId ? { ...i, quantity } : i)),
                },
          );
          return withActiveCartCommitted(state, { ...state.cart, groups });
        }),

      claimActiveSessionOwner: (userId) =>
        set((state) => {
          if (state.ownerUserId === userId) {
            return state;
          }

          const cartsByUserId = withCurrentCartSaved(state);
          const savedUserCart = cartsByUserId[userId] ?? EMPTY_CART;

          return {
            cart: savedUserCart,
            ownerUserId: userId,
            cartsByUserId: {
              ...cartsByUserId,
              [userId]: savedUserCart,
            },
          };
        }),

      reconcileOwner: (userId) =>
        set((state) => {
          if (state.ownerUserId === userId) {
            return state;
          }

          const cartsByUserId = withCurrentCartSaved(state);
          const savedUserCart = cartsByUserId[userId] ?? EMPTY_CART;
          const claimedCart =
            !state.ownerUserId && hasCartItems(state.cart)
              ? mergeCartIntoCart(savedUserCart, state.cart)
              : savedUserCart;

          return {
            cart: claimedCart,
            ownerUserId: userId,
            cartsByUserId: {
              ...cartsByUserId,
              [userId]: claimedCart,
            },
          };
        }),

      releaseActiveSessionOwner: () =>
        set((state) => {
          if (!state.ownerUserId) return state;

          return {
            cart: EMPTY_CART,
            ownerUserId: null,
            cartsByUserId: withCurrentCartSaved(state),
          };
        }),

      clear: () =>
        set((state) => {
          if (!state.ownerUserId) {
            return { cart: EMPTY_CART };
          }

          const cartsByUserId = { ...state.cartsByUserId };
          delete cartsByUserId[state.ownerUserId];

          return { cart: EMPTY_CART, cartsByUserId };
        }),
    }),
    {
      name: "rsc-customer-cart",
      storage: createJSONStorage(() => localStorage),
      version: 7,
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== "object") return persistedState;

        const state = persistedState as Partial<CartState>;

        if (version < 5) {
          return {
            ...state,
            cart: EMPTY_CART,
            ownerUserId: null,
            cartsByUserId: {},
          };
        }

        if (!isCart(state.cart)) return persistedState;

        if (version < 6) {
          return {
            ...state,
            cart: addMissingLineIds(state.cart),
            cartsByUserId:
              state.ownerUserId && hasCartItems(state.cart)
                ? { [state.ownerUserId]: addMissingLineIds(state.cart) }
                : {},
          };
        }

        if (version < 7) {
          const hydratedCart = addMissingLineIds(state.cart);
          const cartsByUserId = Object.fromEntries(
            Object.entries(state.cartsByUserId ?? {}).map(([userId, cart]) => [
              userId,
              isCart(cart) ? addMissingLineIds(cart) : EMPTY_CART,
            ]),
          );

          if (!state.ownerUserId) {
            return {
              ...state,
              cart: hydratedCart,
              cartsByUserId,
            };
          }

          return {
            ...state,
            cart: EMPTY_CART,
            ownerUserId: null,
            cartsByUserId: hasCartItems(hydratedCart)
              ? {
                  ...cartsByUserId,
                  [state.ownerUserId]: hydratedCart,
                }
              : cartsByUserId,
          };
        }

        return {
          ...state,
          cart: addMissingLineIds(state.cart),
          cartsByUserId: Object.fromEntries(
            Object.entries(state.cartsByUserId ?? {}).map(([userId, cart]) => [
              userId,
              isCart(cart) ? addMissingLineIds(cart) : EMPTY_CART,
            ]),
          ),
        };
      },
    },
  ),
);
