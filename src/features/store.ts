import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Address,
  CartItem,
  Fulfillment,
  Order,
  PaymentMethodMock,
  UserProfile,
} from "../entities/types";
import { catalog } from "../services/shop";
type State = {
  cart: CartItem[];
  favorites: string[];
  addresses: Address[];
  activeAddressId: string;
  fulfillment: Fulfillment;
  profile: UserProfile;
  orders: Order[];
  payment: PaymentMethodMock;
  promo: boolean;
  search: string;
  comment: string;
  consent: boolean;
  changeQuantity: (id: string, delta: number) => void;
  toggleFavorite: (id: string) => void;
  saveAddress: (a: Address) => void;
  deleteAddress: (id: string) => void;
  selectAddress: (id: string) => void;
  setMode: (mode: Fulfillment["mode"]) => void;
  setSlot: (slot: string) => void;
  setPickup: (pickupId: string) => void;
  setProfile: (p: Partial<UserProfile>) => void;
  setPayment: (p: PaymentMethodMock) => void;
  setPromo: (v: boolean) => void;
  setSearch: (v: string) => void;
  setComment: (v: string) => void;
  setConsent: (v: boolean) => void;
  clearCart: () => void;
  completeOrder: (o: Order) => void;
  demo: () => void;
};
const initial = {
  cart: [] as CartItem[],
  favorites: [] as string[],
  addresses: [] as Address[],
  activeAddressId: "",
  fulfillment: { mode: "delivery", pickupId: "", slot: "" } as Fulfillment,
  profile: { name: "", phone: "+7 000 000-00-00", signedIn: true },
  orders: [] as Order[],
  payment: "receipt" as PaymentMethodMock,
  promo: false,
  search: "",
  comment: "",
  consent: true,
};
export const useShop = create<State>()(
  persist(
    (set) => ({
      ...initial,
      changeQuantity: (id, delta) =>
        set((s) => {
          const p = catalog.product(id);
          if (!p) return {};
          const n = Math.min(
            p.stock,
            Math.max(
              0,
              (s.cart.find((x) => x.productId === id)?.quantity || 0) + delta,
            ),
          );
          return {
            cart: n
              ? s.cart.some((x) => x.productId === id)
                ? s.cart.map((x) =>
                    x.productId === id ? { ...x, quantity: n } : x,
                  )
                : [...s.cart, { productId: id, quantity: n }]
              : s.cart.filter((x) => x.productId !== id),
          };
        }),
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((x) => x !== id)
            : [...s.favorites, id],
        })),
      saveAddress: (a) =>
        set((s) => ({
          addresses: [...s.addresses.filter((x) => x.id !== a.id), a],
          activeAddressId: a.id,
          fulfillment: { ...s.fulfillment, slot: "" },
        })),
      deleteAddress: (id) =>
        set((s) => ({
          addresses: s.addresses.filter((x) => x.id !== id),
          activeAddressId: s.activeAddressId === id ? "" : s.activeAddressId,
          fulfillment: { ...s.fulfillment, slot: "" },
        })),
      selectAddress: (id) =>
        set((s) => ({
          activeAddressId: id,
          fulfillment: { ...s.fulfillment, slot: "" },
        })),
      setMode: (mode) =>
        set((s) => ({ fulfillment: { ...s.fulfillment, mode, slot: "" } })),
      setSlot: (slot) =>
        set((s) => ({ fulfillment: { ...s.fulfillment, slot } })),
      setPickup: (pickupId) =>
        set((s) => ({ fulfillment: { ...s.fulfillment, pickupId, slot: "" } })),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      setPayment: (payment) => set({ payment }),
      setPromo: (promo) => set({ promo }),
      setSearch: (search) => set({ search }),
      setComment: (comment) => set({ comment }),
      setConsent: (consent) => set({ consent }),
      clearCart: () => set({ cart: [] }),
      completeOrder: (o) =>
        set((s) =>
          s.orders.some((x) => x.id === o.id)
            ? {}
            : {
                orders: [o, ...s.orders],
                cart: [],
                promo: false,
                comment: "",
                fulfillment: { ...s.fulfillment, slot: "" },
              },
        ),
      demo: () =>
        set({
          ...structuredClone(initial),
          cart: ["raspberry", "khychin-potato", "khychin-cheese", "yogurt"].map(
            (productId) => ({ productId, quantity: 1 }),
          ),
        }),
    }),
    { name: "lastochka-shop", version: 1 },
  ),
);
export const addressText = (a: Address | undefined) =>
  a
    ? `${a.city}, ${a.street}, ${a.house}${a.apartment ? ", кв. " + a.apartment : ""}`
    : "";
