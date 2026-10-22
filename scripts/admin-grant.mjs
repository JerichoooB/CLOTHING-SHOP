import { pool } from "../server/db.js";
const email = process.argv[2]?.trim().toLowerCase();
try {
  if (!email)
    throw Error(
      "Usage: npm run admin:grant -- your-registered-email@example.com",
    );
  const result = await pool.query(
    "UPDATE users SET role='admin' WHERE email=$1 RETURNING id",
    [email],
  );
  if (!result.rowCount)
    throw Error("Account not found. Register on the website first.");
  console.log(
    "Admin role granted. Refresh the website to see Inventory & Orders.",
  );
} finally {
  await pool.end();
}
