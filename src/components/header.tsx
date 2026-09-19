'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  Heart,
  UserRound,
  ShoppingBasket,
  House,
  LayoutGrid,
  Bell,
  ChevronDown,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { useShop } from './shop-context';
import { request } from '@/lib/client';
import { list, money, cartChange, Store, CartItem } from '@/lib/types';
import { Modal, Photo } from './ui';

export function Header({ store }: { store: Store | null }) {
  const s = useShop();
  const router = useRouter();
  const path = usePathname();

  const [chooseStoreOpen, setChooseStoreOpen] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [busy, setBusy] = useState(false);
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false);
  const cartPreviewTimeout = useRef<NodeJS.Timeout | null>(null);

  const items: CartItem[] =
    s.cart?.storeGroups?.flatMap((g) => g.items) ||
    s.cart?.dateGroups?.flatMap((g) => g.items) ||
    [];
  const total = s.cart?.totalToPay ?? s.cart?.total;

  const nav = [
    { href: '/', title: 'Главная', Icon: House },
    { href: '/catalog', title: 'Каталог', Icon: LayoutGrid },
    { href: '/favorites', title: 'Избранное', Icon: Heart },
    { href: '/profile', title: 'Профиль', Icon: UserRound },
  ];

  async function openStorePicker() {
    setChooseStoreOpen(true);
    await s.run(async () => setStores(list(await request('stores'))));
  }

  async function selectStore(id: number) {
    setBusy(true);
    await s.run(async () => {
      const beforeCart = s.cart;
      const result = await request<any>('/api/store', 'POST', { storeId: id });
      if (Number(result?.store?.id) !== id) {
        throw new Error(
          'Сервер выбрал другой магазин. Обновите страницу и повторите выбор.',
        );
      }
      await s.refresh();
      setChooseStoreOpen(false);
      s.notice(cartChange(beforeCart, result.cart) || `Магазин «${result.store.name}» выбран`);
      router.refresh();
    });
    setBusy(false);
  }

  const handleCartMouseEnter = () => {
    if (cartPreviewTimeout.current) clearTimeout(cartPreviewTimeout.current);
    setCartPreviewOpen(true);
  };

  const handleCartMouseLeave = () => {
    cartPreviewTimeout.current = setTimeout(() => {
      setCartPreviewOpen(false);
    }, 250);
  };

  return (
    <>
      <div className="topline">
        <div className="container">
          <span>Продукты, выпечка и готовые блюда с доставкой от «Ласточки»</span>
          <Link href="/faq">Помощь и ответы на вопросы ↗</Link>
        </div>
      </div>

      <header className="header">
        <div className="container header-row">
          <Link href="/" className="brand">
            <img src="/images/logo.webp" alt="Ласточка" width={46} height={46} />
            <span>
              Ласточка<small>Джами</small>
            </span>
          </Link>

          <Link className="catalog-button" href="/catalog">
            <LayoutGrid size={20} /> Каталог
          </Link>

          <SearchBox />

          <button className="location" onClick={openStorePicker} type="button">
            <MapPin size={21} />
            <span>
              <small>Магазин каталога</small>
              {store?.name || 'Выбрать магазин'}
            </span>
            <ChevronDown size={15} />
          </button>

          <Link className="header-action" href="/profile">
            <UserRound />
            <span>{s.authenticated ? 'Кабинет' : 'Войти'}</span>
          </Link>

          {/* Cart button with desktop popover */}
          <div
            className="cart-button-container"
            onMouseEnter={handleCartMouseEnter}
            onMouseLeave={handleCartMouseLeave}
          >
            <Link className="cart-button" href="/cart">
              <ShoppingBasket />
              <span>
                {typeof total === 'number' && total > 0 ? money(total) : 'Корзина'}
                {items.length > 0 && <small>{items.length}</small>}
              </span>
            </Link>

            {/* Desktop Cart Preview Popover */}
            {cartPreviewOpen && (
              <div className="cart-preview-popover">
                <div className="cart-preview-header">
                  <strong>Корзина</strong>
                  <span className="muted">{items.length} поз.</span>
                </div>

                {items.length > 0 ? (
                  <>
                    <div className="cart-preview-items">
                      {items.slice(0, 5).map((it) => (
                        <div key={it.id} className="cart-preview-item">
                          <Photo
                            src={it.product.preview || undefined}
                            alt={it.product.title}
                            width={40}
                            height={40}
                            className="cart-preview-photo"
                          />
                          <div className="cart-preview-info">
                            <span className="cart-preview-title">{it.product.title}</span>
                            <small className="muted">
                              {it.quantity} шт · {money(it.price || it.product.price)}
                            </small>
                          </div>
                        </div>
                      ))}
                      {items.length > 5 && (
                        <p className="cart-preview-more muted">И ещё {items.length - 5} товаров…</p>
                      )}
                    </div>

                    <div className="cart-preview-footer">
                      <div className="cart-preview-total">
                        <span>Итого:</span>
                        <strong>{money(total)}</strong>
                      </div>
                      <Link
                        href="/cart"
                        className="primary cart-preview-checkout-btn"
                        onClick={() => setCartPreviewOpen(false)}
                      >
                        Перейти к оформлению <ArrowRight size={16} />
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="cart-preview-empty">
                    <p className="muted">В вашей корзине пока пусто</p>
                    <Link
                      href="/catalog"
                      className="secondary cart-preview-catalog-btn"
                      onClick={() => setCartPreviewOpen(false)}
                    >
                      Перейти в каталог
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="container mobile-address">
          <button onClick={openStorePicker} type="button">
            <MapPin size={17} />
            {store?.name || 'Выберите магазин'}
            <ChevronDown size={15} />
          </button>
          <Link href="/addresses">Адрес доставки →</Link>
          <Link href="/notifications" aria-label="Уведомления">
            <Bell size={19} />
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav" aria-label="Основная навигация">
        {nav.map(({ href, title, Icon }) => (
          <Link
            key={href}
            href={href}
            className={href === '/' ? (path === '/' ? 'active' : '') : path.startsWith(href) ? 'active' : ''}
          >
            <Icon size={21} />
            <span>{title}</span>
          </Link>
        ))}
      </nav>

      {/* Mobile Floating Action Buttons */}
      <div className="float-actions">
        <Link href="/search">
          <Search size={18} /> Поиск
        </Link>
        <Link href="/cart">
          <ShoppingBasket size={18} />
          {typeof total === 'number' && total > 0
            ? money(total)
            : `Корзина${items.length ? ' · ' + items.length : ''}`}
        </Link>
      </div>

      {chooseStoreOpen && (
        <Modal title="Выбор магазина" onClose={() => setChooseStoreOpen(false)}>
          <p className="muted">
            Для доставки магазин определяется вашим активным адресом. Выбор магазина ниже меняет
            витрину при самовывозе.
          </p>
          <Link
            href="/addresses"
            className="primary block"
            onClick={() => setChooseStoreOpen(false)}
          >
            Выбрать адрес доставки
          </Link>
          <div className="stack stores-list">
            {stores.map((st) => (
              <button
                key={st.id}
                className="store-option"
                disabled={busy}
                onClick={() => selectStore(st.id)}
                type="button"
              >
                <MapPin />
                <span>
                  <strong>{st.name}</strong>
                  <small>{st.address || 'Адрес не указан'}</small>
                </span>
                {store?.id === st.id && <span className="selected-check">✓</span>}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

export function SearchBox() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let active = true;
    const t = setTimeout(() => {
      request<any>('search/suggestions?query=' + encodeURIComponent(q))
        .then((d) => {
          if (active) setSuggestions(list(d).slice(0, 5));
        })
        .catch(() => setSuggestions([]));
    }, 300);

    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <form
      className="search-box"
      action="/search"
      onSubmit={(e) => {
        e.preventDefault();
        setSuggestions([]);
        router.push('/search?query=' + encodeURIComponent(q));
      }}
    >
      <Search size={21} />
      <input
        name="query"
        aria-label="Поиск товаров"
        placeholder="Найти любимые продукты и блюда"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        minLength={2}
      />
      <button aria-label="Найти" type="submit">
        →
      </button>
      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((v, i) => {
            const text = typeof v === 'string' ? v : v.title || v.text || v.query;
            return text ? (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setQ(text);
                  setSuggestions([]);
                  router.push('/search?query=' + encodeURIComponent(text));
                }}
              >
                {text}
              </button>
            ) : null;
          })}
        </div>
      )}
    </form>
  );
}
