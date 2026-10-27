import pg from "pg";
import { readFile } from "node:fs/promises";

const tables = [
  "schema_migrations",
  "users",
  "sessions",
  "categories",
  "products",
  "product_collections",
  "product_variants",
  "orders",
  "order_items",
  "payments",
  "order_status_history",
  "inventory_movements",
];
const optionalTables = [
  "password_reset_tokens",
  "password_reset_limits",
  "receipt_email_deliveries",
];
const quote = pg.escapeIdentifier;

export async function snapshotDatabase(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const snapshot = {
      format: "clover-postgresql-v1",
      createdAt: new Date().toISOString(),
      tables: {},
    };
    for (const name of [...tables, ...optionalTables]) {
      const metadata = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1 AND is_generated='NEVER' ORDER BY ordinal_position",
        [name],
      );
      const columns = metadata.rows.map((row) => row.column_name);
      if (!columns.length && optionalTables.includes(name)) continue;
      if (!columns.length)
        throw new Error(`Missing local table: ${name}. Run db:setup first.`);
      const result = await client.query(
        `SELECT ${columns.map(quote).join(",")} FROM ${quote(name)}`,
        [],
      );
      snapshot.tables[name] = {
        columns,
        rows: result.rows.map((row) => columns.map((column) => row[column])),
      };
    }
    await client.query("COMMIT");
    return snapshot;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function restoreDatabase(pool, snapshot) {
  if (
    snapshot.format !== "clover-postgresql-v1" ||
    tables.some((name) => !snapshot.tables?.[name])
  )
    throw new Error("This is not a complete CLOVER database backup.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(704195)");
    const existing = await client.query(
      "SELECT 1 FROM pg_class WHERE relnamespace=current_schema()::regnamespace AND relkind IN ('r','p','S','v','m','f') LIMIT 1",
    );
    if (existing.rowCount)
      throw new Error(
        "The destination is not empty. Use a new empty Neon database; existing data will not be overwritten.",
      );
    await client.query(
      "CREATE TABLE schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    await client.query(
      await readFile(
        new URL("../../database/migrations/001_store.sql", import.meta.url),
        "utf8",
      ),
    );
    await client.query(
      await readFile(
        new URL(
          "../../database/migrations/003_password_reset.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await client.query(
      await readFile(
        new URL(
          "../../database/migrations/004_receipt_email.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    for (const name of [
      ...tables,
      ...optionalTables.filter((name) => snapshot.tables[name]),
    ]) {
      const { columns, rows } = snapshot.tables[name];
      const metadata = await client.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=$1 AND is_generated='NEVER' ORDER BY ordinal_position",
        [name],
      );
      if (
        JSON.stringify(columns) !==
        JSON.stringify(metadata.rows.map((row) => row.column_name))
      )
        throw new Error(
          `Backup columns do not match the supported schema: ${name}.`,
        );
      for (let offset = 0; offset < rows.length; offset += 100) {
        const batch = rows.slice(offset, offset + 100),
          values = [];
        const placeholders = batch.map((row) => {
          if (!Array.isArray(row) || row.length !== columns.length)
            throw new Error(`Invalid backup row in ${name}.`);
          return `(${row
            .map((value) => {
              values.push(value);
              return "$" + values.length;
            })
            .join(",")})`;
        });
        await client.query(
          `INSERT INTO ${quote(name)} (${columns.map(quote).join(",")}) VALUES ${placeholders.join(",")}`,
          values,
        );
      }
      for (const column of columns) {
        const sequence = (
          await client.query("SELECT pg_get_serial_sequence($1,$2) AS name", [
            quote(name),
            column,
          ])
        ).rows[0].name;
        if (sequence) {
          const { max } = (
            await client.query(
              `SELECT max(${quote(column)})::text AS max FROM ${quote(name)}`,
            )
          ).rows[0];
          await client.query("SELECT setval($1::regclass,$2,$3)", [
            sequence,
            max || "1",
            max !== null,
          ]);
        }
      }
      const count = (
        await client.query(`SELECT count(*)::int AS n FROM ${quote(name)}`)
      ).rows[0].n;
      if (count !== rows.length)
        throw new Error(`Row count verification failed for ${name}.`);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
