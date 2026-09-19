import type { Metadata } from 'next';
import { AccountLayout } from '@/features/account/account-layout';

export const metadata: Metadata = {
  title: 'Личный кабинет',
  description: 'Управление заказами, адресами доставки и бонусным счётом в магазине Ласточка Джами.',
};

export default function AccountRouteLayout({ children }: { children: React.ReactNode }) {
  return <AccountLayout>{children}</AccountLayout>;
}
