import { config } from "dotenv";

// Neon creates .env.local when .env is absent. Deployment-injected variables
// retain priority; an explicit dotenv path still supports maintenance scripts.
config({
  path: process.env.DOTENV_CONFIG_PATH || [".env.local", ".env"],
  quiet: true,
});
