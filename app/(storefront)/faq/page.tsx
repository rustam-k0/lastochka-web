import type { Metadata } from 'next';
import { api } from '@/lib/upstream';
import { list, FaqItemDto } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Вопросы и ответы',
  description: 'Ответы на популярные вопросы о доставке, оплате и программе лояльности Ласточки.',
};

export const revalidate = 3600; // Granular ISR

export default async function FaqRoute() {
  const faqItems = list<FaqItemDto>(await api('faq'));

  return (
    <div className="reading panel faq-page">
      <h1>Вопросы и ответы</h1>
      <p className="muted">Здесь собраны ответы на самые частые вопросы покупателей.</p>

      <div className="faq-accordion">
        {faqItems.map((f) => (
          <details key={f.id} className="faq-item">
            <summary>{f.question}</summary>
            <p>{f.answer}</p>
          </details>
        ))}

        {!faqItems.length && (
          <p className="muted">В данный момент раздел вопросов и ответов обновляется.</p>
        )}
      </div>
    </div>
  );
}
