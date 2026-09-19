'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User,
  Package,
  Heart,
  Gift,
  MapPin,
  CreditCard,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';
import { useShop, AuthGate } from '@/components/shop-context';

export function AccountLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const s = useShop();

  const navItems = [
    { href: '/profile', label: 'Профиль', Icon: User, exact: true },
    { href: '/orders', label: 'Мои заказы', Icon: Package },
    { href: '/favorites', label: 'Избранное', Icon: Heart },
    { href: '/bonuses', label: 'Карта и бонусы', Icon: Gift },
    { href: '/addresses', label: 'Адреса доставки', Icon: MapPin },
    { href: '/cards', label: 'Способы оплаты', Icon: CreditCard },
    { href: '/notifications', label: 'Уведомления', Icon: Bell },
    { href: '/profile/settings', label: 'Настройки', Icon: Settings },
  ];

  return (
    <AuthGate title="Войдите в личный кабинет">
      <div className="account-container">
        <aside className="account-sidebar panel">
          <div className="account-sidebar-header">
            <h2>Личный кабинет</h2>
          </div>
          <nav className="account-sidebar-nav" aria-label="Разделы личного кабинета">
            {navItems.map(({ href, label, Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`account-sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="account-sidebar-footer">
            <button className="text-button danger" onClick={s.logout} type="button">
              <LogOut size={17} /> Выйти из аккаунта
            </button>
          </div>
        </aside>

        <main className="account-main-content">{children}</main>
      </div>
    </AuthGate>
  );
}
