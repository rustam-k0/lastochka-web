import type { Metadata } from 'next';
import { OrdersView } from '@/features/account/orders/orders-view';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Заказ № ${id}`,
  };
}

export default async function OrderDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OrdersView id={id} />;
}
