# Neon setup verification

## Completed locally

- Fetched the requested skill from the official `neondatabase/agent-skills` GitHub repository after the requested `neon.com/.well-known/...` URL returned HTTP 403.
- Used `npx neon@latest` because the global install could not write its default installation directory.
- Installed the Neon and neon-postgres agent skills in `.agents/skills`.
- Configured project-scoped OAuth MCP at `.codex/config.toml` for project `soft-resonance-37838225`. No API key is stored there. The current running agent session does not automatically load newly written MCP configurations.
- Backed up local settings privately before initialization. Private settings/backups are not in the download.
- Created offline `.neon` context for org `org-patient-haze-82231060`, project `soft-resonance-37838225`, branch `production`, and created `neon.ts` for PostgreSQL only.
- Preserved the app's existing account/session implementation and `pg` driver.
- Added dotenv support for `.env.local` and `.env`; deployment environment variables have priority.
- Added Vercel's `attachDatabasePool` integration. Schema setup uses `DATABASE_URL_UNPOOLED` when available. Local-to-Neon transfer also uses the direct URL, preserving the original local credentials when Neon replaces `.env`.

## Evidence from commands in this cloud workspace

`npm run build` exited 0:

```text
vite v6.4.5 building for production...
✓ 1665 modules transformed.
✓ built in 1.95s
```

`npm test` exited 0:

```text
ℹ tests 10
ℹ pass 10
ℹ fail 0
```

The app was started with `PORT=3035 node server/index.js`:

```text
Clover server listening on port 3035; PostgreSQL connected.
GET /api/health: 200 {"status":"ok","database":"postgresql"}
```

Additional smoke checks:

```text
neon.ts: loads successfully
Vercel-managed pg pool: query passed
PASS: PostgreSQL registration, checkout, simulated approval, stock deduction, cleared bag, persistent order history, admin inventory adjustment, status updates visible to customer, mobile layout.
```

These checks used local PostgreSQL and isolated test schemas. They do NOT prove a connection to Neon.

## Failures and remaining verification

- Requested skill URL: HTTP 403. Official GitHub source worked.
- `npm i -g neon@latest`: ENOENT creating `/home/agent/.local/lib`. The requested npx fallback worked.
- Default Neon credentials directory: not writable in this cloud environment; a private temporary config directory was used. No credentials were available there or in environment variables.
- Requested `neon init -y ...`: global Codex plugin install failed creating `/home/agent/.cache/plugins`. Installed project skills and OAuth MCP separately, then retried init with `--no-agent-setup`.
- Initialization explicitly reported `Written offline (--no-checks): nothing was verified` and `Project linked, not verified`.
- `neon deploy`: exited 1 with `Could not reach the Neon API`. Direct API/MCP requests confirmed proxy `CONNECT tunnel failed, response 403`.
- Cloud Node is 24 while the Vercel app pins Node 22; npm printed an engine warning. Installation, build and local tests still passed. Use Node 22 in Vercel as configured.

No remote Neon services, connection strings, data transfer, account access, or production branch were verified or modified. No Vercel frontend was published. Follow the authenticated local workflow in DEPLOYMENT.md, then repeat checkout/login/order checks against Neon. Keep original local data and settings until that succeeds.
