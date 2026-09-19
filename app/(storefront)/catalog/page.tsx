import type { Metadata } from 'next';
import { Catalog } from '@/features/storefront';

export const metadata: Metadata = {
  title: 'Каталог продуктов',
  description: 'Широкий ассортимент свежих продуктов, готовых блюд и напитков в Ласточке Джами.',
};

export const revalidate = 60;

export default async function CatalogRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return await Catalog({ kind: 'catalog', params: query });
}
