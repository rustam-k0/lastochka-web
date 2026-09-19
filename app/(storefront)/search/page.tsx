import type { Metadata } from 'next';
import { Catalog } from '@/features/storefront';

export const metadata: Metadata = {
  title: 'Поиск товаров',
  description: 'Поиск свежих продуктов, готовой еды и напитков в интернет-магазине Ласточка Джами.',
};

export default async function SearchRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return await Catalog({ kind: 'search', params: query });
}
