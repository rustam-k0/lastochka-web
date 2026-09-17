import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Share2,
  Trash2,
  Clock3,
  ChevronRight,
  ShoppingBasket,
} from "lucide-react";
import { Header, Quantity, Row, Empty, useUI } from "../shared/ui/UI";
import { useShop, addressText } from "../features/store";
import { totals, money } from "../features/money";
import { validateCheckout } from "../features/checkout";
import { catalog, checkout, pickupPoints } from "../services/shop";

import type { CreateOrderInput } from "../entities/types";
import { formatSlot } from "./MainPages";
import p from "./Pages.module.css";
import s from "../app/App.module.css";
export default function Cart() {
  const state = useShop(),
    { open, toast } = useUI(),
    navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false);
  const locked = useRef(false);
  useEffect(() => {
    setErrors((e) => {
      const { slot, ...rest } = e;
      return rest;
    });
  }, [state.fulfillment.slot]);
  const products = catalog.products(),
    total = totals(state.cart, products, state.promo);
  const address = state.addresses.find((a) => a.id === state.activeAddressId);
  const point = pickupPoints.find((p) => p.id === state.fulfillment.pickupId);
  const destination =
    state.fulfillment.mode === "delivery"
      ? addressText(address)
      : point?.address || "";
  async function share() {
    const text =
      "Моя корзина в Ласточке\n" +
      state.cart
        .map((l) => {
          const p = catalog.product(l.productId)!;
          return `${p.name} — ${l.quantity} шт · ${money(p.price * l.quantity)}`;
        })
        .join("\n") +
      `\nИтого: ${money(total.total)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Корзина Ласточки", text });
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        toast("Список товаров скопирован");
        return;
      }
      open("share", text);
    } catch (e) {
      if ((e as Error).name !== "AbortError") open("share", text);
    }
  }
  async function placeOrder() {
    if (locked.current) return;
    const input: CreateOrderInput = {
      items: state.cart,
      fulfillment: state.fulfillment,
      destination,
      comment: state.comment.trim(),
      payment: state.payment,
      customer: { name: state.profile.name, phone: state.profile.phone },
      promoCode: state.promo ? "ЛАСТОЧКА10" : "",
      consent: state.consent,
      expectedTotal: total.total,
    };
    const retry = checkout.hasPending(input);
    const errors = retry
      ? {}
      : validateCheckout(
          state.cart,
          products,
          state.fulfillment,
          destination,
          state.consent,
        );
    setErrors(errors);
    if (Object.keys(errors).length) {
      setTimeout(
        () =>
          document
            .querySelector("[data-error]")
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        0,
      );
      return;
    }
    locked.current = true;
    setBusy(true);
    try {
      if (!retry) {
        const available = await catalog.availability(destination);
        const freshErrors = validateCheckout(
          state.cart,
          available,
          state.fulfillment,
          destination,
          state.consent,
        );
        const slots = await checkout.slots(state.fulfillment.mode);
        if (!slots.some((x) => x.id === state.fulfillment.slot))
          freshErrors.slot =
            "Этот интервал больше недоступен. Выберите другой.";
        if (Object.keys(freshErrors).length) {
          setErrors(freshErrors);
          return;
        }
      }
      const saved = await checkout.createOrder(input);
      useShop.getState().completeOrder(saved);
      checkout.clearPending();
      void catalog.load().catch(() => {});
      navigate("/orders/" + saved.id, { replace: true });
    } catch (error) {
      void catalog.load().catch(() => {});
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "Не удалось сохранить заказ. Попробуйте ещё раз.",
      });
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Header title="Корзина">
        <button
          className={s.icon}
          disabled={!state.cart.length}
          aria-label="Поделиться корзиной"
          onClick={share}
        >
          <Share2 size={23} />
        </button>
        <button
          className={s.icon}
          disabled={!state.cart.length}
          aria-label="Очистить корзину"
          onClick={() => open("clear")}
        >
          <Trash2 size={24} />
        </button>
      </Header>
      {!state.cart.length ? (
        <div className={p.cartEmpty}>
          <Empty title="">
            <ShoppingBasket size={74} strokeWidth={1.25} />
            <h2>В корзине пока пусто</h2>
            <p>Самое вкусное уже ждёт в каталоге</p>
            <Link to="/catalog" className={p.primary}>
              Перейти в каталог
            </Link>
          </Empty>
        </div>
      ) : (
        <>
          <div className={p.cart} inert={busy}>
            <div className={p.cartMain}>
              <div className={p.switch} aria-label="Способ получения">
                {(
                  [
                    ["delivery", "Доставка"],
                    ["pickup", "Самовывоз"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    className={
                      state.fulfillment.mode === mode ? p.selected : ""
                    }
                    aria-pressed={state.fulfillment.mode === mode}
                    onClick={() => {
                      state.setMode(mode);
                      setErrors({});
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button className={p.time} onClick={() => open("time")}>
                <Clock3 color="var(--red)" size={23} />
                <span>
                  {state.fulfillment.slot ? (
                    <>
                      <small>
                        {state.fulfillment.mode === "delivery"
                          ? "Доставим"
                          : "Можно забрать"}
                      </small>
                      {formatSlot(state.fulfillment.slot)}
                    </>
                  ) : (
                    "Выберите время"
                  )}
                </span>
                <ChevronRight size={25} />
              </button>
              {errors.slot && (
                <p data-error className={p.error} role="alert">
                  {errors.slot}
                </p>
              )}
              <div className={p.cartItems}>
                {state.cart.map((l) => {
                  const product = catalog.product(l.productId);
                  if (!product) return null;
                  return (
                    <article className={p.cartItem} key={l.productId}>
                      <Link to={"/product/" + product.id}>
                        <img src={product.image} alt={product.name} />
                      </Link>
                      <Link
                        className={p.cartItemName}
                        to={"/product/" + product.id}
                      >
                        <p>{product.name}</p>
                        <small>{money(product.price)} / 1 шт</small>
                      </Link>
                      <div className={p.cartPrice}>
                        <b>{money(product.price * l.quantity)}</b>
                        <Quantity product={product} compact />
                      </div>
                    </article>
                  );
                })}
              </div>
              {errors.cart && (
                <p data-error className={p.error}>
                  {errors.cart}
                </p>
              )}
              <label className={p.comment}>
                <span>Комментарий сборщику</span>
                <textarea
                  placeholder="Пиццу очень ждём тёпленькой! :)"
                  value={state.comment}
                  onChange={(e) => state.setComment(e.target.value)}
                  maxLength={500}
                />
              </label>
            </div>
            <div className={p.cartAside}>
              <div className={p.checkoutFields}>
                <Row
                  onClick={() =>
                    open(
                      state.fulfillment.mode === "delivery"
                        ? "addresses"
                        : "pickup",
                    )
                  }
                  sub={destination || "Нужно выбрать для заказа"}
                >
                  {state.fulfillment.mode === "delivery"
                    ? "Адрес доставки"
                    : "Пункт самовывоза"}
                </Row>
                {errors.destination && !destination && (
                  <p data-error className={p.error} role="alert">
                    {errors.destination}
                  </p>
                )}
                <Row
                  onClick={() => open("payment")}
                  sub={
                    state.payment === "receipt"
                      ? "При получении"
                      : "Демонстрационная карта •••• 0000"
                  }
                >
                  Способ оплаты
                </Row>
                <Row
                  onClick={() => open("promotions")}
                  sub={
                    state.promo ? "ЛАСТОЧКА10 · скидка 10%" : "Есть промокод?"
                  }
                >
                  Акции и промокоды
                </Row>
              </div>
              <div className={p.summary}>
                <div>
                  <span>Товары</span>
                  <span>{money(total.subtotal)}</span>
                </div>
                {state.promo && (
                  <div>
                    <span>Скидка 10%</span>
                    <span>−{money(total.discount)}</span>
                  </div>
                )}
                <div>
                  <span>
                    {state.fulfillment.mode === "delivery"
                      ? "Доставка в демоверсии"
                      : "Самовывоз"}
                  </span>
                  <span>Бесплатно</span>
                </div>
                <div>
                  <b>Итого</b>
                  <b data-testid="cart-total">{money(total.total)}</b>
                </div>
              </div>
              <p className={p.demoNotice}>
                Тестовый заказ: деньги не спишутся, магазин не получит заказ.
                Заказ сохранится в базе данных сервера.
              </p>
              {errors.submit && (
                <p data-error className={p.error} role="alert">
                  {errors.submit}
                </p>
              )}
              {errors.consent && !state.consent && (
                <p data-error className={p.error} role="alert">
                  {errors.consent}
                </p>
              )}
            </div>
          </div>
          <footer className={p.checkoutBar}>
            <p className={p.checkoutHint}>
              Тестовый заказ · без оплаты и доставки
            </p>
            <button className={p.primary} disabled={busy} onClick={placeOrder}>
              {busy ? "Оформляем…" : "Заказать"}
            </button>
            <div className={p.consent}>
              <input
                id="consent"
                type="checkbox"
                aria-label="Согласие с условиями"
                disabled={busy}
                checked={state.consent}
                onChange={(e) => state.setConsent(e.target.checked)}
              />
              <div>
                <label htmlFor="consent">Я согласен с </label>
                <button onClick={() => open("documents")}>
                  условиями использования и публичной офертой
                </button>
              </div>
            </div>
          </footer>
        </>
      )}
    </>
  );
}
