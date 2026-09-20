import type { Metadata } from 'next';
import { Catalog } from '@/features/storefront';

export const revalidate = 60;

import { notFound } from 'next/navigation';

export default async function CollectionRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  try {
    return await Catalog({ kind: 'collection', id: slug, params: query });
  } catch (err: any) {
    if (err?.status === 404 || err?.statusCode === 404) {
      notFound();
    }
    throw err;
  }
}

