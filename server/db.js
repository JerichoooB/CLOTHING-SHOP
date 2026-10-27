import "./env.js";
import pg from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { products } from "./catalog.js";
export function createPool(options = {}) {
  if (!options.connectionString && !process.env.DATABASE_URL)
    throw new Error(
      "DATABASE_URL is missing. Run npm run db:up, or configure .env and run npm run db:setup.",
    );
  const database = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: process.env.VERCEL ? 3 : 10,
    connectionTimeoutMillis: process.env.VERCEL ? 15000 : 5000,
    idleTimeoutMillis: 10000,
    allowExitOnIdle: true,
    ...options,
  });
  if (process.env.VERCEL) attachDatabasePool(database);
  return database;
}
export const pool = createPool();
export async function transaction(database, task) {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    const result = await task(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function initializeDatabase(database = pool) {
  await transaction(database, async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(704195)");
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    const applied = await client.query(
      "SELECT version FROM schema_migrations WHERE version=1",
    );
    if (!applied.rowCount) {
      await client.query(
        await readFile(
          new URL("../database/migrations/001_store.sql", import.meta.url),
          "utf8",
        ),
      );
      await client.query("INSERT INTO schema_migrations(version) VALUES(1)");
    }
    for (const category of [
      "Men",
      "Women",
      "Unisex",
      "Accessories",
      "Featured",
    ])
      await client.query(
        "INSERT INTO categories(name) VALUES($1) ON CONFLICT DO NOTHING",
        [category],
      );
    for (const product of products) {
      const sku = `CLV-${String(product.id + 1).padStart(4, "0")}`;
      await client.query(
        `INSERT INTO products(id,sku,name,price_cents,category,product_type,image,image_cell,colors,sort_order,accessory_order,badge) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT DO NOTHING`,
        [
          product.id,
          sku,
          product.name,
          product.price * 100,
          product.category,
          product.type,
          product.image,
          product.cell,
          product.colors,
          product.order,
          product.accessoryOrder ?? null,
          product.badge ?? null,
        ],
      );
      for (const category of product.collections)
        await client.query(
          "INSERT INTO product_collections(product_id,category) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [product.id, category],
        );
      for (const size of product.sizes) {
        const variant = await client.query(
          "INSERT INTO product_variants(product_id,sku,size,stock) VALUES($1,$2,$3,20) ON CONFLICT DO NOTHING RETURNING id",
          [
            product.id,
            `${sku}-${size.replaceAll(" ", "-").toUpperCase()}`,
            size,
          ],
        );
        if (variant.rowCount)
          await client.query(
            "INSERT INTO inventory_movements(variant_id,quantity_change,stock_after,reason) VALUES($1,20,20,'Initial demo stock')",
            [variant.rows[0].id],
          );
      }
    }
    const repriced = await client.query(
      "SELECT 1 FROM schema_migrations WHERE version=2",
    );
    if (!repriced.rowCount) {
      await client.query(
        await readFile(
          new URL(
            "../database/migrations/002_catalog_prices.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      await client.query("INSERT INTO schema_migrations(version) VALUES(2)");
    }
    const recovery = await client.query(
      "SELECT 1 FROM schema_migrations WHERE version=3",
    );
    if (!recovery.rowCount) {
      await client.query(
        await readFile(
          new URL(
            "../database/migrations/003_password_reset.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      await client.query("INSERT INTO schema_migrations(version) VALUES(3)");
    }
    const receiptEmail = await client.query(
      "SELECT 1 FROM schema_migrations WHERE version=4",
    );
    if (!receiptEmail.rowCount) {
      await client.query(
        await readFile(
          new URL(
            "../database/migrations/004_receipt_email.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      await client.query("INSERT INTO schema_migrations(version) VALUES(4)");
    }
  });
}
export async function importLegacyAccounts(
  database = pool,
  source = new URL("../.local/users.json", import.meta.url),
) {
  let users;
  try {
    users = JSON.parse(await readFile(source, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return 0;
    throw error;
  }
  if (!Array.isArray(users))
    throw Error("Legacy account file is invalid. It was not modified.");
  return transaction(database, async (client) => {
    let imported = 0;
    for (const user of users) {
      if (
        !/^[a-f0-9]{32}$/i.test(user.id) ||
        !/^[a-f0-9]{128}$/i.test(user.passwordHash) ||
        !/^[a-f0-9]{32}$/i.test(user.salt)
      )
        throw Error(
          "Legacy account format is invalid. Import stopped without changes.",
        );
      const result = await client.query(
        "INSERT INTO users(id,name,email,password_salt,password_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO NOTHING",
        [
          user.id,
          user.name,
          user.email.toLowerCase(),
          user.salt,
          user.passwordHash,
        ],
      );
      imported += result.rowCount;
    }
    return imported;
  });
}
