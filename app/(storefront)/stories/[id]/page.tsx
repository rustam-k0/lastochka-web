import type { Metadata } from 'next';
import { PublicContent } from '@/features/account/public-content';

export const metadata: Metadata = {
  title: 'Истории',
  description: 'Интересные статьи, рецепты и истории от команды Ласточка Джами.',
};

export default async function StoryDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PublicContent type="stories" id={id} />;
}
