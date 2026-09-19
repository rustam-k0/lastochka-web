import type { Metadata } from 'next';
import { OrdersView } from '@/features/account/orders/orders-view';

export const metadata: Metadata = {
  title: 'Статус оплаты заказа',
};

export default async function PaymentReturnRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const orderId = typeof query.orderId === 'string' ? query.orderId : undefined;
  return <OrdersView id={orderId} paymentReturn />;
}
