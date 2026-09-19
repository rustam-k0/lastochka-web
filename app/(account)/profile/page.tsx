import type { Metadata } from 'next';
import { ProfileView } from '@/features/account/profile/profile-view';

export const metadata: Metadata = {
  title: 'Профиль покупателя',
};

export default function ProfileRoute() {
  return <ProfileView />;
}
