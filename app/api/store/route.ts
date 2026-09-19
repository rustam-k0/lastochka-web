import { NextResponse } from 'next/server';
import { session, setStore } from '@/lib/session';
import { validMutation } from '@/lib/guard';
import { upstream, ApiError } from '@/lib/upstream';

export async function POST(req: Request) {
  const currentSession = await session();
  if (!validMutation(req, currentSession)) {
    return NextResponse.json({ message: 'Обновите страницу' }, { status: 403 });
  }

  try {
    const { storeId } = await req.json();
    if (!Number.isSafeInteger(storeId)) {
      return NextResponse.json({ message: 'Выберите магазин' }, { status: 422 });
    }

    if (currentSession!.token) {
      try {
        const response = await upstream('addresses/active', { token: currentSession!.token });
        const active = response?.data ?? response;
        if (active?.id) {
          return NextResponse.json(
            {
              message:
                'Для доставки магазин определяется выбранным адресом. Измените адрес доставки или выберите самовывоз в корзине.',
              activeStoreId: Number(active.storeId || active.store?.id) || null,
            },
            { status: 409 },
          );
        }
      } catch (err) {
        if (err instanceof ApiError && err.status !== 404) {
          throw err;
        }
      }
    }

    const stores = await upstream('stores', { token: currentSession!.token });
    const chosen = stores.data?.find(
      (x: { id: number; isActive?: boolean }) => x.id === storeId && x.isActive,
    );

    if (!chosen) {
      return NextResponse.json({ message: 'Магазин недоступен' }, { status: 422 });
    }

    let cart = null;
    if (currentSession!.token) {
      await upstream('cart/store', {
        method: 'POST',
        body: { storeId },
        token: currentSession!.token,
      });
      const response = await upstream('cart', { token: currentSession!.token });
      cart = response?.data ?? response;
    }

    await setStore(currentSession!, storeId);

    return NextResponse.json(
      { ok: true, store: chosen, cart },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      err instanceof ApiError
        ? err.payload
        : { message: err instanceof Error ? err.message : 'Ошибка выбора магазина' },
      { status: err instanceof ApiError ? err.status : 502 },
    );
  }
}
