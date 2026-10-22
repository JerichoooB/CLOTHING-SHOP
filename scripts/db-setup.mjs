import {
  pool,
  createPool,
  initializeDatabase,
  importLegacyAccounts,
} from "../server/db.js";
// Application requests use the pooler; schema operations use Neon's direct URL.
const database = process.env.DATABASE_URL_UNPOOLED
  ? createPool({ connectionString: process.env.DATABASE_URL_UNPOOLED })
  : pool;
try {
  await initializeDatabase(database);
  const count = await importLegacyAccounts(database);
  console.log(
    `Database migrations and seed complete; ${count} legacy accounts imported. Existing stock and accounts were preserved.`,
  );
} finally {
  await Promise.all([...new Set([database, pool])].map((item) => item.end()));
}
