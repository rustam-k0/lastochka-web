/**
 * Type definitions and normalizers for Lastochka Jami e-commerce store.
 * Replaces loose `any` types with strict DTOs and provides safe normalizers.
 */

export type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  total?: number;
  hasMore?: boolean;
  page?: number;
  perPage?: number;
}

export interface Media {
  id?: number;
  path: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  position?: number;
  isLeaf?: boolean;
  image?: Media | null;
  backgroundImage?: Media | null;
  ancestors?: Category[];
  tagText?: string | null;
  tagColor?: string | null;
}

export interface Store {
  id: number;
  name: string;
  address?: string;
  isActive?: boolean;
  isPickupEnabled?: boolean;
  pickupPaymentMethods?: string[];
}

export interface Address {
  id: number;
  title?: string;
  country?: string;
  city?: string;
  street?: string;
  houseNumber?: string;
  apartment?: string;
  entrance?: string;
  floor?: string;
  intercom?: string;
  comment?: string;
  latitude?: number;
  longitude?: number;
  isActive?: boolean;
  storeId?: number;
  store?: Store;
}

export interface SupplementValue {
  id: number;
  title?: string;
  name?: string;
  price?: number;
}

export interface Supplement {
  id: number;
  title: string;
  isRequired?: boolean;
  values: SupplementValue[];
}

export interface ProductVariant {
  id: number;
  title: string;
  price: number;
  stockQuantity: number;
  images?: Media[];
}

export interface Product {
  id: number;
  storeId: number | null;
  title: string;
  slug?: string;
  description?: string;
  price: number;
  priceOld?: number;
  images: Media[];
  preview: string | null;
  quantityStep: number;
  measurementUnit: string;
  measurementUnitLabel: string;
  weight?: number;
  stockQuantity: number;
  isFavorite: boolean;
  isConfigurable: boolean;
  hasSupplements: boolean;
  hasRequiredSupplements: boolean;
  supplements: Supplement[];
  variants?: ProductVariant[];
  composition?: string;
  additionalInfo?: string;
  proteins?: number;
  fats?: number;
  carbohydrates?: number;
  calories?: number;
  rating?: number;
  reviewsCount: number;
  pickupOnly?: boolean;
  availableFrom?: string;
  category?: Pick<Category, 'id' | 'name' | 'slug'>;
}

export interface CartItem {
  id: number;
  quantity: number;
  price?: number;
  product: Product;
  supplements?: Array<{ supplementId: number; valueIds: number[] }> | unknown[];
  stockWarning?: string;
}

export interface CartStoreGroup {
  store: Store;
  items: CartItem[];
  total?: number;
  totalToPay?: number;
  deliveryCost?: number;
  assemblyCost?: number;
  discount?: number;
  promocode?: string | null;
  bonus?: {
    isEnabled?: boolean;
    balance?: number;
  };
}

export interface Cart {
  storeGroups?: CartStoreGroup[];
  dateGroups?: { items: CartItem[] }[];
  totalToPay?: number;
  total?: number;
}

export interface DeliverySlot {
  id: number;
  timeSlot: string;
  date?: string;
}

export interface DeliverySlotsData {
  slots: DeliverySlot[];
  availablePaymentMethods?: string[];
}

export interface OrderItemDto {
  id: number;
  quantity: number;
  price: number;
  total?: number;
  title?: string;
  productTitle?: string;
  product?: {
    id: number;
    title: string;
  };
}

export interface OrderDto {
  id: number;
  orderId?: number;
  status: string;
  total: number;
  subtotal?: number;
  discount?: number;
  deliveryCost?: number;
  isPaid?: boolean;
  paymentDeclineReason?: string;
  deliverySlotDate?: string;
  deliverySlotTimeSlot?: string;
  shippingMethod?: string;
  createdAt?: string;
  canCancel?: boolean;
  items?: OrderItemDto[];
  confirmationUrl?: string;
}

export interface LoyaltyCardDto {
  status?: string;
  balance?: number;
  cardNumber?: string;
  qrPayload?: string;
}

export interface BonusTransactionDto {
  id: number;
  amount: number;
  description?: string;
  type?: string;
  createdAt?: string;
}

export interface PaymentCardDto {
  id: number;
  cardType?: string;
  type?: string;
  last4?: string;
  lastFour?: string;
}

export interface NotificationDto {
  id: number;
  title: string;
  body?: string;
  text?: string;
  isRead?: boolean;
  createdAt?: string;
}

export interface ReviewDto {
  id: number;
  rating: number;
  text?: string;
  comment?: string;
  userName?: string;
  user?: {
    firstName?: string;
  };
}

export interface AppSettingsDto {
  additionalInfo?: Array<{ key: string; title: string; text?: string }>;
  contacts?: { phones?: string[] };
  checkoutWithoutSlots?: boolean;
  checkoutOptions?: Array<{ code: string; label: string }>;
}

export interface FaqItemDto {
  id: number;
  question: string;
  answer: string;
}

export interface ProductGroupDto {
  id: number;
  title: string;
  slug: string;
  is_recommended?: boolean;
  productsCount?: number;
  image?: Media;
}

export interface BannerDto {
  id: number;
  title: string;
  image?: Media;
  linkType?: string;
  linkProductId?: string | number;
  linkCategoryId?: string | number;
}

export interface StoryDto {
  id: number;
  title: string;
  description?: string;
  text?: string;
  image?: Media;
  preview?: Media;
  videoUrl?: string;
}

export interface UserProfileDto {
  id?: number;
  phone?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  birthDate?: string | null;
  adultConfirmed?: boolean;
}

export interface UserNotificationSettingsDto {
  ordersEnabled?: boolean;
  promoEnabled?: boolean;
  emailEnabled?: boolean;
}

// ---------------------------------------------------------------------------
// Normalizers and Utilities
// ---------------------------------------------------------------------------

export const unwrap = <T = any>(v: any): T => {
  if (v && typeof v === 'object' && 'data' in v) {
    return v.data;
  }
  return v;
};

export const list = <T = any>(v: any): T[] => {
  const unwrapped = unwrap(v);
  return Array.isArray(unwrapped) ? unwrapped : [];
};

export const money = (v: unknown): string => {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 2,
    }).format(v);
  }
  return '—';
};

export const truth = (v: unknown): boolean => {
  return v === true || v === 1 || v === '1' || v === 'true';
};

export const step = (p: Product): number => {
  return Math.max(1, Number(p.quantityStep) || 1);
};

export const quantityLabel = (p: Product, n: number): string => {
  return `${n} ${p.measurementUnitLabel || 'шт'}`;
};

const validUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\/[^\s]+$/i.test(value);

function mediaCandidates(v: any): unknown[] {
  if (!v || typeof v !== 'object') return [];
  return [
    v.image,
    v.cover,
    v.preview,
    v.mainImage,
    ...(Array.isArray(v.images) ? v.images : []),
    v.variant?.image,
    ...(Array.isArray(v.variants)
      ? v.variants.flatMap((x: any) => [x?.image, ...(Array.isArray(x?.images) ? x.images : [])])
      : []),
    v.product?.image,
    ...(Array.isArray(v.product?.images) ? v.product.images : []),
  ];
}

export function normalizeMedia(v: any): Media[] {
  const seen = new Set<string>();
  const result: Media[] = [];

  for (const raw of mediaCandidates(v)) {
    const path = typeof raw === 'string' ? raw : (raw as any)?.path;
    if (!validUrl(path) || seen.has(path)) continue;
    seen.add(path);
    result.push({
      ...(typeof raw === 'object' && raw && Number.isFinite(Number((raw as any).id))
        ? { id: Number((raw as any).id) }
        : {}),
      path,
    });
  }

  return result;
}

export function categoryMedia(v: Partial<Category> | any): {
  foreground: string | null;
  background: string | null;
} {
  return {
    foreground: validUrl(v?.image?.path) ? v.image.path : null,
    background: validUrl(v?.backgroundImage?.path) ? v.backgroundImage.path : null,
  };
}

export function product(v: any): Product {
  const images = normalizeMedia(v);
  return {
    ...v,
    price: Number(v.price),
    priceOld: v.priceOld ? Number(v.priceOld) : undefined,
    weight: v.weight ? Number(v.weight) : undefined,
    stockQuantity: Number(v.stockQuantity) || 0,
    quantityStep: Math.max(1, Number(v.quantityStep) || 1),
    measurementUnit: v.measurementUnit || 'piece',
    measurementUnitLabel: v.measurementUnitLabel || 'шт',
    images,
    preview: images[0]?.path || null,
    supplements: Array.isArray(v.supplements) ? v.supplements : [],
    variants: Array.isArray(v.variants) ? v.variants : [],
    isFavorite: truth(v.isFavorite),
    isConfigurable: truth(v.isConfigurable),
    hasSupplements: truth(v.hasSupplements),
    hasRequiredSupplements: truth(v.hasRequiredSupplements),
    availableFrom:
      v.availableFrom ||
      v.available_from ||
      v.cookingTimeFrom ||
      v.cooking_time_from ||
      v.cookingTime ||
      v.cooking_time ||
      (v.time_from ? `Доступно с ${v.time_from}` : undefined),
    reviewsCount: Number(v.reviewsCount) || 0,
  };
}

export function cartItems(cart: Cart | null | undefined): CartItem[] {
  if (!cart) return [];
  if (Array.isArray(cart.storeGroups)) {
    return cart.storeGroups.flatMap((group) => (Array.isArray(group.items) ? group.items : []));
  }
  if (Array.isArray(cart.dateGroups)) {
    return cart.dateGroups.flatMap((group) => (Array.isArray(group.items) ? group.items : []));
  }
  return [];
}

export function cartChange(before: Cart | null | undefined, after: Cart | null | undefined): string | null {
  const oldItems = new Map(cartItems(before).map((item) => [item.id, item]));
  const newItems = new Map(cartItems(after).map((item) => [item.id, item]));

  const removed = [...oldItems.values()]
    .filter((item) => !newItems.has(item.id))
    .map((item) => item.product.title);

  const changed = [...newItems.values()]
    .filter((item) => oldItems.has(item.id) && oldItems.get(item.id)!.quantity !== item.quantity)
    .map((item) => item.product.title);

  if (!removed.length && !changed.length) return null;

  return [
    removed.length ? `Удалены недоступные товары: ${removed.join(', ')}` : '',
    changed.length ? `Изменено количество: ${changed.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('. ');
}

export function activeStoreId(
  sessionStore: number | null | undefined,
  address: Pick<Address, 'storeId' | 'store'> | null | undefined,
  fallback: number,
): number {
  return Number(address?.storeId || address?.store?.id || sessionStore || fallback);
}
