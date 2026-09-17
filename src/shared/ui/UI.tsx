import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Minus, Heart, ChevronRight, X } from "lucide-react";
import type { Product } from "../../entities/types";
import { useShop } from "../../features/store";
import { money } from "../../features/money";
import s from "./UI.module.css";
export type Panel = { type: string; id?: string };
const UIContext = createContext<{
  panel: Panel | null;
  open: (type: string, id?: string) => void;
  close: () => void;
  toast: (s: string) => void;
}>({ panel: null, open: () => {}, close: () => {}, toast: () => {} });
export const useUI = () => useContext(UIContext);
export function UIProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<Panel | null>(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (message) {
      const id = setTimeout(() => setMessage(""), 3500);
      return () => clearTimeout(id);
    }
  }, [message]);
  return (
    <UIContext.Provider
      value={{
        panel,
        open: (type, id) => setPanel({ type, id }),
        close: () => setPanel(null),
        toast: setMessage,
      }}
    >
      {children}
      {message && (
        <div role="status" className={s.toast}>
          {message}
        </div>
      )}
    </UIContext.Provider>
  );
}
export function Header({
  title,
  back = true,
  children,
}: {
  title: string;
  back?: boolean;
  children?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className={s.header}>
      <div>
        {back && (
          <button
            className={s.icon}
            aria-label="Назад"
            onClick={() =>
              window.history.state?.idx > 0 ? navigate(-1) : navigate("/")
            }
          >
            <ArrowLeft />
          </button>
        )}
      </div>
      <h1 style={title.length > 20 ? { fontSize: 19 } : undefined}>{title}</h1>
      <div className={s.headerActions}>{children}</div>
    </header>
  );
}
export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      prev?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.dialog}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={s.dialogInner}>
        <div className={s.dialogHeader}>
          <h2>{title}</h2>
          <button aria-label="Закрыть" className={s.icon} onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function Quantity({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const quantity = useShop(
      (s) => s.cart.find((x) => x.productId === product.id)?.quantity || 0,
    ),
    change = useShop((s) => s.changeQuantity);
  return quantity ? (
    <div className={`${s.quantity} ${compact ? s.compact : ""}`}>
      <button
        aria-label={"Уменьшить " + product.name}
        onClick={() => change(product.id, -product.quantityStep)}
      >
        <Minus size={19} />
      </button>
      <span>{quantity} шт</span>
      <button
        disabled={quantity >= product.stock}
        aria-label={"Добавить " + product.name}
        onClick={() => change(product.id, product.quantityStep)}
      >
        <Plus size={19} />
      </button>
    </div>
  ) : (
    <button
      className={s.add}
      disabled={product.stock < product.quantityStep}
      onClick={() => change(product.id, product.quantityStep)}
      aria-label={"Добавить " + product.name}
    >
      <Plus size={19} />В корзину
    </button>
  );
}
export function ProductCard({ product }: { product: Product }) {
  const fav = useShop((s) => s.favorites.includes(product.id)),
    toggle = useShop((s) => s.toggleFavorite);
  return (
    <article className={s.product}>
      <Link to={"/product/" + product.id} className={s.productImage}>
        <img src={product.image} alt={product.name} />
      </Link>
      <button
        aria-label={
          (fav ? "Удалить из избранного: " : "В избранное: ") + product.name
        }
        aria-pressed={fav}
        className={s.favorite}
        onClick={() => toggle(product.id)}
      >
        <Heart
          size={22}
          fill={fav ? "var(--red)" : "white"}
          color={fav ? "var(--red)" : "#777"}
        />
      </button>
      <Link to={"/product/" + product.id}>
        <strong>{money(product.price)}</strong>
        <p>{product.name}</p>
      </Link>
      <small>{product.unit}</small>
      <Quantity product={product} />
    </article>
  );
}
export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className={s.productGrid}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
export function Row({
  children,
  onClick,
  sub,
}: {
  children: ReactNode;
  onClick: () => void;
  sub?: string;
}) {
  return (
    <button className={s.row} onClick={onClick}>
      <span>
        {children}
        {sub && <small>{sub}</small>}
      </span>
      <ChevronRight size={22} />
    </button>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      <p>{title}</p>
      {children}
    </div>
  );
}
