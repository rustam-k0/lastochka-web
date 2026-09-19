import type { Metadata } from 'next';
import { CartPage } from '@/features/cart';

export const metadata: Metadata = {
  title: 'Корзина и оформление заказа',
  description: 'Проверьте выбранные товары, укажите адрес и время доставки в Ласточке Джами.',
};

export default function CartRoute() {
  return <CartPage />;
}
