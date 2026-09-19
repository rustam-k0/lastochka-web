'use client';

import Link from 'next/link';
import {
  Package,
  Heart,
  Tag,
  CreditCard,
  MapPin,
  Settings,
  ChevronRight,
  LogOut,
  User,
} from 'lucide-react';
import { unwrap, UserProfileDto } from '@/lib/types';
import { useShop } from '@/components/shop-context';
import { LoyaltyCard } from '../bonuses/loyalty-card';
import { useRemote, RemoteState } from '../hooks/use-remote';

export function ProfileView() {
  const remote = useRemote<UserProfileDto>('auth/profile');
  const s = useShop();
  const profile = unwrap<UserProfileDto>(remote.data);

  const navItems = [
    { href: '/orders', title: 'Мои заказы', Icon: Package },
    { href: '/promotions', title: 'Акции и промокоды', Icon: Tag },
    { href: '/cards', title: 'Способы оплаты', Icon: CreditCard },
    { href: '/addresses', title: 'Адреса доставки', Icon: MapPin },
    { href: '/favorites', title: 'Избранные товары', Icon: Heart },
    { href: '/profile/settings', title: 'Настройки профиля', Icon: Settings },
  ];

  return (
    <div className="account-section profile-page">
      <div className="section-header">
        <h1>Профиль</h1>
      </div>

      <RemoteState r={remote}>
        <div className="profile-hero panel">
          <div className="profile-avatar">
            <User size={28} />
          </div>
          <div className="profile-hero-info">
            <h2>{profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : 'Покупатель'}</h2>
            <p className="muted">{profile?.phone || 'Телефон не указан'}</p>
          </div>
          <Link href="/profile/settings" className="secondary settings-btn">
            <Settings size={16} /> Настроить
          </Link>
        </div>

        <LoyaltyCard />

        <div className="account-flat-list">
          {navItems.map(({ href, title, Icon }) => (
            <Link href={href} key={href} className="account-flat-item">
              <div className="account-item-left">
                <div className="account-item-icon">
                  <Icon size={19} />
                </div>
                <span className="account-item-title">{title}</span>
              </div>
              <ChevronRight size={18} className="account-chevron" />
            </Link>
          ))}
        </div>

        <div className="logout-wrapper">
          <button className="text-button danger" onClick={s.logout} type="button">
            <LogOut size={18} /> Выйти из аккаунта
          </button>
        </div>
      </RemoteState>
    </div>
  );
}
