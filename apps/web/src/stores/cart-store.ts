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

          return { cart: { ...state.cart, groups } };
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
          return { cart: { ...state.cart, groups } };
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
          return { cart: { ...state.cart, groups } };
        }),

      claimActiveSessionOwner: (userId) =>
        set((state) => {
          if (state.ownerUserId === userId) {
            return state;
          }

          const cartsByUserId = withCurrentCartSaved(state);

          return {
            cart: cartsByUserId[userId] ?? EMPTY_CART,
            ownerUserId: userId,
            cartsByUserId,
          };
        }),

      reconcileOwner: (userId) =>
        set((state) => {
          if (state.ownerUserId === userId) {
            return state;
          }

          const cartsByUserId = withCurrentCartSaved(state);

          return {
            cart: cartsByUserId[userId] ?? EMPTY_CART,
            ownerUserId: userId,
            cartsByUserId,
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
      version: 6,
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
