'use client';

import { useState } from 'react';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { list, unwrap, NotificationDto } from '@/lib/types';
import { request } from '@/lib/client';
import { useShop } from '@/components/shop-context';
import { Empty, Modal } from '@/components/ui';
import { useRemote, RemoteState } from '../hooks/use-remote';

export function NotificationsView() {
  const remote = useRemote<NotificationDto[]>('notifications?perPage=50');
  const s = useShop();
  const [selectedNotification, setSelectedNotification] = useState<NotificationDto | null>(null);

  const notifications = list<NotificationDto>(remote.data);

  const markAllRead = async () => {
    await s.run(async () => {
      await request('notifications/read-all', 'PATCH');
      await remote.reload();
      s.notice('Все уведомления прочитаны');
    });
  };

  const openNotification = async (n: NotificationDto) => {
    await s.run(async () => {
      const detail = unwrap<NotificationDto>(await request(`notifications/${n.id}`));
      setSelectedNotification(detail);
      await request(`notifications/${n.id}/read`, 'PATCH');
      await remote.reload();
    });
  };

  return (
    <div className="account-section">
      <div className="section-header">
        <div>
          <h1>Уведомления</h1>
          <p className="muted">Статусы ваших заказов, персональные предложения и новости.</p>
        </div>
        {notifications.length > 0 && (
          <button className="secondary" onClick={markAllRead} type="button">
            <CheckCheck size={16} /> Прочитать все
          </button>
        )}
      </div>

      <RemoteState r={remote}>
        <div className="notifications-list">
          {notifications.length ? (
            notifications.map((n) => (
              <button
                className={`panel notification-item ${!n.isRead ? 'unread' : ''}`}
                key={n.id}
                onClick={() => openNotification(n)}
                type="button"
              >
                <div className="notif-icon">
                  <Bell size={20} />
                </div>
                <div className="notif-content">
                  <strong>{n.title}</strong>
                  <p className="muted">{n.body || n.text}</p>
                  {n.createdAt && (
                    <small className="notif-date">
                      {new Date(n.createdAt).toLocaleString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </small>
                  )}
                </div>
                <ChevronRight size={18} className="chevron" />
              </button>
            ))
          ) : (
            <Empty title="Пока нет уведомлений">
              <p>Здесь появятся сообщения о статусах заказов и выгодных акциях.</p>
            </Empty>
          )}
        </div>
      </RemoteState>

      {selectedNotification && (
        <Modal
          title={selectedNotification.title || 'Уведомление'}
          onClose={() => setSelectedNotification(null)}
        >
          <div className="notification-modal-content">
            <p>{selectedNotification.body || selectedNotification.text}</p>
            {selectedNotification.createdAt && (
              <small className="muted">
                {new Date(selectedNotification.createdAt).toLocaleString('ru-RU')}
              </small>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
