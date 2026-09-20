import type { Metadata } from 'next';
import { Catalog } from '@/features/storefront';
import { api, selectedStore } from '@/lib/upstream';
import { unwrap, Category } from '@/lib/types';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const store = await selectedStore();
    const cat = unwrap<Category>(await api(`stores/${store}/categories/slug/${encodeURIComponent(slug)}`));
    if (cat?.name) {
      return {
        title: cat.name,
        description: `Купить ${cat.name.toLowerCase()} с доставкой из Ласточки Джами. Свежие продукты по выгодным ценам.`,
        openGraph: {
          title: `${cat.name} · Ласточка Джами`,
          description: `Купить ${cat.name.toLowerCase()} с доставкой на дом.`,
          images: cat.image?.path ? [{ url: cat.image.path }] : undefined,
        },
      };
    }
  } catch {
    // Fallback
  }

  return {
    title: 'Категория товаров',
  };
}

export const revalidate = 60;

import { notFound } from 'next/navigation';

export default async function CategoryRoute({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  try {
    return await Catalog({ kind: 'category', id: slug, params: query });
  } catch (err: any) {
    if (err?.status === 404 || err?.statusCode === 404) {
      notFound();
    }
    throw err;
  }
}

