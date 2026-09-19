'use client';

import Link from 'next/link';
import { list, unwrap, StoryDto } from '@/lib/types';
import { Photo, Empty } from '@/components/ui';
import { useRemote, RemoteState } from './hooks/use-remote';

export function PublicContent({ type, id }: { type: string; id?: string }) {
  const remote = useRemote<any>(type + (id ? '/' + id : ''));
  const detail = unwrap<StoryDto>(remote.data);
  const items = list<any>(remote.data);

  const title = type === 'stories' ? 'Истории' : 'Акции и специальные предложения';

  return (
    <div className="account-section public-content-page">
      <div className="section-header">
        <h1>{title}</h1>
        {id && (
          <Link href={`/${type}`} className="text-button">
            ← Ко всем {type === 'stories' ? 'историям' : 'акциям'}
          </Link>
        )}
      </div>

      <RemoteState r={remote}>
        {id ? (
          <article className="reading panel single-story">
            <h2>{detail?.title}</h2>
            {detail?.image?.path && (
              <div className="story-photo-wrapper">
                <Photo src={detail.image.path} alt={detail.title} />
              </div>
            )}
            <p>{detail?.description || detail?.text}</p>
            {detail?.videoUrl && (
              <div className="story-video-wrapper">
                <video controls src={detail.videoUrl} className="story-video" />
              </div>
            )}
          </article>
        ) : items.length ? (
          <div className="category-tiles content-tiles">
            {items.map((item) => (
              <Link href={`/${type}/${item.id}`} key={item.id} className="category-tile content-tile">
                <Photo src={item.image?.path || item.preview?.path} alt={item.title} />
                <strong>{item.title}</strong>
              </Link>
            ))}
          </div>
        ) : (
          <Empty title={type === 'stories' ? 'Историй пока нет' : 'Пока нет активных акций'} />
        )}
      </RemoteState>
    </div>
  );
}
