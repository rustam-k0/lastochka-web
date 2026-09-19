import type { Metadata } from 'next';
import { PublicContent } from '@/features/account/public-content';

export const metadata: Metadata = {
  title: 'Истории',
  description: 'Полезные истории, советы и рецепты от сети магазинов «Ласточка».',
};

export default function StoriesRoute() {
  return <PublicContent type="stories" />;
}
