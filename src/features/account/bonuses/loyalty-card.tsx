'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { QrCode, Gift, Smartphone, ArrowRight } from 'lucide-react';
import { useShop } from '@/components/shop-context';
import { unwrap, LoyaltyCardDto } from '@/lib/types';
import { Modal } from '@/components/ui';
import { useRemote, RemoteState } from '../hooks/use-remote';

export function LoyaltyCard({ compact = false }: { compact?: boolean }) {
  const s = useShop();
  const remote = useRemote<LoyaltyCardDto>(s.authenticated ? 'loyalty-card' : null);
  const [modalOpen, setModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  const cardData = unwrap<LoyaltyCardDto>(remote.data);

  useEffect(() => {
    if (cardData?.status === 'active' && cardData.qrPayload) {
      QRCode.toDataURL(cardData.qrPayload, {
        width: 480,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
        .then(setQrCodeDataUrl)
        .catch(() => setQrCodeDataUrl(''));
    } else {
      setQrCodeDataUrl('');
    }
  }, [cardData?.status, cardData?.qrPayload]);

  const handleCardClick = () => {
    if (!s.authenticated) {
      s.login();
    } else {
      setModalOpen(true);
    }
  };

  const balanceNumber =
    s.authenticated && typeof cardData?.balance === 'number'
      ? cardData.balance / 100
      : 0;
  const formattedBalance = `${balanceNumber.toLocaleString('ru-RU')} бонусов`;

  return (
    <>
      <div className={`loyalty-card-wrapper ${compact ? 'compact' : ''}`}>
        <div className={`loyalty-minimal-card ${compact ? 'compact' : ''}`}>
          <div className="loyalty-minimal-content">
            <div className="loyalty-minimal-header">
              <span className="loyalty-minimal-title">
                <Gift size={18} /> Карта «Ласточка»
              </span>
              {s.authenticated && cardData?.cardNumber && (
                <span className="loyalty-card-num">№ {cardData.cardNumber}</span>
              )}
            </div>

            <div className="loyalty-minimal-body">
              <div className="loyalty-balance-group">
                <strong className="loyalty-balance-val">{formattedBalance}</strong>
                <button
                  type="button"
                  className="how-bonuses-link"
                  onClick={() => setInfoModalOpen(true)}
                >
                  Как получить бонусы?
                </button>
              </div>

              <div className="loyalty-minimal-action">
                <button
                  type="button"
                  className="loyalty-qr-btn"
                  onClick={handleCardClick}
                  aria-label="Открыть QR-код карты"
                >
                  {qrCodeDataUrl ? (
                    <img src={qrCodeDataUrl} alt="QR" width={44} height={44} />
                  ) : (
                    <QrCode size={28} />
                  )}
                  <span>{s.authenticated ? 'QR-код' : 'Войти'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {infoModalOpen && (
        <Modal title="Программа лояльности «Ласточка»" onClose={() => setInfoModalOpen(false)}>
          <div className="bonuses-info-modal">
            <div className="bonus-info-item">
              <span className="bonus-info-badge">1</span>
              <div>
                <strong>Кэшбэк бонусами за каждый заказ</strong>
                <p className="muted">Возвращаем до 5% от суммы покупки бонусами на ваш баланс.</p>
              </div>
            </div>
            <div className="bonus-info-item">
              <span className="bonus-info-badge">2</span>
              <div>
                <strong>1 бонус = 1 рубль</strong>
                <p className="muted">Бонусы не сгорают при регулярных покупках и равны реальным рублям.</p>
              </div>
            </div>
            <div className="bonus-info-item">
              <span className="bonus-info-badge">3</span>
              <div>
                <strong>Оплата до 50% чека</strong>
                <p className="muted">Списывайте накопленные бонусы на кассе в магазине или при онлайн-заказе.</p>
              </div>
            </div>
            <button
              type="button"
              className="primary block bonus-close-btn"
              onClick={() => setInfoModalOpen(false)}
            >
              Понятно
            </button>
          </div>
        </Modal>
      )}

      {modalOpen && (
        <Modal title="Ваша карта лояльности" onClose={() => setModalOpen(false)}>
          <RemoteState r={remote}>
            {qrCodeDataUrl ? (
              <div className="qr-panel">
                <img src={qrCodeDataUrl} alt="QR-код карты лояльности" />
                {cardData?.cardNumber && <p className="card-num">{cardData.cardNumber}</p>}
                <strong>{formattedBalance}</strong>
                <p className="muted">Покажите QR-код на кассе для начисления и списания</p>
              </div>
            ) : (
              <p>Карта готовится. QR-код появится после подтверждения магазином.</p>
            )}
          </RemoteState>
          <div className="modal-footer-link">
            <Link href="/bonuses" onClick={() => setModalOpen(false)}>
              История начислений и списаний →
            </Link>
          </div>
        </Modal>
      )}
    </>
  );
}
