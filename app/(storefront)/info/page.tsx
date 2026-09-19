import type { Metadata } from 'next';
import { api } from '@/lib/upstream';
import { unwrap, AppSettingsDto } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Информация и контакты',
  description: 'Контакты, адреса магазинов и справочная информация сервиса Ласточка Джами.',
};

export const revalidate = 3600; // Granular ISR

export default async function InfoRoute() {
  const settings = unwrap<AppSettingsDto>(await api('app-settings'));

  return (
    <div className="reading panel info-page">
      <h1>Информация и контакты</h1>

      {settings?.additionalInfo?.map((v) => (
        <section key={v.key} className="info-section">
          <h2>{v.title}</h2>
          <p>{typeof v.text === 'string' ? v.text : ''}</p>
        </section>
      ))}

      {settings?.contacts?.phones?.length ? (
        <section className="contacts-section">
          <h2>Служба поддержки</h2>
          <p className="muted">Мы на связи и готовы помочь с вашим заказом:</p>
          <div className="phones-list">
            {settings.contacts.phones.map((p: string) => (
              <p key={p}>
                <a href={'tel:' + p} className="phone-link">
                  {p}
                </a>
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {!settings?.additionalInfo?.length && !settings?.contacts?.phones?.length && (
        <p className="muted">
          Магазин пока не опубликовал расширенную контактную информацию. Ответы на основные вопросы
          доступны в разделе помощи.
        </p>
      )}
    </div>
  );
}
