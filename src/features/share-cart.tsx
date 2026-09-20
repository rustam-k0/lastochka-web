'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBasket, ArrowRight, Loader2, CheckCircle2, ChevronLeft } from 'lucide-react';
import { useShop } from '@/components/shop-context';
import { request } from '@/lib/client';
import { product, Product, money, unwrap } from '@/lib/types';
import { addGuestCartItem, saveGuestCart, getGuestCart } from '@/lib/guest-cart';
import { Photo } from '@/components/ui';

interface ShareItem {
  id: number;
  quantity: number;
  product?: Product;
}

export function ShareCartView() {
  const router = useRouter();
  const s = useShop();

  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [items, setItems] = useState<ShareItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let hash = window.location.hash.replace(/^#/, '').trim();
    if (!hash) {
      const urlParams = new URLSearchParams(window.location.search);
      hash = (urlParams.get('items') || '').trim();
    }

    if (!hash) {
      setError('Ссылка на корзину пуста или содержит неверный формат');
      setLoading(false);
      return;
    }

    // Format: 2035:1,12486:2,236:1
    const rawPairs = hash.split(',').filter(Boolean);
    const parsed: ShareItem[] = [];

    for (const pair of rawPairs) {
      const [idStr, qtyStr] = pair.split(':');
      const id = Number(idStr);
      const quantity = Math.max(1, Number(qtyStr) || 1);
      if (Number.isSafeInteger(id) && id > 0) {
        parsed.push({ id, quantity });
      }
    }

    if (!parsed.length) {
      setError('В полученной ссылке не найдено товаров');
      setLoading(false);
      return;
    }

    // Fetch product details for each item
    Promise.all(
      parsed.map(async (item) => {
        try {
          const res = await request<any>(`products/${item.id}`);
          const prodData = unwrap<any>(res);
          return {
            ...item,
            product: product(prodData),
          };
        } catch {
          return item;
        }
      }),
    )
      .then((loaded) => {
        const valid = loaded.filter((it) => it.product);
        if (!valid.length) {
          setError('Товары из этой ссылки больше недоступны или перемещены');
        } else {
          setItems(valid);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading shared cart:', err);
        setError('Не удалось загрузить товары из ссылки');
        setLoading(false);
      });
  }, []);

  async function handleAddAllToCart() {
    if (adding || !items.length) return;
    setAdding(true);

    try {
      if (s.authenticated) {
        // Add items sequentially or via batch
        for (const it of items) {
          if (!it.product) continue;
          await request('cart/items', 'POST', {
            productId: it.product.id,
            quantity: it.quantity,
            storeId: it.product.storeId || 2,
          });
        }
        await s.refresh();
      } else {
        // Add to guest cart
        for (const it of items) {
          if (!it.product) continue;
          // Apply quantity
          for (let step = 0; step < it.quantity; step++) {
            addGuestCartItem(it.product);
          }
        }
        await s.refresh();
      }

      setAdded(true);
      s.notice('Товары добавлены в корзину');
      setTimeout(() => {
        router.push('/cart');
      }, 1000);
    } catch (err: any) {
      console.error('Error importing cart:', err);
      s.notice(err?.message || 'Не удалось перенести все товары в корзину');
      setAdding(false);
    }
  }

  const grandTotal = items.reduce((acc, it) => {
    return acc + (it.product?.price || 0) * it.quantity;
  }, 0);

  return (
    <div className="share-cart-page container">
      <div className="breadcrumbs">
        <Link href="/">Главная</Link>
        <span>/</span>
        <Link href="/cart">Корзина</Link>
        <span>/</span>
        <span>Общая корзина</span>
      </div>

      <div className="share-cart-card">
        <div className="share-cart-page-header">
          <div className="share-cart-badge">
            <ShoppingBasket size={24} />
          </div>
          <h1>Корзина, которой с вами поделились</h1>
          <p className="muted">
            Вы можете перенести все эти товары в свою корзину и оформить заказ
          </p>
        </div>

        {loading ? (
          <div className="share-cart-loading">
            <Loader2 className="spinner" size={36} />
            <p>Загрузка товаров из корзины…</p>
          </div>
        ) : error ? (
          <div className="share-cart-error">
            <p>{error}</p>
            <Link href="/catalog" className="primary">
              Перейти в каталог
            </Link>
          </div>
        ) : (
          <>
            <div className="share-cart-list">
              {items.map((it) => (
                <div key={it.id} className="share-cart-item">
                  <div className="share-cart-item-photo">
                    <Photo
                      src={it.product?.preview || undefined}
                      alt={it.product?.title || 'Товар'}
                      width={64}
                      height={64}
                    />
                  </div>
                  <div className="share-cart-item-details">
                    <Link
                      href={`/product/${it.product?.id}`}
                      className="share-cart-item-title"
                    >
                      {it.product?.title}
                    </Link>
                    <div className="share-cart-item-meta">
                      <span className="share-cart-item-qty">{it.quantity} шт</span>
                      <span className="share-cart-item-price">
                        {money((it.product?.price || 0) * it.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="share-cart-summary">
              <div className="share-cart-total-row">
                <span>Итого к переносу:</span>
                <strong>{money(grandTotal)}</strong>
              </div>

              <div className="share-cart-footer-actions">
                <button
                  type="button"
                  className="primary share-cart-add-all-btn"
                  onClick={handleAddAllToCart}
                  disabled={adding || added}
                >
                  {added ? (
                    <>
                      <CheckCircle2 size={20} />
                      Товары добавлены! Переходим в корзину…
                    </>
                  ) : adding ? (
                    <>
                      <Loader2 className="spinner" size={20} />
                      Добавляем в вашу корзину…
                    </>
                  ) : (
                    <>
                      <ShoppingBasket size={20} />
                      Добавить всё в корзину
                    </>
                  )}
                </button>

                <Link href="/catalog" className="secondary share-cart-catalog-link">
                  Продолжить покупки в каталоге
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
