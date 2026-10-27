import { randomUUID } from "node:crypto";
import { createPool, initializeDatabase } from "./db.js";
import { createApp } from "./app.js";
export async function fixture(options = {}) {
  const root = createPool(),
    schema = "clover_test_" + randomUUID().replaceAll("-", "");
  await root.query(`CREATE SCHEMA "${schema}"`);
  const database = createPool({ options: `-c search_path=${schema}` });
  await initializeDatabase(database);
  let server, base;
  async function start() {
    server = createApp({ ...options, pool: database }).listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  }
  await start();
  const api = async (
    route,
    { method = "GET", body, cookie, headers = {} } = {},
  ) => {
    const response = await fetch(base + route, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    return {
      status: response.status,
      data,
      cookie: response.headers.get("set-cookie")?.split(";")[0],
      headers: response.headers,
    };
  };
  return {
    get base() {
      return base;
    },
    schema,
    database,
    api,
    async register(name = "Test Shopper", email = "shopper@example.test") {
      const result = await api("/api/auth/register", {
        method: "POST",
        body: { name, email, password: "test-password-123", role: "admin" },
      });
      if (result.status !== 201) throw Error("Test registration failed");
      return { user: result.data.user, cookie: result.cookie };
    },
    async restart() {
      await new Promise((resolve) => server.close(resolve));
      await start();
    },
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await database.end();
      await root.query(`DROP SCHEMA "${schema}" CASCADE`);
      await root.end();
    },
  };
}
export const shipping = {
  name: "Test Shopper",
  phone: "09123456789",
  address: "123 Test Street",
  city: "Quezon City",
  region: "Metro Manila",
  postalCode: "1100",
  country: "PH",
};
export const checkout = (items, key = randomUUID()) => ({
  items,
  shipping,
  paymentMethod: "demo",
  idempotencyKey: key,
});
