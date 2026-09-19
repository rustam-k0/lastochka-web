import type { Metadata } from 'next';
import { PublicContent } from '@/features/account/public-content';

export const metadata: Metadata = {
  title: 'Акции и спецпредложения',
  description: 'Специальные скидки, промокоды и акции в Ласточке Джами.',
};

export default async function PromotionDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PublicContent type="promotions" id={id} />;
}
