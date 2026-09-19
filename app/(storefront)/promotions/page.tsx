import type { Metadata } from 'next';
import { PublicContent } from '@/features/account/public-content';

export const metadata: Metadata = {
  title: 'Акции и специальные предложения',
  description: 'Все актуальные акции, скидки и специальные предложения сети магазинов «Ласточка».',
};

export default function PromotionsRoute() {
  return <PublicContent type="promotions" />;
}
