CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY, name varchar(80) NOT NULL, email varchar(254) UNIQUE NOT NULL CHECK(email=lower(email)),
 password_salt text NOT NULL, password_hash text NOT NULL, role text NOT NULL DEFAULT 'customer' CHECK(role IN ('customer','admin')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash char(64) PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS categories (name text PRIMARY KEY);
CREATE TABLE IF NOT EXISTS products (
 id integer PRIMARY KEY CHECK(id>=0), sku text UNIQUE NOT NULL, name text NOT NULL,
 price_cents integer NOT NULL CHECK(price_cents>=0), currency char(3) NOT NULL DEFAULT 'PHP' CHECK(currency='PHP'),
 category text NOT NULL REFERENCES categories(name), product_type text NOT NULL, image text NOT NULL, image_cell integer NOT NULL CHECK(image_cell BETWEEN 0 AND 15),
 colors text[] NOT NULL, sort_order integer NOT NULL DEFAULT 0, accessory_order integer, badge text,
 active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product_collections (
 product_id integer NOT NULL REFERENCES products(id), category text NOT NULL REFERENCES categories(name), PRIMARY KEY(product_id,category)
);
CREATE TABLE IF NOT EXISTS product_variants (
 id bigserial PRIMARY KEY, product_id integer NOT NULL REFERENCES products(id), sku text UNIQUE NOT NULL,
 size text NOT NULL, stock integer NOT NULL DEFAULT 0 CHECK(stock>=0), low_stock_threshold integer NOT NULL DEFAULT 5 CHECK(low_stock_threshold>=0),
 active boolean NOT NULL DEFAULT true, UNIQUE(product_id,size)
);
CREATE INDEX IF NOT EXISTS variant_product_idx ON product_variants(product_id);
CREATE TABLE IF NOT EXISTS orders (
 id uuid PRIMARY KEY, order_number bigserial UNIQUE NOT NULL, user_id uuid NOT NULL REFERENCES users(id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','shipped','delivered','cancelled')),
 subtotal_cents integer NOT NULL CHECK(subtotal_cents>=0), shipping_cents integer NOT NULL CHECK(shipping_cents>=0),
 total_cents integer NOT NULL CHECK(total_cents=subtotal_cents+shipping_cents), currency char(3) NOT NULL DEFAULT 'PHP' CHECK(currency='PHP'),
 shipping_address jsonb NOT NULL, tracking_number varchar(80), idempotency_key uuid NOT NULL, request_hash char(64) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS orders_user_date_idx ON orders(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_date_idx ON orders(status,created_at DESC);
CREATE TABLE IF NOT EXISTS order_items (
 id bigserial PRIMARY KEY, order_id uuid NOT NULL REFERENCES orders(id), product_id integer NOT NULL REFERENCES products(id),
 variant_id bigint NOT NULL REFERENCES product_variants(id), product_name text NOT NULL, sku text NOT NULL, size text NOT NULL,
 quantity integer NOT NULL CHECK(quantity>0), unit_price_cents integer NOT NULL CHECK(unit_price_cents>=0),
 line_total_cents integer GENERATED ALWAYS AS (quantity*unit_price_cents) STORED, UNIQUE(order_id,variant_id)
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
CREATE TABLE IF NOT EXISTS payments (
 id uuid PRIMARY KEY, order_id uuid NOT NULL UNIQUE REFERENCES orders(id), provider text NOT NULL CHECK(provider='demo'),
 status text NOT NULL CHECK(status IN ('approved','reversed')), amount_cents integer NOT NULL CHECK(amount_cents>=0),
 currency char(3) NOT NULL DEFAULT 'PHP' CHECK(currency='PHP'), is_simulated boolean NOT NULL DEFAULT true CHECK(is_simulated),
 reference text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_status_history (
 id bigserial PRIMARY KEY, order_id uuid NOT NULL REFERENCES orders(id), previous_status text,
 status text NOT NULL CHECK(status IN ('pending','processing','shipped','delivered','cancelled')),
 actor_id uuid REFERENCES users(id) ON DELETE SET NULL, note varchar(300), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_history_order_idx ON order_status_history(order_id);
CREATE TABLE IF NOT EXISTS inventory_movements (
 id bigserial PRIMARY KEY, variant_id bigint NOT NULL REFERENCES product_variants(id), quantity_change integer NOT NULL CHECK(quantity_change<>0),
 stock_after integer NOT NULL CHECK(stock_after>=0), reason varchar(300) NOT NULL, order_id uuid REFERENCES orders(id),
 actor_id uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_variant_date_idx ON inventory_movements(variant_id,created_at DESC);
