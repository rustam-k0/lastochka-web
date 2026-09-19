'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Package, ChevronRight, FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { list, unwrap, money, OrderDto, OrderItemDto } from '@/lib/types';
import { paymentReturnUrl, request } from '@/lib/client';
import { useShop } from '@/components/shop-context';
import { Empty, ErrorMessage } from '@/components/ui';
import { useRemote, RemoteState } from '../hooks/use-remote';

export function goPayment(url: unknown) {
  if (typeof url !== 'string') {
    throw new Error('Платёжная ссылка не получена. Обновите статус заказа.');
  }
  const u = new URL(url);
  if (u.protocol !== 'https:') {
    throw new Error('Некорректная ссылка оплаты');
  }
  location.assign(u.toString());
}

const statusLabels: Record<string, string> = {
  draft: 'Ожидает оплаты',
  pending: 'Ожидает подтверждения',
  new: 'Новый',
  confirmed: 'Подтверждён',
  processing: 'Собирается',
  assembling: 'Собирается',
  ready: 'Готов к выдаче',
  delivering: 'В пути',
  completed: 'Завершён',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
  canceled: 'Отменён',
};

export function OrdersView({
  id,
  paymentReturn = false,
}: {
  id?: string;
  paymentReturn?: boolean;
}) {
  const remote = useRemote<any>(id ? `orders/${id}` : 'orders?perPage=50');
  const paymentStatus = useRemote<any>(id ? `orders/${id}/payment-status` : null);
  const receipts = useRemote<any>(id ? `orders/${id}/receipts` : null);
  const s = useShop();

  const order = id ? unwrap<OrderDto>(remote.data) : null;
  const ordersList = !id ? list<OrderDto>(remote.data) : [];

  useEffect(() => {
    if (!id || !paymentReturn) return;
    let count = 0;
    const interval = setInterval(() => {
      if (count++ >= 12) {
        clearInterval(interval);
        return;
      }
      void remote.reload();
      void paymentStatus.reload();
    }, 5000);

    return () => clearInterval(interval);
  }, [id, paymentReturn, remote, paymentStatus]);

  return (
    <div className="account-section">
      <div className="section-header">
        <h1>{id ? `Заказ № ${id}` : 'Мои заказы'}</h1>
        {id && (
          <Link href="/orders" className="text-button">
            ← Ко всем заказам
          </Link>
        )}
      </div>

      {paymentReturn && (
        <div className="notice-banner">
          <AlertCircle size={18} />
          <span>Возвращение со шлюза оплаты. Актуальный статус заказа получен от магазина ниже.</span>
        </div>
      )}

      <RemoteState r={remote}>
        {id && order ? (
          <div className="order-detail-layout">
            <div className="panel order-card-main">
              <div className="order-status-row">
                <span className={`status-pill status-${order.status}`}>
                  {statusLabels[order.status] || order.status}
                </span>
                <span className={`payment-pill ${order.isPaid ? 'paid' : 'unpaid'}`}>
                  {order.isPaid ? 'Оплачен' : 'Оплата не подтверждена'}
                </span>
              </div>

              <h2>Итого: {money(order.total)}</h2>

              {order.paymentDeclineReason && (
                <ErrorMessage
                  message={
                    order.paymentDeclineReason === 'insufficient_funds'
                      ? 'Недостаточно средств на карте'
                      : 'Оплата отклонена банком'
                  }
                />
              )}

              {order.deliverySlotDate && (
                <p className="order-slot muted">
                  Слот доставки: {order.deliverySlotDate} {order.deliverySlotTimeSlot || ''}
                </p>
              )}

              <div className="order-items-list">
                <h3>Состав заказа</h3>
                {order.items?.map((item: OrderItemDto) => (
                  <div className="order-item-row" key={item.id}>
                    <span>
                      {item.product?.title || item.title || item.productTitle} × {item.quantity}
                    </span>
                    <strong>{money(item.total ?? item.price)}</strong>
                  </div>
                ))}
              </div>

              <dl className="totals">
                {typeof order.subtotal === 'number' && (
                  <>
                    <dt>Товары</dt>
                    <dd>{money(order.subtotal)}</dd>
                  </>
                )}
                {typeof order.discount === 'number' && order.discount > 0 && (
                  <>
                    <dt>Скидка</dt>
                    <dd>{money(order.discount)}</dd>
                  </>
                )}
                {typeof order.deliveryCost === 'number' && (
                  <>
                    <dt>Доставка</dt>
                    <dd>{money(order.deliveryCost)}</dd>
                  </>
                )}
                <dt>Итого к оплате</dt>
                <dd>
                  <strong>{money(order.total)}</strong>
                </dd>
              </dl>

              <div className="order-action-buttons">
                <button
                  className="secondary"
                  onClick={() => {
                    void remote.reload();
                    void paymentStatus.reload();
                  }}
                  type="button"
                >
                  <RefreshCw size={16} /> Обновить статус
                </button>

                {!order.isPaid &&
                  ['draft', 'pending', 'new', 'awaiting_payment'].includes(order.status) && (
                    <button
                      className="primary"
                      type="button"
                      onClick={() =>
                        s.run(async () => {
                          const result = await request<any>(`orders/${id}/pay`, 'POST', {
                            returnUrl: paymentReturnUrl(`/payment?orderId=${id}`, s.publicOrigin),
                          });
                          goPayment(result.confirmationUrl);
                        })
                      }
                    >
                      Оплатить заказ онлайн
                    </button>
                  )}

                {order.canCancel === true && (
                  <button
                    className="text-button danger"
                    type="button"
                    onClick={() => {
                      if (confirm('Вы уверены, что хотите отменить этот заказ?')) {
                        void s.run(async () => {
                          await request(`orders/${id}/cancel`, 'POST');
                          await remote.reload();
                        });
                      }
                    }}
                  >
                    Отменить заказ
                  </button>
                )}
              </div>
            </div>

            {receipts.data && list(receipts.data).length > 0 && (
              <div className="panel receipts-panel">
                <h3>
                  <FileText size={18} /> Электронные чеки
                </h3>
                <div className="receipt-links">
                  {list(receipts.data).map((rec: any) => (
                    <a
                      key={rec.id}
                      className="secondary receipt-button"
                      href={rec.url || rec.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Открыть чек № {rec.id} ↗
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : ordersList.length ? (
          <div className="orders-list">
            {ordersList.map((o) => (
              <Link className="panel order-row" href={`/orders/${o.id}`} key={o.id}>
                <div className="order-row-icon">
                  <Package size={22} />
                </div>
                <div className="order-row-info">
                  <strong>Заказ № {o.id}</strong>
                  <small className="muted">
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString('ru-RU') : ''} ·{' '}
                    {statusLabels[o.status] || o.status}
                  </small>
                </div>
                <div className="order-row-price">
                  <strong>{money(o.total)}</strong>
                  <ChevronRight size={18} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="Здесь появятся ваши заказы">
            <p>Вы пока не оформляли заказы в нашем магазине.</p>
            <Link className="primary" href="/catalog">
              Начать покупки
            </Link>
          </Empty>
        )}
      </RemoteState>
    </div>
  );
}
