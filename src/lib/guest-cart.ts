import { Product, Cart, CartItem, step, CartStoreGroup } from './types';
import { request } from './client';

const GUEST_CART_STORAGE_KEY = 'lastochka_guest_cart_v1';

export function getGuestCart(): Cart {
  if (typeof window === 'undefined') {
    return { storeGroups: [], totalToPay: 0, total: 0 };
  }
  try {
    const raw = localStorage.getItem(GUEST_CART_STORAGE_KEY);
    if (!raw) return { storeGroups: [], totalToPay: 0, total: 0 };
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : { storeGroups: [], totalToPay: 0, total: 0 };
  } catch {
    return { storeGroups: [], totalToPay: 0, total: 0 };
  }
}

export function saveGuestCart(cart: Cart): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Local storage could be disabled or full
  }
}

export function clearGuestCart(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(GUEST_CART_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

function recalculateCartTotals(storeGroups: CartStoreGroup[]): Cart {
  let grandTotal = 0;

  for (const group of storeGroups) {
    let groupTotal = 0;
    for (const item of group.items) {
      const itemTotal = (item.price || item.product.price || 0) * item.quantity;
      groupTotal += itemTotal;
    }
    group.total = groupTotal;
    group.totalToPay = groupTotal;
    grandTotal += groupTotal;
  }

  return {
    storeGroups: storeGroups.filter((g) => g.items.length > 0),
    total: grandTotal,
    totalToPay: grandTotal,
  };
}

export function addGuestCartItem(p: Product, supplements?: unknown[]): Cart {
  const current = getGuestCart();
  const groups: CartStoreGroup[] = current.storeGroups ? [...current.storeGroups] : [];

  const storeId = p.storeId || 2;
  let targetGroup = groups.find((g) => g.store.id === storeId);

  if (!targetGroup) {
    targetGroup = {
      store: {
        id: storeId,
        name: 'Магазин доставки',
        isPickupEnabled: true,
      },
      items: [],
    };
    groups.push(targetGroup);
  }

  const existingItemIndex = targetGroup.items.findIndex(
    (item) =>
      item.product.id === p.id &&
      JSON.stringify(item.supplements || []) === JSON.stringify(supplements || []),
  );

  const quantityDelta = step(p);

  if (existingItemIndex >= 0) {
    const existing = targetGroup.items[existingItemIndex];
    existing.quantity += quantityDelta;
  } else {
    const newItem: CartItem = {
      id: -Math.floor(Date.now() + Math.random() * 1000), // Negative temporary ID
      quantity: quantityDelta,
      price: p.price,
      product: p,
      supplements: supplements || [],
    };
    targetGroup.items.push(newItem);
  }

  const updatedCart = recalculateCartTotals(groups);
  saveGuestCart(updatedCart);
  return updatedCart;
}

export function setGuestCartQuantity(itemId: number, quantity: number, p?: Product): Cart {
  const current = getGuestCart();
  const groups: CartStoreGroup[] = current.storeGroups ? [...current.storeGroups] : [];

  for (const group of groups) {
    const idx = group.items.findIndex(
      (item) => item.id === itemId || (p && item.product.id === p.id && !item.supplements?.length),
    );
    if (idx >= 0) {
      if (quantity <= 0) {
        group.items.splice(idx, 1);
      } else {
        group.items[idx].quantity = quantity;
      }
      break;
    }
  }

  const updatedCart = recalculateCartTotals(groups);
  saveGuestCart(updatedCart);
  return updatedCart;
}

export async function mergeGuestCartToServer(): Promise<boolean> {
  const guestCart = getGuestCart();
  const items = (guestCart.storeGroups || []).flatMap((g) => g.items || []);
  if (!items.length) return false;

  try {
    for (const item of items) {
      await request('cart/items', 'POST', {
        productId: item.product.id,
        quantity: item.quantity,
        storeId: item.product.storeId || 2,
        supplements: item.supplements,
      }).catch(() => {
        // If an individual item fails (e.g. out of stock), continue with others
      });
    }
    clearGuestCart();
    return true;
  } catch (err) {
    console.error('Failed to merge guest cart to server:', err);
    return false;
  }
}
