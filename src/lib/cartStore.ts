import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  discountPrice?: number;
  quantity: number;
  image?: string;
  brand: string;
  size?: string;
}

export interface Cart {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, size?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<Cart>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item: CartItem) => {
        set((state) => {
          const existingItem = state.items.find(
            (i) => i.productId === item.productId && i.size === item.size
          );

          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId && i.size === item.size
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }

          return {
            items: [...state.items, item],
          };
        });
      },

      removeItem: (productId: string, size?: string) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.size === size)
          ),
        }));
      },

      updateQuantity: (productId: string, quantity: number, size?: string) => {
        if (quantity <= 0) {
          get().removeItem(productId, size);
          return;
        }

        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId && i.size === size
              ? { ...i, quantity }
              : i
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        const state = get();
        return state.items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getTotalPrice: () => {
        const state = get();
        return state.items.reduce((sum, item) => {
          const price = item.discountPrice || item.price;
          return sum + price * item.quantity;
        }, 0);
      },
    }),
    {
      name: "cart-storage",
    }
  )
);
