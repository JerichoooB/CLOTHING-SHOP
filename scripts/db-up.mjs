import { access, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import dotenv from "dotenv";
try {
  await access(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  const password = randomBytes(24).toString("hex");
  await writeFile(
    ".env",
    `POSTGRES_PASSWORD=${password}\nPOSTGRES_PORT=5432\nDATABASE_URL=postgresql://clover:${password}@127.0.0.1:5432/clover\n`,
    { mode: 0o600, flag: "wx" },
  );
  console.log("Created private local database settings in .env.");
}
dotenv.config({ quiet: true });
await new Promise((resolve, reject) => {
  const child = spawn("docker", ["compose", "up", "-d", "--wait", "postgres"], {
    stdio: "inherit",
  });
  child.on("error", () =>
    reject(
      Error(
        "Docker is unavailable. Install/start Docker Desktop, or configure an existing PostgreSQL server and run npm run db:setup.",
      ),
    ),
  );
  child.on("exit", (code) =>
    code === 0
      ? resolve()
      : reject(
          Error(
            "PostgreSQL did not start. Check Docker Desktop and whether the configured database port is available.",
          ),
        ),
  );
});
const { pool, initializeDatabase, importLegacyAccounts } =
  await import("../server/db.js");
try {
  await initializeDatabase();
  const imported = await importLegacyAccounts();
  console.log(
    `PostgreSQL is ready. Catalog and stock initialized; ${imported} legacy accounts imported.`,
  );
} finally {
  await pool.end();
}
