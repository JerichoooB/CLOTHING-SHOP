import { app } from "./app.js";
import { pool } from "./db.js";
const port = Number(process.env.PORT || 3001);
try {
  const migration = await pool.query(
    "SELECT 1 FROM schema_migrations WHERE version=1",
  );
  if (!migration.rowCount) throw Error("Database migration is missing.");
  const server = app.listen(port, "0.0.0.0", (error) => {
    if (error) {
      console.error(`Unable to start Clover on port ${port}: ${error.message}`);
      process.exitCode = 1;
      pool.end();
      return;
    }
    console.log(
      `Clover server listening on port ${port}; PostgreSQL connected.`,
    );
  });
  const stop = () => server.close(() => pool.end());
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
} catch {
  console.error(
    "PostgreSQL is not ready. Run npm run db:up (Docker), or configure .env and run npm run db:setup.",
  );
  await pool.end();
  process.exitCode = 1;
}
