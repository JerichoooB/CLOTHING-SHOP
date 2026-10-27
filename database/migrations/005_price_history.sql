CREATE TABLE IF NOT EXISTS product_price_history (
 id bigserial PRIMARY KEY,
 product_id integer NOT NULL REFERENCES products(id),
 previous_price_cents integer NOT NULL,
 new_price_cents integer NOT NULL,
 actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS price_history_product_idx ON product_price_history(product_id,created_at DESC);
