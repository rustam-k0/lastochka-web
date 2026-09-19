'use client';

import { useState } from 'react';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { list, unwrap, PaymentCardDto } from '@/lib/types';
import { request } from '@/lib/client';
import { useShop } from '@/components/shop-context';
import { Modal } from '@/components/ui';
import { useRemote, RemoteState } from '../hooks/use-remote';
import { goPayment } from '../orders/orders-view';

export function CardsView() {
  const remote = useRemote<PaymentCardDto[]>('payment-cards');
  const s = useShop();
  const [bindModal, setBindModal] = useState(false);
  const [busy, setBusy] = useState(false);

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
            <div className="panel empty-panel">
              <p className="muted">У вас пока нет сохранённых банковских карт.</p>
            </div>
          )}
        </div>
      </RemoteState>

      {bindModal && (
        <Modal title="Привязать банковскую карту" onClose={() => setBindModal(false)}>
          <div className="stack">
            <p>
              Вы перейдёте на защищённую страницу платёжного сервиса. Для проверки карты будет
              произведён тестовый холд 1 ₽, который сразу вернётся на счёт.
            </p>
            <button
              className="primary"
              disabled={busy}
              type="button"
              onClick={() =>
                s.run(async () => {
                  setBusy(true);
                  try {
                    const data = unwrap<any>(
                      await request('payment-cards/bind', 'POST', {
                        returnUrl: `${location.origin}/cards`,
                      }),
                    );
                    goPayment(data.confirmationUrl);
                  } finally {
                    setBusy(false);
                  }
                })
              }
            >
              {busy ? 'Переходим…' : 'Перейти к привязке карты'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
