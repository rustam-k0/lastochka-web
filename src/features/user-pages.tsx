'use client';

/**
 * Re-exports from modular account packages for backward compatibility.
 */
export { useRemote, RemoteState } from './account/hooks/use-remote';
export { LoyaltyCard } from './account/bonuses/loyalty-card';
export { BonusesView as Bonuses } from './account/bonuses/bonuses-view';
export { FavoritesView as Favorites } from './account/favorites/favorites-view';
export { AddressesView as Addresses } from './account/addresses/addresses-view';
export { OrdersView as Orders, goPayment } from './account/orders/orders-view';
export { CardsView as Cards } from './account/cards/cards-view';
export { ProfileView as Profile } from './account/profile/profile-view';
export { ProfileSettingsView as SettingsPage } from './account/profile/profile-settings';
export { NotificationsView as Notifications } from './account/notifications/notifications-view';
export { Reviews } from './account/reviews/reviews-view';
export { PublicContent } from './account/public-content';
export { AccountLayout } from './account/account-layout';

import { AuthGate } from '@/components/shop-context';
import { FavoritesView } from './account/favorites/favorites-view';
import { ProfileView } from './account/profile/profile-view';
import { ProfileSettingsView } from './account/profile/profile-settings';
import { AddressesView } from './account/addresses/addresses-view';
import { CardsView } from './account/cards/cards-view';
import { OrdersView } from './account/orders/orders-view';
import { NotificationsView } from './account/notifications/notifications-view';
import { BonusesView } from './account/bonuses/bonuses-view';
import { PublicContent } from './account/public-content';

export function AccountPage({
  path,
  query,
}: {
  path: string[];
  query: Record<string, string | string[] | undefined>;
}) {
  const type = path[0];

  if (type === 'promotions' || type === 'stories') {
    return <PublicContent type={type} id={path[1]} />;
  }

  return (
    <AuthGate
      title={
        type === 'favorites' ? 'Любимые товары всегда под рукой' : 'Войдите в свой аккаунт'
      }
    >
      {type === 'favorites' ? (
        <FavoritesView />
      ) : type === 'profile' ? (
        path[1] === 'settings' ? (
          <ProfileSettingsView />
        ) : (
          <ProfileView />
        )
      ) : type === 'addresses' ? (
        <AddressesView />
      ) : type === 'cards' ? (
        <CardsView />
      ) : type === 'orders' ? (
        <OrdersView id={path[1]} />
      ) : type === 'payment' ? (
        <OrdersView
          id={typeof query.orderId === 'string' ? query.orderId : undefined}
          paymentReturn
        />
      ) : type === 'notifications' ? (
        <NotificationsView />
      ) : (
        <BonusesView />
      )}
    </AuthGate>
  );
}
