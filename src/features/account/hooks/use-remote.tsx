'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { request } from '@/lib/client';
import { ErrorMessage } from '@/components/ui';

export interface RemoteStateResult<T = any> {
  data: T | undefined;
  error: string;
  loading: boolean;
  reload: () => Promise<void>;
}

export function useRemote<T = any>(path: string | null): RemoteStateResult<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!!path);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError('');
    try {
      const response = await request<T>(path);
      setData(response);
    } catch (e: any) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: load };
}

export function RemoteState<T = any>({
  r,
  children,
}: {
  r: RemoteStateResult<T>;
  children: ReactNode;
}) {
  if (r.loading) {
    return <p className="muted">Загружаем…</p>;
  }
  if (r.error) {
    return <ErrorMessage message={r.error} retry={r.reload} />;
  }
  return <>{children}</>;
}
