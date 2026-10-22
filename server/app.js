import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool as defaultPool } from "./db.js";
import { createAuthRouter, sessionMiddleware } from "./auth.js";
import { sameOrigin } from "./security.js";
import { listProducts } from "./products.js";
import { commerceRouter, adminRouter } from "./orders.js";
export function createApp({ pool = defaultPool } = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use("/api", sameOrigin, sessionMiddleware(pool));
  app.get("/api/health", async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "postgresql" });
  });
  app.use("/api/auth", createAuthRouter(pool));
  app.use("/api/admin", adminRouter(pool));
  app.get("/api/products", async (_req, res) =>
    res.json(await listProducts(pool)),
  );
  app.get("/api/products/:id", async (req, res) => {
    if (!/^\d+$/.test(req.params.id))
      return res.status(404).json({ error: "Product not found" });
    const products = await listProducts(pool, Number(req.params.id));
    return products.length
      ? res.json(products[0])
      : res.status(404).json({ error: "Product not found" });
  });
  app.use("/api", commerceRouter(pool));
  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
  const dist = fileURLToPath(new URL("../dist", import.meta.url));
  app.use(express.static(dist));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(dist, "index.html")),
  );
  app.use((error, _req, res, _next) => {
    const status = error.expose
      ? error.status
      : error.status === 400
        ? 400
        : error.status === 413
          ? 413
          : ["ECONNREFUSED", "57P01", "42P01"].includes(error.code)
            ? 503
            : 500;
    return res.status(status).json({
      error: error.expose
        ? error.message
        : status === 400
          ? "Invalid request."
          : status === 413
            ? "Request is too large."
            : status === 503
              ? "The store is temporarily unavailable. Please try again shortly."
              : "Unable to complete the request. Please try again.",
    });
  });
  return app;
}
export const app = createApp();
