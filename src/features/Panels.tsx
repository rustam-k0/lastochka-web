import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Plus, Trash2, Pencil, Check, CreditCard, MapPin } from "lucide-react";
import { Dialog, useUI } from "../shared/ui/UI";
import { useShop, addressText } from "./store";
import {
  catalog,
  checkout,
  loyalty,
  pickupPoints,
  promotion,
} from "../services/shop";
import type { Address } from "../entities/types";
import p from "../pages/Pages.module.css";
import s from "./Panels.module.css";
const titles: Record<string, string> = {
  addresses: "Адреса доставки",
  address: "Адрес доставки",
  bonuses: "Бонусы",
  qr: "Карта лояльности",
  promotions: "Акции и промокоды",
  scanner: "Поиск по штрихкоду",
  profile: "Личные данные",
  login: "Вход в профиль",
  logout: "Выйти из профиля?",
  payment: "Способы оплаты",
  support: "Поддержка",
  documents: "Документы",
  faq: "Вопросы и ответы",
  time: "Время получения",
  pickup: "Пункт самовывоза",
  clear: "Очистить корзину?",
  demo: "Демонстрационные данные",
  share: "Поделиться корзиной",
};
export default function Panels() {
  const { panel, close } = useUI();
  if (!panel) return null;
  return (
    <Dialog
      key={panel.type + (panel.id || "")}
      title={titles[panel.type] || panel.type}
      onClose={close}
    >
      <PanelContent type={panel.type} id={panel.id} />
    </Dialog>
  );
}
function PanelContent({ type, id }: { type: string; id?: string }) {
  const state = useShop(),
    { open, close, toast } = useUI();
  const navigate = useNavigate();
  const [value, setValue] = useState(""),
    [error, setError] = useState("");
  const [slots, setSlots] = useState<
    { id: string; date: string; label: string }[]
  >([]);
  const [day, setDay] = useState("");
  useEffect(() => {
    if (type === "time")
      checkout
        .slots(state.fulfillment.mode)
        .then((x) => {
          setSlots(x);
          setDay(x[0]?.date || "");
        })
        .catch(() =>
          setError(
            "Не удалось загрузить время. Закройте окно и попробуйте снова.",
          ),
        );
  }, [type, state.fulfillment.mode]);
  if (type === "addresses")
    return (
      <div className={s.stack}>
        {state.addresses.length ? (
          state.addresses.map((a) => (
            <div className={s.addressItem} key={a.id}>
              <button
                className={s.addressSelect}
                onClick={() => {
                  state.selectAddress(a.id);
                  close();
                }}
              >
                <MapPin size={22} />
                <span>
                  {addressText(a)}
                  <small>
                    {state.activeAddressId === a.id
                      ? "Выбран для доставки"
                      : "Выбрать адрес"}
                  </small>
                </span>
                {state.activeAddressId === a.id && (
                  <Check size={22} color="var(--red)" />
                )}
              </button>
              <div className={s.addressTools}>
                <button
                  onClick={() => open("address", a.id)}
                  aria-label="Изменить адрес"
                >
                  <Pencil size={16} />
                  Изменить
                </button>
                <button
                  onClick={() => state.deleteAddress(a.id)}
                  aria-label="Удалить адрес"
                >
                  <Trash2 size={16} />
                  Удалить
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className={s.explain}>Добавьте адрес, чтобы выбрать доставку.</p>
        )}
        <button className={p.primary} onClick={() => open("address")}>
          <Plus size={20} />
          Добавить адрес
        </button>
      </div>
    );
  if (type === "address") return <AddressForm id={id} />;
  if (type === "time")
    return (
      <div className={s.stack}>
        <p className={s.explain}>
          Демонстрационные интервалы для{" "}
          {state.fulfillment.mode === "delivery" ? "доставки" : "самовывоза"}.
        </p>
        <div className={s.days}>
          {[...new Set(slots.map((x) => x.date))].map((date) => (
            <button
              className={date === day ? s.selected : ""}
              key={date}
              onClick={() => setDay(date)}
            >
              {date}
            </button>
          ))}
        </div>
        {slots
          .filter((x) => x.date === day)
          .map((x) => (
            <button
              className={s.option}
              key={x.id}
              onClick={() => {
                state.setSlot(x.id);
                close();
              }}
            >
              {x.label}
              {state.fulfillment.slot === x.id && <Check color="var(--red)" />}
            </button>
          ))}
        {error ? (
          <p role="alert" className={p.error}>
            {error}
          </p>
        ) : (
          !slots.length && <p>Загружаем доступное время…</p>
        )}
      </div>
    );
  if (type === "pickup")
    return (
      <div className={s.stack}>
        <p className={s.explain}>
          Демонстрационный пункт. Заказ не будет передан магазину.
        </p>
        {pickupPoints.map((point) => (
          <button
            className={s.option}
            key={point.id}
            onClick={() => {
              state.setPickup(point.id);
              close();
            }}
          >
            <span>
              <b>{point.name}</b>
              <small>{point.address}</small>
            </span>
            {state.fulfillment.pickupId === point.id && (
              <Check color="var(--red)" />
            )}
          </button>
        ))}
      </div>
    );
  if (type === "qr")
    return (
      <div className={s.qr}>
        <QRCodeSVG value={loyalty.code} size={220} />
        <b>0000 0001</b>
        <p>
          Демонстрационная карта лояльности.
          <br />
          QR-код не действует на кассе.
        </p>
      </div>
    );
  if (type === "bonuses")
    return (
      <div className={s.stack}>
        <div className={s.balance}>
          <strong>0</strong>
          <span>бонусов на вашем счёте</span>
        </div>
        <p className={s.explain}>
          Здесь появятся ваши бонусы за покупки. В этой версии начисление и
          списание не выполняются. Правила программы будут добавлены после
          подключения магазина.
        </p>
        <button className={p.primary} onClick={() => open("qr")}>
          Показать карту
        </button>
      </div>
    );
  if (type === "promotions")
    return (
      <form
        className={s.stack}
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim().toUpperCase() === promotion.code) {
            state.setPromo(true);
            setError("");
            toast("Скидка 10% применена к корзине");
            close();
          } else
            setError("Проверьте код. Для проверки используйте ЛАСТОЧКА10.");
        }}
      >
        <div className={s.promo}>
          <span>ДЕМОПРЕДЛОЖЕНИЕ</span>
          <h3>
            Знакомиться приятнее
            <br />
            со скидкой 10%
          </h3>
          <b>{promotion.code}</b>
        </div>
        <p className={s.explain}>{promotion.description}</p>
        <label className={s.field}>
          Промокод
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="ЛАСТОЧКА10"
          />
        </label>
        {error && (
          <p className={p.error} role="alert">
            {error}
          </p>
        )}
        <button className={p.primary} type="submit">
          Применить промокод
        </button>
        {state.promo && (
          <button
            className={s.secondary}
            type="button"
            onClick={() => {
              state.setPromo(false);
              toast("Промокод удалён");
              close();
            }}
          >
            Убрать скидку
          </button>
        )}
      </form>
    );
  if (type === "payment")
    return (
      <div className={s.stack}>
        <p className={s.explain}>
          Платежи в этой версии не выполняются. Вводить данные карты не нужно.
        </p>
        {(
          [
            ["receipt", "При получении"],
            ["demo-card", "Демонстрационная карта •••• 0000"],
          ] as const
        ).map(([key, label]) => (
          <button
            className={s.option}
            key={key}
            onClick={() => {
              state.setPayment(key);
              close();
            }}
          >
            <CreditCard size={22} />
            <span>{label}</span>
            {state.payment === key && <Check color="var(--red)" />}
          </button>
        ))}
      </div>
    );
  if (type === "scanner")
    return (
      <form
        className={s.stack}
        onSubmit={(e) => {
          e.preventDefault();
          const product = catalog
            .products()
            .find((p) => p.sku === value.trim());
          if (product) {
            close();
            navigate("/product/" + product.id);
          } else setError("Товар с таким кодом не найден.");
        }}
      >
        <p className={s.explain}>
          Введите штрихкод вручную. Например, 4600000000000 — малина Фрамбини.
        </p>
        <label className={s.field}>
          Штрихкод
          <input
            inputMode="numeric"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="4600000000000"
          />
        </label>
        {error && <p className={p.error}>{error}</p>}
        <button className={p.primary}>Найти товар</button>
      </form>
    );
  if (type === "profile" || type === "login")
    return <ProfileForm login={type === "login"} />;
  if (type === "logout")
    return (
      <div className={s.stack}>
        <p className={s.explain}>
          Корзина, избранное и локальные заказы останутся в этом браузере.
        </p>
        <button
          className={p.primary}
          onClick={() => {
            state.setProfile({ signedIn: false });
            close();
            toast("Вы вышли из профиля");
          }}
        >
          Выйти
        </button>
        <button className={s.secondary} onClick={close}>
          Остаться
        </button>
      </div>
    );
  if (type === "clear")
    return (
      <div className={s.stack}>
        <p className={s.explain}>Все товары будут удалены из корзины.</p>
        <button
          className={p.primary}
          onClick={() => {
            state.clearCart();
            close();
          }}
        >
          Очистить корзину
        </button>
        <button className={s.secondary} onClick={close}>
          Оставить товары
        </button>
      </div>
    );
  if (type === "demo")
    return (
      <div className={s.stack}>
        <p className={s.explain}>
          Этот режим заменит локальные данные: добавит четыре товара из
          референса, очистит локальные адреса, избранное и историю. Заказы в
          базе сервера останутся. Общая сумма — 1 037,40 ₽.
        </p>
        <button
          className={p.primary}
          onClick={() => {
            state.demo();
            close();
            navigate("/");
            toast("Данные для сравнения с референсом загружены");
          }}
        >
          Загрузить демоданные
        </button>
        <button className={s.secondary} onClick={close}>
          Отмена
        </button>
      </div>
    );
  if (type === "support")
    return (
      <div className={s.stack}>
        <p className={s.explain}>
          Вы в демонстрационной версии магазина. Обращения отсюда не
          отправляются. Контакты поддержки появятся после подключения магазина.
        </p>
        <button className={s.secondary} onClick={() => open("faq")}>
          Вопросы и ответы
        </button>
      </div>
    );
  if (type === "documents")
    return (
      <div className={s.stack}>
        <div className={s.document}>
          <h3>Условия использования</h3>
          <p>
            Это демонстрация интерфейса. Заказы сохраняются на сервере, корзина
            и адреса — в вашем браузере. Реальные покупки, доставка и оплата не
            выполняются.
          </p>
          <h3>Публичная оферта</h3>
          <p>
            Этот раздел — демонстрационный образец, а не юридическая оферта
            магазина. Оформление создаёт тестовую запись в базе данных и не
            заключает договор купли-продажи.
          </p>
          <h3>Ваши данные</h3>
          <p>
            Корзина и адреса хранятся на этом устройстве. Заказы хранятся на
            сервере; доступ к ним привязан к сессии браузера. Очистка данных
            сайта не удаляет заказы на сервере.
          </p>
        </div>
      </div>
    );
  if (type === "faq")
    return (
      <div className={s.faq}>
        {[
          [
            "Это настоящий заказ?",
            "Нет, тестовые заказы сохраняются в базе данных сервера, но не передаются магазину.",
          ],
          [
            "Можно забрать заказ самостоятельно?",
            "Можно проверить сценарий самовывоза: выберите пункт и интервал в корзине.",
          ],
          [
            "Как проверить скидку?",
            "Введите ЛАСТОЧКА10 в разделе «Акции и промокоды» — итог уменьшится на 10%.",
          ],
          [
            "Сохранятся ли мои товары?",
            "Да, в этом браузере после перезагрузки. На другом устройстве эти данные не появятся.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    );
  if (type === "share")
    return (
      <div className={s.stack}>
        <p className={s.explain}>Скопируйте список вручную:</p>
        <textarea
          className={s.shareText}
          readOnly
          value={id || ""}
          onFocus={(e) => e.target.select()}
        />
      </div>
    );
  return null;
}
function AddressForm({ id }: { id?: string }) {
  const state = useShop(),
    { close, toast } = useUI();
  const existing = state.addresses.find((a) => a.id === id);
  const [a, setA] = useState<Address>(
    existing || {
      id: crypto.randomUUID(),
      city: "Нальчик",
      street: "",
      house: "",
      apartment: "",
      entrance: "",
      comment: "",
    },
  );
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!a.city.trim() || !a.street.trim() || !a.house.trim()) {
      setError("Укажите город, улицу и дом.");
      return;
    }
    state.saveAddress(
      Object.fromEntries(
        Object.entries(a).map(([k, v]) => [k, v.trim()]),
      ) as Address,
    );
    close();
    toast("Адрес сохранён");
  }
  return (
    <form className={s.stack} onSubmit={submit}>
      {(
        [
          ["city", "Город", "Нальчик"],
          ["street", "Улица", "Калинина"],
          ["house", "Дом", "76"],
          ["apartment", "Квартира", "Необязательно"],
          ["entrance", "Подъезд", "Необязательно"],
          ["comment", "Комментарий к адресу", "Домофон, ориентир"],
        ] as const
      ).map(([key, label, placeholder]) => (
        <label key={key} className={s.field}>
          {label}
          <input
            required={["city", "street", "house"].includes(key)}
            value={a[key]}
            onChange={(e) => setA({ ...a, [key]: e.target.value })}
            placeholder={placeholder}
            maxLength={200}
          />
        </label>
      ))}
      {error && <p className={p.error}>{error}</p>}
      <button className={p.primary}>Сохранить адрес</button>
    </form>
  );
}
function ProfileForm({ login }: { login: boolean }) {
  const profile = useShop((s) => s.profile),
    save = useShop((s) => s.setProfile),
    { close, toast } = useUI();
  const [name, setName] = useState(profile.name),
    [phone, setPhone] = useState(profile.phone),
    [error, setError] = useState("");
  return (
    <form
      className={s.stack}
      onSubmit={(e) => {
        e.preventDefault();
        if (phone.replace(/\D/g, "").length !== 11) {
          setError("Введите номер из 11 цифр, начиная с 7.");
          return;
        }
        save({ name: name.trim(), phone, signedIn: true });
        close();
        toast(login ? "Демонстрационный вход выполнен" : "Профиль сохранён");
      }}
    >
      <p className={s.explain}>
        Демонстрационный профиль. SMS не отправляется. Можно оставить фиктивный
        номер.
      </p>
      <label className={s.field}>
        Имя
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Как к вам обращаться"
          maxLength={60}
        />
      </label>
      <label className={s.field}>
        Телефон
        <input
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+7 000 000-00-00"
        />
      </label>
      {error && <p className={p.error}>{error}</p>}
      <button className={p.primary}>
        {login ? "Войти без SMS" : "Сохранить"}
      </button>
    </form>
  );
}
