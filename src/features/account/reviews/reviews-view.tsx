'use client';

import { useState } from 'react';
import { list, ReviewDto } from '@/lib/types';
import { request } from '@/lib/client';
import { useShop } from '@/components/shop-context';
import { Modal } from '@/components/ui';
import { useRemote, RemoteState } from '../hooks/use-remote';

export function Reviews({ productId }: { productId: number }) {
  const remote = useRemote<ReviewDto[]>(`products/${productId}/reviews`);
  const s = useShop();
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reviewsList = list<ReviewDto>(remote.data);

  const handleReviewSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setBusy(true);

    await s
      .run(async () => {
        await request(`products/${productId}/reviews`, 'POST', {
          rating: Number(formData.get('rating')),
          text: String(formData.get('text')),
        });
        setModalOpen(false);
        await remote.reload();
        s.notice('Спасибо за ваш отзыв!');
      })
      .finally(() => setBusy(false));
  };

  return (
    <section className="reviews-section">
      <div className="section-heading">
        <h2>Отзывы покупателей</h2>
        <button
          className="text-button"
          type="button"
          onClick={() => (s.authenticated ? setModalOpen(true) : s.login())}
        >
          Оставить отзыв
        </button>
      </div>

      <RemoteState r={remote}>
        {reviewsList.length ? (
          <div className="reviews-list">
            {reviewsList.map((v, i) => (
              <article className="panel review-card" key={v.id || i}>
                <div className="review-card-header">
                  <strong>{v.user?.firstName || v.userName || 'Покупатель'}</strong>
                  <span className="rating-stars" aria-label={`Оценка ${v.rating} из 5`}>
                    {'★'.repeat(Math.min(5, Math.max(1, v.rating || 5)))}
                  </span>
                </div>
                <p className="review-text">{v.text || v.comment}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Пока нет отзывов. Будьте первым, кто поделится впечатлениями!</p>
        )}
      </RemoteState>

      {modalOpen && (
        <Modal title="Ваш отзыв о товаре" onClose={() => setModalOpen(false)}>
          <form className="stack" onSubmit={handleReviewSubmit}>
            <label>
              Оценка
              <select name="rating" defaultValue="5">
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} из 5 {n >= 4 ? '★' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ваши впечатления
              <textarea
                name="text"
                required
                maxLength={2000}
                placeholder="Расскажите о вкусе, свежести и качестве товара"
              />
            </label>
            <button className="primary" disabled={busy} type="submit">
              {busy ? 'Публикуем…' : 'Опубликовать отзыв'}
            </button>
          </form>
        </Modal>
      )}
    </section>
  );
}
