CREATE TABLE IF NOT EXISTS receipt_email_deliveries (
 order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
 recipient varchar(254) NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 last_attempt_at timestamptz,
 sent_at timestamptz,
 failure_code text,
 created_at timestamptz NOT NULL DEFAULT now()
);
