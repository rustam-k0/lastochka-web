import type { Metadata } from 'next';
import { ProfileSettingsView } from '@/features/account/profile/profile-settings';

export const metadata: Metadata = {
  title: 'Настройки профиля',
};

export default function SettingsRoute() {
  return <ProfileSettingsView />;
}
