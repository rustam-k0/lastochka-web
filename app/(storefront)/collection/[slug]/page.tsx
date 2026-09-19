import type { Metadata } from 'next';
import { Catalog } from '@/features/storefront';

export const revalidate = 60;

export default async function CollectionRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  return await Catalog({ kind: 'collection', id: slug, params: query });
}
