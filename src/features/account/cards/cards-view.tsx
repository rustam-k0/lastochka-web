'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { list, unwrap, PaymentCardDto } from '@/lib/types';
import { paymentReturnUrl, request } from '@/lib/client';
import { useShop } from '@/components/shop-context';
import { Modal, Empty } from '@/components/ui';
import { useRemote, RemoteState } from '../hooks/use-remote';
import { goPayment } from '../orders/orders-view';

export function CardsView() {
  const remote = useRemote<PaymentCardDto[]>('payment-cards');
  const s = useShop();
  const [bindModal, setBindModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bindError, setBindError] = useState('');
  const bindLock = useRef(false);
  const params = useSearchParams();

  useEffect(() => {
    const returned = params.get('binding') || params.get('status');
    if (!returned) return;
    void remote.reload();
    const normalized = returned.toLowerCase();
    if (['success', 'succeeded', 'paid', 'return'].includes(normalized)) {
      s.notice('Проверяем привязку карты. Список обновлён.');
    } else if (['cancel', 'cancelled', 'canceled'].includes(normalized)) {
      s.notice('Привязка карты отменена');
    } else if (['expired', 'timeout'].includes(normalized)) {
      s.notice('Время привязки карты истекло. Попробуйте ещё раз.');
    } else if (['error', 'failed'].includes(normalized)) {
      setBindModal(true);
      setBindError('Не удалось привязать карту. Попробуйте ещё раз.');
    }
  // The URL is the provider's one-shot return signal.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const cards = list<PaymentCardDto>(remote.data);

  return (
    <div className="account-section">
      <div className="section-header">
        <div>
          <h1>Способы оплаты</h1>
          <p className="muted">Сохранённые банковские карты для быстрой оплаты заказов.</p>
        </div>
        <button className="primary" onClick={() => setBindModal(true)} type="button">
          <Plus size={18} /> Привязать карту
        </button>
      </div>

      <RemoteState r={remote}>
        <div className="cards-list">
          {cards.length ? (
            cards.map((c) => (
              <div className="panel card-row" key={c.id}>
                <div className="card-info">
                  <CreditCard size={22} />
                  <strong>
                    {c.cardType || c.type || 'Карта'} •••• {c.last4 || c.lastFour || '0000'}
                  </strong>
                </div>
                <button
                  className="icon-button danger"
                  aria-label="Удалить карту"
                  type="button"
                  onClick={() => {
                    if (confirm('Удалить эту привязанную карту?')) {
                      void s.run(async () => {
                        await request(`payment-cards/${c.id}`, 'DELETE');
                        await remote.reload();
                        s.notice('Карта удалена');
                      });
                    }
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          ) : (
            <Empty title="У вас пока нет сохранённых карт">
              <p className="muted">Привяжите карту для быстрой и удобной оплаты заказов онлайн</p>
              <button
                className="primary"
                onClick={() => setBindModal(true)}
                type="button"
                style={{ marginTop: 12 }}
              >
                <Plus size={18} /> Привязать карту
              </button>
            </Empty>
          )}
        </div>
      </RemoteState>

      {bindModal && (
        <Modal title="Привязать банковскую карту" onClose={() => { setBindModal(false); setBindError(''); }}>
          <div className="stack">
            <p>
              Вы перейдёте на защищённую страницу платёжного сервиса. Для проверки карты будет
              произведён тестовый холд 1 ₽, который сразу вернётся на счёт.
            </p>
            {bindError && (
              <div className="error bind-error-box" role="alert">
                <p><strong>Ошибка привязки:</strong> {bindError}</p>
              </div>
            )}
            <button
              className="primary"
              disabled={busy}
              type="button"
              onClick={async () => {
                if (bindLock.current) return;
                bindLock.current = true;
                setBusy(true);
                setBindError('');
                try {
                  const data = unwrap<any>(await request('payment-cards/bind', 'POST', {
                    returnUrl: paymentReturnUrl('/cards?binding=return', s.publicOrigin),
                  }));
                  goPayment(data?.confirmationUrl);
                } catch (err: any) {
                  const msg = String(err?.message || '');
                  const isDomainError =
                    err?.status === 422 ||
                    msg.toLowerCase().includes('возврат') ||
                    msg.toLowerCase().includes('домен') ||
                    msg.toLowerCase().includes('redirect') ||
                    msg.toLowerCase().includes('returnurl');

                  setBindError(
                    isDomainError
                      ? 'Адрес возврата не разрешён в ЮKassa: домен не входит в список разрешённых в настройках магазина мерчанта. Для успешной привязки добавьте домен в личном кабинете ЮKassa или задайте переменную ALLOWED_PAYMENT_RETURN_URL.'
                      : (msg || 'Не удалось открыть защищённую страницу оплаты. Проверьте соединение и попробуйте ещё раз.')
                  );
                  bindLock.current = false;
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Переходим…' : 'Перейти к привязке карты'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
