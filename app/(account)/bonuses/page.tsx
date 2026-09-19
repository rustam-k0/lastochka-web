import type { Metadata } from 'next';
import { BonusesView } from '@/features/account/bonuses/bonuses-view';

export const metadata: Metadata = {
  title: 'Карта лояльности и бонусы',
};

export default function BonusesRoute() {
  return <BonusesView />;
}
