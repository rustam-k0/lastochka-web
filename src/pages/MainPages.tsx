import { Link, useParams } from "react-router-dom";
import {
  House,
  Bell,
  ChevronRight,
  ScanQrCode,
  Heart,
  Search,
  LogOut,
  CirclePlus,
  CreditCard,
  UserRound,
  ArrowRight,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { catalog, loyalty, assets, searchProducts } from "../services/shop";
import { useShop, addressText } from "../features/store";
import { money } from "../features/money";
import { Header, ProductGrid, Empty, Quantity, useUI } from "../shared/ui/UI";
import s from "../app/App.module.css";
import p from "./Pages.module.css";
export function Home() {
  const { open } = useUI();
  const address = useShop((x) =>
    x.addresses.find((a) => a.id === x.activeAddressId),
  );
  return (
    <div className={s.home}>
      <div className={s.top}>
        <div className={s.addressRow}>
          <button className={s.address} onClick={() => open("addresses")}>
            <House color="#a6a6a6" size={21} />
            <span>
              {address
                ? `${address.street}, ${address.house}`
                : "Добавить адрес"}
            </span>
            <ChevronRight size={20} />
          </button>
          <Link to="/notifications" aria-label="Уведомления" className={s.icon}>
            <Bell />
          </Link>
        </div>
        <div className={s.desktopGreeting}>
          <h1>Магазин у дома «Ласточка»</h1>
          <p>Свежая выпечка, готовая еда и продукты с доставкой от 30 минут</p>
        </div>
        <div className={s.loyalty}>
          <div className={s.loyaltyLeft}>
            <button className={s.bonus} onClick={() => open("bonuses")}>
              <House color="#aaa" size={20} />
              <div>
                <span>Бонусы</span>
                <strong>{loyalty.balance}</strong>
              </div>
              <small>
                Копите
                <br />и тратьте
              </small>
            </button>
            <button className={s.promo} onClick={() => open("promotions")}>
              <House color="#aaa" size={20} />
              Акции и промокоды
            </button>
          </div>
          <button
            className={s.qr}
            aria-label="Карта лояльности"
            onClick={() => open("qr")}
          >
            <QRCodeSVG value={loyalty.code} bgColor="#f2f2f2" />
          </button>
        </div>
      </div>
      <section className={s.sheet}>
        <h2>Рекомендуем</h2>
        <div className={s.collections}>
          {catalog.collections().map((c) => (
            <Link
              to={"/collection/" + c.id}
              key={c.id}
              className={`${s.collection} ${c.dark ? s.collectionDark : ""}`}
              style={{ background: c.color }}
            >
              <h3>{c.name}</h3>
              <img src={c.image} alt="" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
export function Catalog() {
  const { open } = useUI();
  const address = useShop((x) =>
    x.addresses.find((a) => a.id === x.activeAddressId),
  );
  return (
    <div className={p.catalog}>
      <div className={p.catalogTop}>
        <p>
          {address ? (
            addressText(address)
          ) : (
            <>
              Укажите адрес, чтобы видеть
              <br />
              актуальный товар и срок доставки
            </>
          )}
        </p>
        <button className={p.primary} onClick={() => open("addresses")}>
          {address ? "Изменить адрес" : "Ввести адрес"}
        </button>
      </div>
      <div className={s.sheet}>
        <div className={p.searchRow}>
          <Link to="/search" className={p.searchLink}>
            <span>Поиск</span>
            <Search size={22} />
          </Link>
          <button
            aria-label="Поиск по штрихкоду"
            onClick={() => open("scanner")}
          >
            <ScanQrCode />
          </button>
          <Link to="/favorites" aria-label="Избранное">
            <Heart />
          </Link>
        </div>
        {["Готовая еда", "Хлеб и булочки"].map((group) => (
          <section className={p.categorySection} key={group}>
            <h2>{group}</h2>
            <div className={p.categories}>
              {catalog
                .categories()
                .filter((c) => c.group === group)
                .map((c) => (
                  <Link
                    to={"/category/" + c.id}
                    className={p.category}
                    key={c.id}
                    style={{ background: c.color }}
                  >
                    <span>{c.name}</span>
                    <img src={c.image} alt="" />
                  </Link>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
export function Favorites() {
  const ids = useShop((s) => s.favorites);
  return (
    <>
      <Header title="Избранное" back={false} />
      {ids.length ? (
        <div className={p.content}>
          <ProductGrid
            products={catalog.products().filter((p) => ids.includes(p.id))}
          />
        </div>
      ) : (
        <div className={p.favoritesEmpty}>
          <img src={assets.swallow} alt="Ласточка" />
          <p>Любимые товары отобразятся здесь</p>
        </div>
      )}
    </>
  );
}
export function Profile() {
  const { open } = useUI();
  const state = useShop();
  return (
    <>
      <Header title="Профиль" back={false}>
        <Link to="/notifications" className={s.icon} aria-label="Уведомления">
          <Bell size={23} />
        </Link>
        <button
          className={s.icon}
          aria-label={state.profile.signedIn ? "Выйти" : "Войти"}
          onClick={() =>
            state.profile.signedIn ? open("logout") : open("login")
          }
        >
          <LogOut size={23} />
        </button>
      </Header>
      <div className={p.profile}>
        <div className={p.profileCards}>
          <button
            className={p.userCard}
            onClick={() => open(state.profile.signedIn ? "profile" : "login")}
          >
            <div>
              <strong>
                {state.profile.signedIn
                  ? state.profile.name || state.profile.phone
                  : "Войти в профиль"}
              </strong>
              <p>
                {state.profile.signedIn
                  ? state.profile.phone
                  : "Сохраняйте ваши покупки"}
              </p>
            </div>
            <ChevronRight />
          </button>
          <button className={p.bonusCard} onClick={() => open("bonuses")}>
            <div>
              <strong>0</strong>
              <p>бонусов</p>
            </div>
            <u>
              Как получить
              <br />
              бонусы?
            </u>
          </button>
        </div>
        <div className={p.profileHeading}>
          <h2>Мои заказы</h2>
          <Link to="/orders">Все заказы</Link>
        </div>
        {state.orders.slice(0, 1).map((o) => (
          <Link className={p.recentOrder} key={o.id} to={"/orders/" + o.id}>
            <span>
              {o.status}
              <small>№ {o.id.slice(-6)}</small>
            </span>
            <b>{money(o.total)}</b>
            <ChevronRight size={18} />
          </Link>
        ))}
        <button className={p.profileAction} onClick={() => open("promotions")}>
          <h2>Акции и промокоды</h2>
          <ChevronRight />
        </button>
        <button className={p.profileAction} onClick={() => open("payment")}>
          <CreditCard size={24} />
          <h2>Способы оплаты</h2>
          <CirclePlus color="#666" />
        </button>
        <button className={p.profileAction} onClick={() => open("addresses")}>
          <h2>Адреса доставки</h2>
          <CirclePlus color="#666" />
        </button>
        {state.addresses.length ? (
          <button className={p.savedAddress} onClick={() => open("addresses")}>
            {addressText(
              state.addresses.find((a) => a.id === state.activeAddressId) ||
                state.addresses[0],
            )}
          </button>
        ) : (
          <p className={p.noAddresses}>Нет адресов доставки</p>
        )}
        <div className={p.support}>
          <button onClick={() => open("support")}>Поддержка</button>
          <div>
            <button onClick={() => open("documents")}>Документы</button>
            <button onClick={() => open("faq")}>Вопросы и ответы</button>
          </div>
        </div>
      </div>
    </>
  );
}
export function Notifications() {
  return (
    <>
      <Header title="Уведомления" />
      <div className={p.notifications}>Нет данных</div>
    </>
  );
}
export function Listing({ collection = false }: { collection?: boolean }) {
  const { id } = useParams();
  const c = collection
    ? catalog.collections().find((c) => c.id === id)
    : catalog.categories().find((c) => c.id === id);
  if (!c) return <NotFound />;
  const products = catalog
    .products()
    .filter((p) =>
      collection
        ? "productIds" in c && c.productIds.includes(p.id)
        : p.categoryId === id,
    );
  return (
    <>
      <Header title={c.name} />
      <div className={p.content}>
        <ProductGrid products={products} />
      </div>
    </>
  );
}
export function SearchPage() {
  const query = useShop((s) => s.search),
    set = useShop((s) => s.setSearch);
  const products = searchProducts(query);
  return (
    <>
      <Header title="Поиск" />
      <div className={p.content}>
        <div className={p.searchInput}>
          <Search size={22} />
          <input
            autoFocus
            aria-label="Поиск товаров"
            placeholder="Название товара"
            value={query}
            onChange={(e) => set(e.target.value)}
          />
          {query && (
            <button onClick={() => set("")} aria-label="Очистить поиск">
              ×
            </button>
          )}
        </div>
        {products.length ? (
          <>
            <p className={p.resultCount}>
              {query
                ? `Найдено товаров: ${products.length}`
                : "Товары магазина"}
            </p>
            <ProductGrid products={products} />
          </>
        ) : (
          <Empty title="Ничего не найдено">
            <p className={p.note}>Попробуйте другое название</p>
          </Empty>
        )}
      </div>
    </>
  );
}
export function ProductPage() {
  const { id } = useParams();
  const product = catalog.product(id || "");
  const fav = useShop((s) => s.favorites.includes(id || "")),
    toggle = useShop((s) => s.toggleFavorite);
  if (!product) return <NotFound />;
  return (
    <>
      <Header title="Товар">
        <button
          aria-label="В избранное"
          aria-pressed={fav}
          className={s.icon}
          onClick={() => toggle(product.id)}
        >
          <Heart
            color={fav ? "var(--red)" : "currentColor"}
            fill={fav ? "var(--red)" : "none"}
          />
        </button>
      </Header>
      <div className={`${p.content} ${p.detail}`}>
        <img className={p.detailImage} src={product.image} alt={product.name} />
        <div className={p.detailBody}>
          <h1 className={p.detailTitle}>{product.name}</h1>
          <p className={p.note}>
            {product.unit} · В наличии {product.stock} шт.
          </p>
          <div className={p.priceRow}>
            <b>{money(product.price)}</b>
            <Quantity product={product} />
          </div>
          <section className={p.description}>
            <h2>О товаре</h2>
            <p>{product.description}</p>
            <small>Артикул: {product.sku}</small>
          </section>
        </div>
      </div>
    </>
  );
}
export function Orders() {
  const orders = useShop((s) => s.orders);
  return (
    <>
      <Header title="Мои заказы" />
      <div className={`${p.content} ${orders.length ? p.orders : ""}`}>
        {orders.length ? (
          orders.map((o) => (
            <Link className={p.orderCard} to={"/orders/" + o.id} key={o.id}>
              <div>
                <h3>Заказ № {o.id.slice(-6)}</h3>
                <small>
                  {new Date(o.createdAt).toLocaleDateString("ru-RU")}
                </small>
              </div>
              <span className={p.badge}>{o.status}</span>
              <div className={p.orderImages}>
                {o.lines.slice(0, 4).map((l) => (
                  <img
                    key={l.product.id}
                    src={l.product.image}
                    alt={l.product.name}
                  />
                ))}
              </div>
              <b>{money(o.total)}</b>
              <ArrowRight size={20} />
            </Link>
          ))
        ) : (
          <Empty title="Пока нет заказов">
            <Link to="/catalog" className={p.primary}>
              Перейти в каталог
            </Link>
          </Empty>
        )}
      </div>
    </>
  );
}
export function OrderDetail() {
  const { id } = useParams();
  const o = useShop((s) => s.orders.find((x) => x.id === id));
  if (!o) return <NotFound />;
  return (
    <>
      <Header title={"Заказ № " + o.id.slice(-6)} />
      <div className={`${p.content} ${p.readable}`}>
        <div className={p.success}>
          <div>✓</div>
          <h2>Тестовый заказ оформлен</h2>
          <p>
            {o.storage === "server"
              ? "Он сохранён в базе данных сервера."
              : "Он сохранён только в этом браузере."}
            <br />
            Магазин не получил заказ, оплата не списана.
          </p>
        </div>
        <div className={p.infoBox}>
          <b>{o.fulfillment.mode === "delivery" ? "Доставка" : "Самовывоз"}</b>
          <p>{o.destination}</p>
          <p>{formatSlot(o.fulfillment.slot)}</p>
          <p>
            {o.payment === "receipt"
              ? "Оплата при получении"
              : "Демонстрационная карта"}
          </p>
        </div>
        {o.lines.map((l) => (
          <div className={p.orderLine} key={l.product.id}>
            <img src={l.product.image} alt="" />
            <span>
              {l.product.name}
              <small>
                {l.quantity} шт × {money(l.product.price)}
              </small>
            </span>
            <b>{money(l.product.price * l.quantity)}</b>
          </div>
        ))}
        {o.comment && <p className={p.infoBox}>Комментарий: {o.comment}</p>}
        <div className={p.summary}>
          <div>
            <span>Товары</span>
            <span>{money(o.subtotal)}</span>
          </div>
          <div>
            <span>Скидка</span>
            <span>−{money(o.discount)}</span>
          </div>
          <div>
            <span>Доставка</span>
            <span>{money(o.delivery)}</span>
          </div>
          <div>
            <b>Итого</b>
            <b>{money(o.total)}</b>
          </div>
        </div>
        <Link to="/catalog" className={p.primary}>
          Продолжить покупки
        </Link>
      </div>
    </>
  );
}
export function formatSlot(slot: string) {
  if (!slot) return "";
  const [, date, time] = slot.split("|");
  return (
    new Date(date + "T12:00:00").toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
    }) +
    ", " +
    time
  );
}
export function NotFound() {
  return (
    <>
      <Header title="Страница не найдена" />
      <Empty title="Кажется, здесь пока ничего нет">
        <Link className={p.primary} to="/">
          На главную
        </Link>
      </Empty>
    </>
  );
}
