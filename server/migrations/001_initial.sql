CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  is_visible INTEGER NOT NULL DEFAULT 1 CHECK(is_visible IN (0, 1))
) STRICT;
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  price INTEGER NOT NULL CHECK(price >= 0),
  unit TEXT NOT NULL,
  stock INTEGER NOT NULL CHECK(stock >= 0),
  quantity_step INTEGER NOT NULL CHECK(quantity_step > 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
  sort_order INTEGER NOT NULL
) STRICT;
CREATE INDEX products_category ON products(category_id);
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  owner_hash TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  fulfillment_mode TEXT NOT NULL CHECK(fulfillment_mode IN ('delivery', 'pickup')),
  pickup_id TEXT NOT NULL,
  destination TEXT NOT NULL,
  slot TEXT NOT NULL,
  comment TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('receipt', 'demo-card')),
  subtotal INTEGER NOT NULL CHECK(subtotal >= 0),
  discount INTEGER NOT NULL CHECK(discount >= 0 AND discount <= subtotal),
  delivery_cost INTEGER NOT NULL CHECK(delivery_cost >= 0),
  total INTEGER NOT NULL CHECK(total = subtotal - discount + delivery_cost),
  consent_at TEXT NOT NULL,
  UNIQUE(owner_hash, idempotency_key)
) STRICT;
CREATE INDEX orders_owner_date ON orders(owner_hash, created_at DESC);
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  image_url TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_price INTEGER NOT NULL CHECK(unit_price >= 0),
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  product_snapshot TEXT NOT NULL CHECK(json_valid(product_snapshot)),
  UNIQUE(order_id, product_id)
) STRICT;
CREATE INDEX order_items_order ON order_items(order_id);
