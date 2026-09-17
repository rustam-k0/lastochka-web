import { useWebMCP } from "./useWebMCP";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  BrowserRouter,
  NavLink,
  Link,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import {
  House,
  Menu,
  Heart,
  UserRound,
  Search,
  ShoppingBasket,
} from "lucide-react";
import { UIProvider, useUI } from "../shared/ui/UI";
import Panels from "../features/Panels";
import { useShop } from "../features/store";
import { money, totals } from "../features/money";
import { catalog, checkout } from "../services/shop";
import {
  Home,
  Catalog,
  Favorites,
  Profile,
  Notifications,
  Listing,
  SearchPage,
  ProductPage,
  Orders,
  OrderDetail,
  NotFound,
} from "../pages/MainPages";
import Cart from "../pages/Cart";
import s from "./App.module.css";
import p from "../pages/Pages.module.css";
const scrollPositions = new Map<string, number>();
function Shell() {
  useWebMCP();
  useSyncExternalStore(catalog.subscribe, catalog.snapshot);
  const location = useLocation(),
    { open, close, toast } = useUI();
  const cart = useShop((s) => s.cart),
    promo = useShop((s) => s.promo),
    addressId = useShop((s) =>
      JSON.stringify(
        s.addresses.find((a) => a.id === s.activeAddressId) || null,
      ),
    );
  const first = useRef(true);
  const main = ["/", "/catalog", "/favorites", "/profile"].includes(
    location.pathname,
  );
  const shopping =
    main || /^\/(category|collection|product|search)/.test(location.pathname);
  useLayoutEffect(() => {
    window.scrollTo(0, scrollPositions.get(location.pathname) || 0);
    const save = () => scrollPositions.set(location.pathname, window.scrollY);
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [location.pathname]);
  useEffect(() => {
    close();
    if (first.current) {
      first.current = false;
      if (new URLSearchParams(location.search).has("demo")) open("demo");
    }
  }, [location.pathname]);
  useEffect(() => {
    void catalog
      .availability(addressId)
      .catch(() => toast("Не удалось обновить наличие товаров."));
  }, [addressId]);
  return (
    <>
      <main className={s.shell}>
        <div className={s.desktopBrand}>
          <img src="/images/logo.png" alt="" />
          <span>
            Ласточка<small>ДЖАМИ · МАГАЗИН</small>
          </span>
        </div>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/category/:id" element={<Listing />} />
          <Route path="/collection/:id" element={<Listing collection />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {shopping && (
          <>
            <div className={s.floating}>
              <Link to="/search" className={s.searchFloat}>
                <Search size={22} />
                Поиск
              </Link>
              <Link
                to="/cart"
                className={s.cartFloat}
                aria-label={
                  "Корзина, " +
                  money(totals(cart, catalog.products(), promo).total)
                }
              >
                <ShoppingBasket size={23} />
                {money(totals(cart, catalog.products(), promo).total)}
              </Link>
            </div>
            <nav aria-label="Основная навигация" className={s.nav}>
              {[
                { path: "/", title: "Главная", Icon: House },
                { path: "/catalog", title: "Каталог", Icon: Menu },
                { path: "/favorites", title: "Избранное", Icon: Heart },
                { path: "/profile", title: "Профиль", Icon: UserRound },
              ].map(({ path, title, Icon }) => (
                <NavLink
                  end
                  to={path}
                  key={path}
                  className={({ isActive }) => (isActive ? s.active : "")}
                >
                  <Icon />
                  {title}
                </NavLink>
              ))}
            </nav>
          </>
        )}
      </main>
      <Panels />
    </>
  );
}
export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    Promise.all([catalog.load(), checkout.orders()])
      .then(([, orders]) => {
        if (!active) return;
        useShop.getState().hydrateOrders(orders);
        setReady(true);
      })
      .catch(() => {
        if (active)
          setError(
            "Не удалось подключиться к магазину. Проверьте соединение и повторите попытку.",
          );
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  if (!ready)
    return (
      <main className={s.shell}>
        <div className={p.content}>
          <p role={error ? "alert" : "status"} className={p.infoBox}>
            {error || "Загружаем магазин…"}
          </p>
          {error && (
            <button
              className={p.primary}
              onClick={() => setAttempt((n) => n + 1)}
            >
              Повторить
            </button>
          )}
        </div>
      </main>
    );
  return (
    <BrowserRouter>
      <UIProvider>
        <Shell />
      </UIProvider>
    </BrowserRouter>
  );
}
