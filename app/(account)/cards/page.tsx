import type { Metadata } from 'next';
import { CardsView } from '@/features/account/cards/cards-view';

export const metadata: Metadata = {
  title: 'Способы оплаты',
};

export default function CardsRoute() {
  return <CardsView />;
}
