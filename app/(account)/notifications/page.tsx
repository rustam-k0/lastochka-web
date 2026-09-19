import type { Metadata } from 'next';
import { NotificationsView } from '@/features/account/notifications/notifications-view';

export const metadata: Metadata = {
  title: 'Уведомления',
};

export default function NotificationsRoute() {
  return <NotificationsView />;
}
