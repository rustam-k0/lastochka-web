'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBasket,
  Trash2,
  Clock,
  MapPin,
  CheckCircle2,
  ChevronDown,
  ShieldCheck,
  CreditCard,
  Truck,
  Store as StoreIcon,
} from 'lucide-react';
import { useShop, AuthGate } from '@/components/shop-context';
import { Photo, Empty, ErrorMessage, Modal } from '@/components/ui';
import { CartQuantity } from '@/components/products';
import { request } from '@/lib/client';
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

  const [date, setDate] = useState(() =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date()),
  );
  const [slot, setSlot] = useState('');
  const [payment, setPayment] = useState('card');
  const [comment, setComment] = useState('');
  const [promo, setPromo] = useState('');
  const [busy, setBusy] = useState(false);
  const [bonus, setBonus] = useState<'earn' | 'spend'>('earn');
  const [spend, setSpend] = useState('');
  const [reviewModal, setReviewModal] = useState<any>();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [localCart, setLocalCart] = useState<Cart | null>(null);

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

  const paymentMethods =
    mode === 'pickup'
      ? group?.store?.pickupPaymentMethods
      : slotData?.availablePaymentMethods;

  const total = group?.totalToPay ?? group?.total ?? cart?.totalToPay ?? 0;
  const items: CartItem[] = groups.flatMap((g) => g.items || []) || [];

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

  async function prepareOrder(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;

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
      if (typeof latestTotal !== 'number') {
        throw new Error(
          'Магазин пока не передаёт подтверждённый итог корзины. Товары в корзине сохранены.',
        );
      }

      setReviewModal({ cart: latest, total: latestTotal, storeId });
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
          returnUrl: location.origin + '/payment',
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

  return (
    <div className="cart-page-container">
      <div className="page-heading">
        <div>
          <h1>Корзина</h1>
          <span className="muted">{items.length} позиций в заказе</span>
        </div>
        <button className="text-button danger" onClick={handleClearCart} type="button">
          <Trash2 size={17} /> Очистить
        </button>
      </div>

      <div className="cart-layout-two-column">
        {/* Left column: items list + step-by-step checkout form */}
        <div className="cart-left-column">
          {/* Cart Items List */}
          <div className="cart-items-wrapper">
            {groups.map((g) => (
              <section className="panel cart-items" key={g.store.id}>
                <div className="store-group-header">
                  <h2>{g.store.name}</h2>
                  {g.store.address && <span className="muted">{g.store.address}</span>}
                </div>

                <div className="items-list">
                  {g.items.map((i) => {
                    const normalized = product(i.product);
                    return (
                      <article className="cart-item" key={i.id}>
                        <Link href={'/product/' + normalized.id} className="cart-item-photo">
                          <Photo src={normalized.preview || undefined} alt={normalized.title} />
                        </Link>
                        <div className="cart-item-info">
                          <Link href={'/product/' + normalized.id} className="cart-item-title">
                            {normalized.title}
                          </Link>
                          <small className="muted">
                            {normalized.measurementUnitLabel} · {money(i.price || normalized.price)}
                          </small>
                          {i.stockWarning && <p className="error">{i.stockWarning}</p>}
                        </div>
                        <div className="cart-item-controls">
                          <CartQuantity itemId={i.id} p={normalized} quantity={Number(i.quantity)} />
                          <button
                            className="icon-button"
                            aria-label={`Удалить ${normalized.title}`}
                            type="button"
                            onClick={() => s.setQuantity(i.id, 0, normalized)}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* Checkout Steps Form */}
          <form className="panel checkout-steps-panel stack" onSubmit={prepareOrder}>
            <div className="checkout-header">
              <h2>Оформление заказа</h2>
              {!s.authenticated && (
                <span className="guest-badge">Гостевой режим (вход на шаге подтверждения)</span>
              )}
            </div>

            {/* Step 1: Receiving method and address */}
            <fieldset className="checkout-step">
              <legend>
                <span className="step-number">1</span> Способ получения
              </legend>

              <div className="segmented-delivery-tabs">
                <button
                  type="button"
                  className={mode === 'courier' ? 'selected' : ''}
                  onClick={() => setMode('courier')}
                >
                  <Truck size={17} /> Доставка курьером
                </button>
                {group?.store?.isPickupEnabled && (
                  <button
                    type="button"
                    className={mode === 'pickup' ? 'selected' : ''}
                    onClick={() => setMode('pickup')}
                  >
                    <StoreIcon size={17} /> Самовывоз из магазина
                  </button>
                )}
              </div>

              {mode === 'courier' ? (
                <div className="address-select-group stack">
                  {s.authenticated ? (
                    <label>
                      Адрес доставки
                      <select
                        required
                        value={addressId}
                        onChange={(e) => setAddressId(e.target.value)}
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
                      <Link className="text-button" href="/addresses">
                        + Добавить новый адрес
                      </Link>
                    </label>
                  ) : (
                    <div className="guest-address-form stack">
                      <p className="muted">
                        Укажите адрес доставки. При оформлении заказа вы сможете сохранить его в профиле.
                      </p>
                      <div className="two-fields">
                        <label>
                          Город
                          <input
                            required
                            value={guestAddress.city}
                            onChange={(e) =>
                              setGuestAddress({ ...guestAddress, city: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Улица
                          <input
                            required
                            placeholder="ул. Ленина"
                            value={guestAddress.street}
                            onChange={(e) =>
                              setGuestAddress({ ...guestAddress, street: e.target.value })
                            }
                          />
                        </label>
                      </div>
                      <div className="two-fields">
                        <label>
                          Дом
                          <input
                            required
                            placeholder="1"
                            value={guestAddress.house}
                            onChange={(e) =>
                              setGuestAddress({ ...guestAddress, house: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Квартира
                          <input
                            placeholder="42"
                            value={guestAddress.apartment}
                            onChange={(e) =>
                              setGuestAddress({ ...guestAddress, apartment: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pickup-info-box">
                  <MapPin size={18} />
                  <div>
                    <strong>{group?.store?.name}</strong>
                    <p className="muted">{group?.store?.address || 'Адрес магазина'}</p>
                  </div>
                </div>
              )}
            </fieldset>

            {/* Step 2: Time Slot */}
            {(mode === 'pickup' || !truth(appSettings?.checkoutWithoutSlots)) && (
              <fieldset className="checkout-step">
                <legend>
                  <span className="step-number">2</span> Дата и время получения
                </legend>
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
                      onChange={(e) => setSlot(e.target.value)}
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
                {slotsRemote.error && (
                  <ErrorMessage message={slotsRemote.error} retry={slotsRemote.reload} />
                )}
              </fieldset>
            )}

            {/* Step 3: Contacts & Preferences */}
            <fieldset className="checkout-step">
              <legend>
                <span className="step-number">3</span> Пожелания и комментарий
              </legend>
              <label>
                Комментарий для сборщика и курьера
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  placeholder="Например, положите спелые бананы или позвоните за 15 минут"
                />
              </label>

              {Array.isArray(appSettings?.checkoutOptions) &&
                appSettings.checkoutOptions.map((o: any) => (
                  <label className="check" key={o.code}>
                    <input
                      type="checkbox"
                      checked={selectedOptions.includes(o.code)}
                      onChange={(e) =>
                        setSelectedOptions(
                          e.target.checked
                            ? [...selectedOptions, o.code]
                            : selectedOptions.filter((x) => x !== o.code),
                        )
                      }
                    />
                    <span>{o.label}</span>
                  </label>
                ))}
            </fieldset>

            {/* Step 4: Payment, Promocode and Bonuses */}
            <fieldset className="checkout-step">
              <legend>
                <span className="step-number">4</span> Оплата и выгода
              </legend>

              <label>
                Способ оплаты
                <select value={payment} onChange={(e) => setPayment(e.target.value)}>
                  {(paymentMethods || ['card', 'cash']).map((pMethod: string) => (
                    <option value={pMethod} key={pMethod}>
                      {pMethod === 'cash' ? 'Наличными при получении' : 'Банковской картой онлайн'}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Промокод
                <div className="inline-field">
                  <input
                    value={promo}
                    maxLength={50}
                    onChange={(e) => setPromo(e.target.value)}
                    placeholder="Введите промокод"
                  />
                  <button
                    type="button"
                    className="secondary"
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
                </div>
              </label>

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
            </fieldset>

            <button
              className="primary submit-checkout-mobile-btn"
              disabled={busy || (s.authenticated && !s.checkoutEnabled)}
              type="submit"
            >
              {busy
                ? 'Проверяем заказ…'
                : !s.authenticated
                  ? 'Войти и продолжить оформление'
                  : 'Подтвердить и оформить заказ'}
            </button>
          </form>
        </div>

        {/* Right column: Sticky Order Summary */}
        <div className="cart-right-column">
          <div className="sticky-order-summary panel">
            <h3>Ваш заказ</h3>

            <div className="summary-items-preview">
              {items.slice(0, 4).map((it) => (
                <div key={it.id} className="summary-mini-item">
                  <span>{it.product.title}</span>
                  <strong>{money((it.price || it.product.price) * it.quantity)}</strong>
                </div>
              ))}
              {items.length > 4 && (
                <small className="muted">и ещё {items.length - 4} позиций…</small>
              )}
            </div>

            <dl className="totals">
              {typeof group?.deliveryCost === 'number' && (
                <>
                  <dt>Доставка</dt>
                  <dd>{money(group.deliveryCost)}</dd>
                </>
              )}
              {typeof group?.assemblyCost === 'number' && (
                <>
                  <dt>Сборка</dt>
                  <dd>{money(group.assemblyCost)}</dd>
                </>
              )}
              {typeof group?.discount === 'number' && group.discount > 0 && (
                <>
                  <dt>Скидка</dt>
                  <dd className="accent">−{money(group.discount)}</dd>
                </>
              )}
              <dt className="grand-total-dt">Итого к оплате</dt>
              <dd className="grand-total-dd">
                <strong>{money(total)}</strong>
              </dd>
            </dl>

            <button
              className="primary checkout-sticky-btn"
              disabled={busy || (s.authenticated && !s.checkoutEnabled)}
              onClick={prepareOrder}
              type="button"
            >
              {busy
                ? 'Проверяем заказ…'
                : !s.authenticated
                  ? 'Оформить заказ'
                  : 'Проверить и оформить'}
            </button>

            <div className="security-notice">
              <ShieldCheck size={16} />
              <span>Безопасная оплата картой или при получении</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Checkout Bar */}
      <div className="mobile-cart-sticky-bar">
        <div className="mobile-cart-sticky-info">
          <small>Итого к оплате:</small>
          <strong>{money(total)}</strong>
        </div>
        <button
          className="primary mobile-cart-sticky-btn"
          disabled={busy || (s.authenticated && !s.checkoutEnabled)}
          onClick={prepareOrder}
          type="button"
        >
          {busy
            ? 'Проверяем…'
            : !s.authenticated
              ? 'Оформить заказ'
              : 'Оформить заказ'}
        </button>
      </div>

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
    </div>
  );
}
