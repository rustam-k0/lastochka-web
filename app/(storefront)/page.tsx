import { Home } from '@/features/storefront';

export const revalidate = 60;

export default async function HomePage() {
  return await Home();
}
