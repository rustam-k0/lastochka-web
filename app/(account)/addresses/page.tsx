import type { Metadata } from 'next';
import { AddressesView } from '@/features/account/addresses/addresses-view';

export const metadata: Metadata = {
  title: 'Адреса доставки',
};

export default function AddressesRoute() {
  return <AddressesView />;
}
