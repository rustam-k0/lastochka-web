import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { ShopProvider } from '@/components/shop-context';
import { Header } from '@/components/header';
import { publicApi, selectedStore } from '@/lib/upstream';
import { unwrap, Store } from '@/lib/types';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#e20a25',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: 'Ласточка Джами — любимые продукты рядом',
    template: '%s · Ласточка',
  },
  description:
    'Продукты, свежая выпечка и готовые блюда. Каталог, быстрая доставка и самовывоз из Ласточки Джами.',
  applicationName: 'Ласточка',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Ласточка Джами',
    title: 'Ласточка Джами — любимые продукты рядом',
    description:
      'Продукты, свежая выпечка и готовые блюда. Каталог, быстрая доставка и самовывоз из Ласточки Джами.',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let store: Store | null = null;
  try {
    const storeId = await selectedStore();
    store = unwrap<Store>(await publicApi(`stores/${storeId}`));
  } catch {
    // Graceful fallback to default null
  }

  return (
    <html lang="ru">
      <body>
        <a className="skip-link" href="#main">
          Перейти к содержимому
        </a>
        <ShopProvider>
          <Suspense>
            <Header store={store} />
          </Suspense>
          <main id="main" className="container">
            {children}
          </main>
          <footer className="container footer">
            <Link className="footer-brand" href="/">
              Ласточка Джами
            </Link>
            <span>Всё любимое — рядом</span>
            <Link href="/faq">Вопросы и ответы</Link>
            <Link href="/info">Информация и контакты</Link>
          </footer>
        </ShopProvider>
      </body>
    </html>
  );
}
