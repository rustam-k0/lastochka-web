export type Product = {
  id: string;
  sku: string;
  name: string;
  image: string;
  categoryId: string;
  price: number;
  unit: string;
  stock: number;
  quantityStep: number;
  description: string;
};
export type Category = {
  id: string;
  name: string;
  image: string;
  group: string;
  color: string;
  order: number;
};
export type Collection = {
  id: string;
  name: string;
  image: string;
  color: string;
  productIds: string[];
};
export type CartItem = { productId: string; quantity: number };
export type Address = {
  id: string;
  city: string;
  street: string;
  house: string;
  apartment: string;
  entrance: string;
  comment: string;
};
export type Fulfillment = {
  mode: "delivery" | "pickup";
  pickupId: string;
  slot: string;
};
export type UserProfile = { name: string; phone: string; signedIn: boolean };
export type PaymentMethodMock = "receipt" | "demo-card";
export type OrderLine = { product: Product; quantity: number };
export type Order = {
  id: string;
  createdAt: string;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  fulfillment: Fulfillment;
  destination: string;
  comment: string;
  payment: PaymentMethodMock;
  status: "Тестовый заказ";
};
export type Promotion = { code: string; percent: number; description: string };
export type Notification = { id: string; title: string };
export type LoyaltyAccount = { balance: number; code: string };
