import type { Metadata } from 'next';
import { FavoritesView } from '@/features/account/favorites/favorites-view';
import { AuthGate } from '@/components/shop-context';

export const metadata: Metadata = {
  title: 'Избранные товары',
};

export default function FavoritesRoute() {
  return (
    <AuthGate title="Любимые товары всегда под рукой">
      <FavoritesView />
    </AuthGate>
  );
}
