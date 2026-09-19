import type { Metadata } from 'next';
import { OrdersView } from '@/features/account/orders/orders-view';

export const metadata: Metadata = {
  title: 'Мои заказы',
};

export default function OrdersRoute() {
  return <OrdersView />;
}
