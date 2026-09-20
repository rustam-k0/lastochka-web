'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBasket,
  Trash2,
  Share2,
  Clock,
  MapPin,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  CreditCard,
  Truck,
  Store as StoreIcon,
  Plus,
  Minus,
} from 'lucide-react';
import { useShop, AuthGate } from '@/components/shop-context';
import { Photo, Empty, ErrorMessage, Modal } from '@/components/ui';
import { ShareCartModal } from '@/components/share-cart-modal';
import { paymentReturnUrl, request } from '@/lib/client';
import {
  Cart,
  CartItem,
  CartStoreGroup,
  Address,
  money,
  list,
  unwrap,
  product,
  truth,
  Product,
} from '@/lib/types';
import { useRemote } from './account/hooks/use-remote';
import { goPayment } from './account/orders/orders-view';
import { clearGuestCart } from '@/lib/guest-cart';

export function CartPage() {
  return (
    <AuthGate title="Войдите, чтобы открыть корзину">
      <CartContent />
    </AuthGate>
  );
}

function CartContent() {
  const s = useShop();
  const router = useRouter();
  const addressesRemote = useRemote<Address[]>(s.authenticated ? 'addresses' : null);
  const settingsRemote = useRemote<any>('app-settings');

  const [mode, setMode] = useState<'courier' | 'pickup'>('courier');
  const [addressId, setAddressId] = useState('');
  const [guestAddress, setGuestAddress] = useState({
    city: 'Нальчик',
    street: '',
    house: '',
    apartment: '',
  });

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date());
  const [date, setDate] = useState(todayStr);
  const [slot, setSlot] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [payment, setPayment] = useState('card');
  const [comment, setComment] = useState('');
  const [promo, setPromo] = useState('');
  const [busy, setBusy] = useState(false);
  const [bonus, setBonus] = useState<'earn' | 'spend'>('earn');
  const [spend, setSpend] = useState('');
  const [reviewModal, setReviewModal] = useState<any>();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [localCart, setLocalCart] = useState<Cart | null>(null);
  const [termsAgreed, setTermsAgreed] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const lock = useRef(false);

  const cart = localCart || s.cart;
  const groups: CartStoreGroup[] = cart?.storeGroups || [];
  const group = groups[0];
  const storeId = group?.store?.id || 2;

  const appSettings = unwrap<any>(settingsRemote.data);

  // Delivery slot endpoint
  const slotPath =
    storeId && (mode === 'pickup' || addressId || !s.authenticated)
      ? `stores/${storeId}/${mode === 'pickup' ? 'pickup' : 'delivery'}-slots?date=${date}${
          mode === 'courier' && addressId ? '&addressId=' + addressId : ''
        }`
      : null;

  const slotsRemote = useRemote<any>(s.authenticated ? slotPath : null);
  const slotData = unwrap<any>(slotsRemote.data);

  // Featured upsell dishes ("Фирменные блюда")
  const featuredRemote = useRemote<any>(storeId ? `product-groups/3/products?storeId=${storeId}&perPage=8` : null);
  const featuredProducts = list(featuredRemote.data).map(product);

  const paymentMethods =
    mode === 'pickup'
      ? group?.store?.pickupPaymentMethods
      : slotData?.availablePaymentMethods;

  const items: CartItem[] = groups.flatMap((g) => g.items || []) || [];

  // Базовая стоимость товаров: сумма цен позиций в корзине
  const calculatedItemsTotal = items.reduce(
    (acc, it) => acc + (it.price || it.product?.price || 0) * it.quantity,
    0,
  );

  // Итоговая сумма к оплате:
  // Если бэкенд возвращает 0 (например, пока адрес доставки не выбран пользователем),
  // используем расчётную стоимость товаров, чтобы на странице не отображалось 0,00 ₽
  const serverTotal = group?.totalToPay ?? group?.total ?? cart?.totalToPay;
  const total =
    typeof serverTotal === 'number' && serverTotal > 0
      ? serverTotal
      : calculatedItemsTotal;

  useEffect(() => {
    setLocalCart(null);
  }, [s.cart]);

  useEffect(() => {
    if (s.authenticated && addressesRemote.data) {
      const active = list<Address>(addressesRemote.data).find((a) => a.isActive);
      if (active && !addressId) {
        setAddressId(String(active.id));
      }
    }
  }, [addressesRemote.data, addressId, s.authenticated]);

  useEffect(() => {
    setSlot('');
    setReviewModal(undefined);
    if (storeId && s.authenticated) {
      void s.run(async () => {
        const latest = unwrap<Cart>(
          await request(`cart?shippingMethod=${mode}${addressId ? '&addressId=' + addressId : ''}`),
        );
        setLocalCart(latest);
      });
    }
  }, [mode, addressId, storeId, s.authenticated]);

  async function handleClearCart() {
    if (!confirm('Удалить все товары из корзины?')) return;
    if (s.authenticated) {
      await s.run(async () => {
        await request('cart', 'DELETE');
        await s.refresh();
      });
    } else {
      clearGuestCart();
      await s.refresh();
      s.notice('Корзина очищена');
    }
  }

  function handleShare() {
    if (!items.length) {
      s.notice('В вашей корзине пока нет товаров');
      return;
    }
    setShareModalOpen(true);
  }

  async function prepareOrder(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (lock.current) return;

    if (!termsAgreed) {
      s.notice('Пожалуйста, подтвердите согласие с условиями использования и офертой');
      return;
    }

    if (!s.authenticated) {
      // Prompt user to log in via SMS right at the checkout confirmation step
      s.notice('Для оформления заказа подтвердите номер телефона');
      s.login();
      return;
    }

    lock.current = true;
    setBusy(true);

    await s.run(async () => {
      const latest = unwrap<Cart>(
        await request(`cart?shippingMethod=${mode}${addressId ? '&addressId=' + addressId : ''}`),
      );
      setLocalCart(latest);

      const targetGroup = latest.storeGroups?.find((x) => x.store.id === storeId);
      if (!targetGroup?.items?.length) {
        throw new Error('В корзине не осталось доступных товаров');
      }

      const latestTotal = targetGroup.totalToPay ?? targetGroup.total ?? latest.totalToPay;
      const latestItemsTotal = (targetGroup.items || []).reduce(
        (acc: number, it: any) => acc + (it.price || it.product?.price || 0) * it.quantity,
        0,
      );
      const confirmedTotal =
        typeof latestTotal === 'number' && latestTotal > 0 ? latestTotal : latestItemsTotal;
      if (typeof confirmedTotal !== 'number' || confirmedTotal <= 0) {
        throw new Error(
          'Магазин пока не передаёт подтверждённый итог корзины. Товары в корзине сохранены.',
        );
      }

      setReviewModal({ cart: latest, total: confirmedTotal, storeId });
    });

    lock.current = false;
    setBusy(false);
  }

  async function submitFinalOrder() {
    if (lock.current || !reviewModal) return;
    lock.current = true;
    setBusy(true);

    try {
      await s.run(async () => {
        const current = unwrap<Cart>(
          await request(`cart?shippingMethod=${mode}${addressId ? '&addressId=' + addressId : ''}`),
        );

        if (JSON.stringify(current) !== JSON.stringify(reviewModal.cart)) {
          setLocalCart(current);
          setReviewModal(undefined);
          throw new Error('Данные корзины изменились. Проверьте позиции и сумму.');
        }

        const payload = {
          storeId,
          addressId: mode === 'courier' ? Number(addressId) : null,
          shippingMethod: mode,
          deliverySlotId: slot ? Number(slot) : null,
          comment,
          paymentType: payment,
          bonusAction: bonus,
          ...(bonus === 'spend' ? { bonusSpendAmount: Math.round(Number(spend) * 100) } : {}),
          checkoutOptions: selectedOptions,
          returnUrl: paymentReturnUrl('/payment', s.publicOrigin),
        };

        const fingerprint = JSON.stringify(payload);
        let pending: any = null;
        try {
          pending = JSON.parse(sessionStorage.getItem('pending-order') || 'null');
        } catch {
          // Ignore
        }

        const idempotencyKey =
          pending?.fingerprint === fingerprint ? pending.key : crypto.randomUUID();
        sessionStorage.setItem('pending-order', JSON.stringify({ key: idempotencyKey, fingerprint }));

        const orderResult = await request<any>('orders', 'POST', {
          ...payload,
          idempotencyKey,
        });

        sessionStorage.removeItem('pending-order');
        sessionStorage.setItem('last-order', String(orderResult.orderId));
        await s.refresh();

        if (orderResult.confirmationUrl) {
          goPayment(orderResult.confirmationUrl);
        } else {
          router.push('/orders/' + orderResult.orderId);
        }
      });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (!cart) {
    return <p className="muted">Загружаем корзину…</p>;
  }

  if (!items.length) {
    return (
      <Empty title="В корзине пока пусто">
        <p>Добавьте любимые продукты, свежую выпечку или готовые блюда.</p>
        <Link className="primary" href="/catalog">
          Перейти в каталог
        </Link>
      </Empty>
    );
  }

function formatRub(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v)) {
    const hasDecimals = v % 1 !== 0;
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(v);
  }
  return '—';
}

  const selectedSlotObj = slotData?.slots?.find((sItem: any) => String(sItem.id) === String(slot));
  const timeBannerText = selectedSlotObj
    ? `${date === todayStr ? 'Сегодня' : date}, ${selectedSlotObj.timeSlot}`
    : 'Выберите время';

  // Common payment and summary elements to share between mobile view and desktop sidebar
  const paymentSection = (
    <div className="cart-payment-section">
      <h3>Способ оплаты</h3>
      <div className="cart-payment-list">
        {(paymentMethods || ['card', 'cash']).map((pMethod: string) => {
          const isSelected = payment === pMethod;
          return (
            <button
              key={pMethod}
              type="button"
              className={`cart-payment-card ${isSelected ? 'selected' : ''}`}
              onClick={() => setPayment(pMethod)}
            >
              <div className="cart-payment-left">
                <div className="cart-payment-icon-wrap">
                  <CreditCard size={18} />
                </div>
                <span>{pMethod === 'card' ? 'Выберите карту' : 'Наличными при получении'}</span>
              </div>
              <div className={`cart-payment-radio ${isSelected ? 'checked' : ''}`}>
                {isSelected ? <CheckCircle2 size={20} /> : <div className="cart-empty-circle" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const summarySection = (
    <div className="cart-summary-block">
      <div className="cart-summary-line">
        <span>Товары</span>
        <span>{formatRub(calculatedItemsTotal)}</span>
      </div>
      <div className="cart-summary-line">
        <span>Сборка</span>
        <span className="cart-summary-free-label">бесплатно</span>
      </div>
      {typeof group?.deliveryCost === 'number' && group.deliveryCost > 0 && (
        <div className="cart-summary-line">
          <span>Доставка</span>
          <span>{formatRub(group.deliveryCost)}</span>
        </div>
      )}
      {typeof group?.discount === 'number' && group.discount > 0 && (
        <div className="cart-summary-line">
          <span>Скидка</span>
          <span className="cart-summary-discount-val">−{formatRub(group.discount)}</span>
        </div>
      )}
      <div className="cart-summary-line-divider" />
      <div className="cart-summary-total-line">
        <strong>Общая сумма заказа</strong>
        <strong className="cart-summary-total-amount">{formatRub(total)}</strong>
      </div>
      <div className="cart-summary-points-hint">
        Получите +{Math.max(1, Math.floor(total * 0.01))} баллов
      </div>
    </div>
  );

  const ctaSection = (
    <div className="cart-cta-section">
      <button
        className="primary cart-main-cta-btn"
        disabled={busy || (s.authenticated && !s.checkoutEnabled)}
        type="submit"
      >
        {busy
          ? 'Проверяем заказ…'
          : !s.authenticated
            ? 'Войти и заказать'
            : 'Заказать'}
      </button>
      <button
        type="button"
        className="cart-terms-agreement-row"
        onClick={() => setTermsAgreed(!termsAgreed)}
      >
        <div className={`cart-terms-check ${termsAgreed ? 'checked' : ''}`}>
          {termsAgreed ? <CheckCircle2 size={18} /> : <div className="cart-empty-circle-sm" />}
        </div>
        <span>
          Я согласен с{' '}
          <Link href="/info" className="cart-terms-link" onClick={(e) => e.stopPropagation()}>
            условиями использования
          </Link>{' '}
          и{' '}
          <Link href="/info" className="cart-terms-link" onClick={(e) => e.stopPropagation()}>
            публичной офертой
          </Link>
        </span>
      </button>
    </div>
  );

  return (
    <div className="cart-page-container">
      {/* Top Header matching reference */}
      <div className="cart-top-bar">
        <button
          type="button"
          className="cart-header-back-btn"
          onClick={() => router.back()}
          aria-label="Назад"
        >
          <ChevronLeft size={24} />
        </button>
        <h1>Корзина</h1>
        <div className="cart-header-actions">
          <button
            type="button"
            className="cart-header-icon-btn"
            onClick={handleShare}
            aria-label="Поделиться корзиной"
            title="Поделиться"
          >
            <Share2 size={20} />
          </button>
          <button
            type="button"
            className="cart-header-icon-btn"
            onClick={handleClearCart}
            aria-label="Очистить корзину"
            title="Очистить корзину"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <form onSubmit={prepareOrder} className="cart-form-root">
        <div className="cart-layout-two-column">
          {/* Left / Main Column */}
          <div className="cart-left-column">
            {/* Mode Switcher: Доставка / Самовывоз */}
            <div className="cart-mode-selector">
              <button
                type="button"
                className={`cart-mode-pill ${mode === 'courier' ? 'active' : ''}`}
                onClick={() => setMode('courier')}
              >
                Доставка
              </button>
              {group?.store?.isPickupEnabled && (
                <button
                  type="button"
                  className={`cart-mode-pill ${mode === 'pickup' ? 'active' : ''}`}
                  onClick={() => setMode('pickup')}
                >
                  Самовывоз
                </button>
              )}
            </div>

            {/* Time Slot Banner */}
            <div className="cart-time-banner-wrap">
              <button
                type="button"
                className="cart-time-banner"
                onClick={() => setShowTimePicker(!showTimePicker)}
              >
                <div className="cart-time-banner-left">
                  <Clock size={20} className="cart-time-banner-clock" />
                  <span className="cart-time-banner-text">{timeBannerText}</span>
                </div>
                <ChevronRight
                  size={20}
                  className={`cart-time-banner-arrow ${showTimePicker ? 'open' : ''}`}
                />
              </button>

              {showTimePicker && (
                <div className="cart-time-dropdown panel stack">
                  <div className="two-fields date-time-grid">
                    <label>
                      Дата
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </label>
                    <label>
                      Интервал
                      <select
                        value={slot}
                        onChange={(e) => {
                          setSlot(e.target.value);
                          if (e.target.value) setShowTimePicker(false);
                        }}
                        required
                        disabled={!s.authenticated}
                      >
                        <option value="">
                          {!s.authenticated
                            ? 'Будет выбран при подтверждении'
                            : slotsRemote.loading
                              ? 'Загружаем интервалы…'
                              : 'Выберите время'}
                        </option>
                        {slotData?.slots?.map((v: any) => (
                          <option key={v.id} value={v.id}>
                            {v.timeSlot}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Address selector / info */}
            {mode === 'courier' ? (
              <div className="cart-address-compact panel">
                {s.authenticated ? (
                  <div className="cart-address-selector-row">
                    <MapPin size={18} className="cart-address-icon" />
                    <select
                      value={addressId}
                      onChange={(e) => setAddressId(e.target.value)}
                      className="cart-address-select"
                      required
                    >
                      <option value="">Выберите адрес доставки</option>
                      {list<Address>(addressesRemote.data).map((a) => (
                        <option key={a.id} value={a.id}>
                          {[a.city, a.street, a.houseNumber, a.apartment && `кв. ${a.apartment}`]
                            .filter(Boolean)
                            .join(', ')}
                        </option>
                      ))}
                    </select>
                    <Link href="/addresses" className="cart-address-add-link" title="Добавить адрес">
                      +
                    </Link>
                  </div>
                ) : (
                  <div className="guest-address-form stack">
                    <p className="muted">Адрес доставки:</p>
                    <div className="two-fields">
                      <input
                        required
                        placeholder="Город"
                        value={guestAddress.city}
                        onChange={(e) => setGuestAddress({ ...guestAddress, city: e.target.value })}
                      />
                      <input
                        required
                        placeholder="Улица"
                        value={guestAddress.street}
                        onChange={(e) => setGuestAddress({ ...guestAddress, street: e.target.value })}
                      />
                    </div>
                    <div className="two-fields">
                      <input
                        required
                        placeholder="Дом"
                        value={guestAddress.house}
                        onChange={(e) => setGuestAddress({ ...guestAddress, house: e.target.value })}
                      />
                      <input
                        placeholder="Квартира"
                        value={guestAddress.apartment}
                        onChange={(e) => setGuestAddress({ ...guestAddress, apartment: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="cart-pickup-compact panel">
                <MapPin size={18} className="cart-address-icon" />
                <div>
                  <strong>{group?.store?.name || 'Магазин «Ласточка»'}</strong>
                  <p className="muted">{group?.store?.address || 'Адрес магазина'}</p>
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <div className="cart-items-wrapper">
              {groups.map((g) => (
                <section className="cart-items-group" key={g.store.id}>
                  <div className="cart-items-list">
                    {g.items.map((i) => {
                      const normalized = product(i.product);
                      const unitPrice = i.price || normalized.price;
                      const itemTotal = unitPrice * i.quantity;
                      const stepVal = Number(normalized.quantityStep) || 1;
                      const unitName = (normalized.measurementUnitLabel || 'шт').replace(/^[0-9.]+\s*/, '') || 'шт';

                      return (
                        <article className="cart-item-row" key={i.id}>
                          <Link href={'/product/' + normalized.id} className="cart-item-thumb">
                            <Photo src={normalized.preview || undefined} alt={normalized.title} />
                          </Link>

                          <div className="cart-item-middle">
                            <Link href={'/product/' + normalized.id} className="cart-item-name">
                              {normalized.title}
                            </Link>
                            <div className="cart-item-unit-badge">
                              {formatRub(unitPrice)} / {normalized.measurementUnitLabel}
                            </div>
                            {i.stockWarning && <p className="error">{i.stockWarning}</p>}
                          </div>

                          <div className="cart-item-right">
                            <div className="cart-item-bold-price">{formatRub(itemTotal)}</div>
                            <div className="cart-item-stepper">
                              <button
                                type="button"
                                aria-label="Уменьшить"
                                onClick={() =>
                                  s.setQuantity(i.id, Math.max(0, i.quantity - stepVal), normalized)
                                }
                              >
                                <Minus size={13} />
                              </button>
                              <span className="cart-item-stepper-val">
                                {i.quantity} {unitName}
                              </span>
                              <button
                                type="button"
                                aria-label="Увеличить"
                                onClick={() =>
                                  s.setQuantity(i.id, i.quantity + stepVal, normalized)
                                }
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {/* Comment to packer */}
            <div className="cart-comment-card">
              <label htmlFor="cart-comment-text" className="cart-comment-label">
                Комментарий сборщику
              </label>
              <textarea
                id="cart-comment-text"
                className="cart-comment-textarea"
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Пиццу очень ждём тёпленькой! :)"
                maxLength={1000}
              />
            </div>

            {/* Free Packaging Banner */}
            <div className="cart-packaging-banner">
              <div className="cart-packaging-content">
                <strong>Мы всё аккуратно упакуем в пакеты</strong>
                <p>Все пакеты бесплатно!</p>
              </div>
              <div className="cart-packaging-image">
                <img src="/images/swallow.webp" alt="Ласточка" width={68} height={54} />
              </div>
            </div>

            {/* Promo code */}
            <div className="cart-promo-card">
              <div className="cart-promo-input-row">
                <input
                  type="text"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  placeholder="У меня есть промокод!"
                  maxLength={50}
                />
                {promo.trim() && (
                  <button
                    type="button"
                    className="cart-promo-apply-btn"
                    onClick={() =>
                      s.run(async () => {
                        await request('cart/promocode', 'POST', {
                          storeId,
                          promocode: promo,
                        });
                        await s.refresh();
                        s.notice('Промокод применён');
                      })
                    }
                  >
                    Применить
                  </button>
                )}
              </div>
              {group?.promocode && (
                <button
                  className="text-button"
                  type="button"
                  onClick={() =>
                    s.run(async () => {
                      await request('cart/promocode?storeId=' + storeId, 'DELETE');
                      await s.refresh();
                    })
                  }
                >
                  Удалить применённый промокод
                </button>
              )}
            </div>

            {/* Checkout Options ("Позвонить если товара нет в наличии") */}
            {Array.isArray(appSettings?.checkoutOptions) &&
              appSettings.checkoutOptions.map((o: any) => {
                const isSelected = selectedOptions.includes(o.code);
                return (
                  <button
                    key={o.code}
                    type="button"
                    className={`cart-option-pill-card ${isSelected ? 'active' : ''}`}
                    onClick={() =>
                      setSelectedOptions(
                        isSelected
                          ? selectedOptions.filter((x) => x !== o.code)
                          : [...selectedOptions, o.code],
                      )
                    }
                  >
                    <span>{o.label}</span>
                    <div className={`cart-option-check-circle ${isSelected ? 'checked' : ''}`}>
                      {isSelected ? <CheckCircle2 size={20} /> : <div className="cart-empty-circle" />}
                    </div>
                  </button>
                );
              })}

            {/* Featured Upsell Carousel ("Фирменные блюда >") */}
            {featuredProducts.length > 0 && (
              <section className="cart-upsell-section">
                <Link href="/collection/firmennye-bliuda" className="cart-upsell-header">
                  <h2>Фирменные блюда</h2>
                  <ChevronRight size={20} />
                </Link>
                <div className="cart-upsell-track">
                  {featuredProducts.map((fp: Product) => {
                    const norm = fp;
                    return (
                      <article key={norm.id} className="cart-upsell-card">
                        <div className="cart-upsell-image-wrap">
                          <Photo src={norm.preview || undefined} alt={norm.title} />
                          {norm.availableFrom && (
                            <span className="cart-upsell-avail-badge">
                              <Clock size={10} /> Доступн...
                            </span>
                          )}
                        </div>
                        <Link href={`/product/${norm.id}`} className="cart-upsell-name">
                          {norm.title}
                        </Link>
                        <span className="cart-upsell-measure">
                          {norm.quantityStep ? `${norm.quantityStep} ${norm.measurementUnitLabel}` : norm.measurementUnitLabel}
                        </span>
                        <div className="cart-upsell-btn-wrap">
                          <button
                            type="button"
                            className="cart-upsell-add-btn"
                            onClick={() => void s.add(norm)}
                            aria-label={`Добавить ${norm.title}`}
                          >
                            <span>{money(norm.price)}</span>
                            <Plus size={16} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* On mobile: Payment, Summary and CTA follow right in column */}
            <div className="cart-mobile-bottom-flow">
              {paymentSection}
              {summarySection}
              {ctaSection}
            </div>
          </div>

          {/* Right Column (Sticky on Desktop) */}
          <div className="cart-right-column">
            <div className="sticky-order-summary panel">
              {paymentSection}

              {/* Bonus Earn / Spend */}
              {s.authenticated && group?.bonus?.isEnabled && (
                <div className="bonus-checkout-block">
                  <div className="segmented">
                    <button
                      type="button"
                      className={bonus === 'earn' ? 'selected' : ''}
                      onClick={() => setBonus('earn')}
                    >
                      Копить бонусы
                    </button>
                    <button
                      type="button"
                      className={bonus === 'spend' ? 'selected' : ''}
                      onClick={() => setBonus('spend')}
                    >
                      Списать бонусы
                    </button>
                  </div>

                  {bonus === 'spend' && (
                    <label className="spend-bonuses-input">
                      Списать бонусов (доступно: {money((group.bonus?.balance || 0) / 100)})
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={(group.bonus?.balance || 0) / 100}
                        value={spend}
                        onChange={(e) => setSpend(e.target.value)}
                        required
                      />
                    </label>
                  )}
                </div>
              )}

              {summarySection}
              {ctaSection}

              <div className="security-notice">
                <ShieldCheck size={16} />
                <span>Безопасная оплата картой или при получении</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Review Modal */}
      {reviewModal && (
        <Modal title="Подтверждение заказа" onClose={() => setReviewModal(undefined)}>
          <div className="stack confirm-order-modal">
            <h2>Сумма заказа: {money(reviewModal.total)}</h2>
            <p>
              Данные и цены корзины проверены магазином.
              {payment === 'card'
                ? ' После нажатия кнопки откроется защищённая платёжная страница.'
                : ' Оплата будет произведена наличными курьеру при получении.'}
            </p>
            <button
              className="primary"
              disabled={busy}
              onClick={submitFinalOrder}
              type="button"
            >
              {busy ? 'Оформляем…' : 'Подтвердить и завершить заказ'}
            </button>
          </div>
        </Modal>
      )}

      <ShareCartModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        items={items}
      />
    </div>
  );
}
