import type { Metadata } from 'next';
import { ShareCartView } from '@/features/share-cart';

export const metadata: Metadata = {
  title: 'Общая корзина товаров',
  description: 'Просмотрите товары из общей корзины и добавьте их в свой заказ в Ласточке.',
};

export default function ShareCartPage() {
  return <ShareCartView />;
}
