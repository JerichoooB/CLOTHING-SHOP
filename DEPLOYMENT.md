# Vercel + Neon deployment

Use Vercel Hobby only for an eligible personal, non-commercial demo. Keep Neon on its Free plan. Neither paid upgrades nor a purchased domain is required for the `*.vercel.app` URL. Provider limits and terms still apply.

## 1. Choose what data to deploy

You chose to preserve local accounts, orders, admin roles and stock. Transfer them into an EMPTY Neon database BEFORE the first Vercel build. Keep the local `.env` and Docker volume unchanged.

1. Stop `npm run dev` (Ctrl+C) so you do not place new local orders while copying. Leave Docker and PostgreSQL running.
2. Create a file called `.env.neon` next to `package.json`, containing only your new Neon connection string:
   ```env
   DATABASE_URL=PASTE_YOUR_NEON_CONNECTION_STRING_HERE
   ```
   For this transfer, use the DIRECT connection string from Neon (disable Connection pooling), with `sslmode=require`. You can supply it as `DATABASE_URL_UNPOOLED` instead of `DATABASE_URL`. Application traffic will still use the pooled URL in Vercel. Do not send this value in chat. `.env.neon` is excluded from Git and the downloadable archive.
3. Run:
   ```powershell
   npm install
   npm run db:migrate:neon
   ```
4. The tool creates a private timestamped JSON backup in `.local/backups`, reads a consistent snapshot, transfers all store tables inside one transaction, verifies row counts, and preserves IDs, passwords, admin roles, stock, orders, payment records and status history. It refuses to overwrite any destination that already contains tables. On failure, the destination transaction rolls back; the local data and backup remain intact.
5. Wait for **Transfer committed and row counts verified** before deploying. If you already seeded Neon, create a new empty Neon database and use its URL rather than clearing a database.

You can also run `npm run db:backup` to create only the private local backup. These JSON backups contain sensitive account/address/order data: keep them private and never upload them to GitHub. After transfer, use the online store as the source of truth; changes made later in local Docker will not sync automatically.

## 2. Prepare Neon

Create a project on the Free plan. From **Connect**, copy the PostgreSQL connection string with **Connection pooling** enabled. Keep its TLS parameters, including `sslmode=require`. This is a server-only secret: put it in Vercel environment variables, never a `VITE_` variable or a public repository. No Docker is needed on Vercel.

## 3. Import the project in Vercel

Upload this project source to your GitHub repository (exclude `.env`, `.local`, `node_modules`, `.vercel`, and database backups). Import that repository in Vercel and choose the Hobby plan. If `package.json` is inside `CLOTHING-SHOP`, set **Root Directory** to `CLOTHING-SHOP`; if it is at the repository root, leave Root Directory at the root.

Use Node.js **22.x**. The included `vercel.json` selects Vite, builds into `dist`, and routes `/api/*` to Express. Do not deploy only `dist`: the API source is required for login, stock, checkout, and order status.

Before deploying, set these **Production** environment variables:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Your pooled Neon PostgreSQL URL |
| `DATABASE_URL_UNPOOLED` | Your direct Neon URL for schema setup |
| `AUTH_COOKIE_SECURE` | `true` |

The build runs `npm run db:setup && npm run build`. Database setup creates the schema and seeds missing catalog entries without resetting existing accounts, orders or stock. A database connection failure stops the build. Do not override that build command with plain `vite build` for the initial deployment.

For Preview deployments, create a separate Neon database/branch and set a separate Preview `DATABASE_URL` plus `AUTH_COOKIE_SECURE=true`. Do not point experimental previews at the live database. If no Preview database is configured, a Preview build will fail intentionally.

## 4. Check the deployed website

Open `https://YOUR-PROJECT.vercel.app/api/health`. It should return `{"status":"ok","database":"postgresql"}`. Then check:

1. Browse all collections and open a product.
2. Register, log out, and log back in.
3. Add a size to your bag and submit demo checkout.
4. Check My Orders, reload, and confirm the order persists. No money is charged.
5. Submit one contact message and confirm delivery in Formspree/Gmail. Verify `jerichobalayog2@gmail.com` as the Formspree recipient. If Formspree restricts domains, allow your Vercel hostname.
6. On mobile, check the bag, checkout and contact form.

## 5. Grant your online account admin access

Your local admin account does not automatically exist in a fresh Neon database. Register on the deployed site first. In Neon's SQL Editor, select the production database and run the following, replacing the example with your registered email:

```sql
UPDATE users
SET role = 'admin'
WHERE email = lower('YOUR_REGISTERED_EMAIL@example.com')
RETURNING id, name, email, role;
```

Confirm one row was updated, then refresh the site. **Manage Store** will appear. Check inventory and order status updates there.

## Domain

The free Vercel URL is sufficient. Your Cloudflare portfolio can remain unchanged. If you already own a domain, you can later connect a separate subdomain through Vercel's Domains settings and add only the DNS record Vercel requests in Cloudflare.

## Operational limits

Payments remain simulated. Formspree delivery depends on the form's recipient verification, spam settings and plan limits. Free database/compute plans can have cold starts and resource limits. Authentication throttling currently lives in each Node process, so it is not a distributed rate limiter across Vercel instances.

## Neon CLI and MCP setup for this project

The workspace is linked offline to org `org-patient-haze-82231060`, project `soft-resonance-37838225`, branch `production`. `neon.ts` requests only the existing PostgreSQL service. The project-scoped `.codex/config.toml` uses OAuth for the Neon MCP URL and contains no API key. Restart/reconnect your coding client and authenticate the MCP server when prompted. The Neon and neon-postgres skills are installed in `.agents/skills`.

Remote provisioning was NOT verified from the cloud workspace: its network proxy returned HTTP 403 for Neon API/MCP hosts, and no Neon credentials were available. Run the following in your own project's PowerShell terminal with network access:

```powershell
# Preserve local Docker credentials before Neon pulls hosted settings into .env.
New-Item -ItemType Directory -Force .local/local-settings | Out-Null
if (!(Test-Path .local/local-settings/pre-neon.env)) { Copy-Item .env .local/local-settings/pre-neon.env }
npx neon@latest login
npx neon@latest init -y --org-id org-patient-haze-82231060 --project-id soft-resonance-37838225 --branch production --services postgres
npx neon@latest deploy
```

Complete the browser sign-in when requested. If the global agent plugin cannot be installed, the downloaded project already includes its skills and OAuth MCP config: retry `init` with `--no-agent-setup` to link/configure the project only.

After deploy succeeds, Neon places `DATABASE_URL` and `DATABASE_URL_UNPOOLED` in `.env` (or `.env.local` when `.env` does not exist). The app supports both files and gives deployment-injected variables priority. Keep all of these files private. Neon's deploy provisions database services; it does not publish the frontend to Vercel.

To transfer the original local data, leave Docker PostgreSQL running and copy the Neon env file to `.env.neon` (use `.env.local` as the source if that is where Neon wrote its variables):

```powershell
Copy-Item .env .env.neon
npm run db:migrate:neon
npm run db:setup
npm run build
npm run dev
```

The transfer reads the preserved Docker credentials from `.local/local-settings/pre-neon.env`, backs up that local database, and copies it to the empty Neon destination using the direct URL. Do not run `db:setup` or deploy to Vercel before transferring into Neon: schema setup would make the destination nonempty. Once transfer succeeds, the app can use Neon's pooled URL for runtime queries. Verify registration/login, checkout, stock, orders and admin status updates against the hosted database. Your original Docker database remains intact, but later changes in it do not sync to Neon automatically.

## Password recovery with Gmail

Add these server-only variables to Vercel **Production**, then deploy/redeploy:

| Variable | Value |
| --- | --- |
| `GMAIL_USER` | `jerichobalayog2@gmail.com` (the Gmail account sending reset mail) |
| `GMAIL_APP_PASSWORD` | A Google App Password for that Gmail account, not the normal account password |
| `PUBLIC_APP_URL` | `https://clovercloth.vercel.app` |

Enable Google 2-Step Verification, then create an App Password at `https://myaccount.google.com/apppasswords`. Some managed accounts do not offer App Passwords; in that case use an SMTP provider with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optionally `SMTP_FROM`. Gmail defaults are `smtp.gmail.com`, port `465`, TLS. Keep all passwords in private environment settings, never Git or chat. Google App Password grouping spaces are removed automatically. `SMTP_USER`/`SMTP_PASS` remain supported aliases when the Gmail variables are absent.

The Vercel build runs migration 003 automatically. Recovery stores only hashed 256-bit reset tokens, uses 15-minute expiry and one-time consumption, applies PostgreSQL-backed request limits, and revokes all of the user's sessions after a password change. A new request invalidates prior outstanding links; repeated requests within one minute do not send another mail. Public responses do not reveal whether an email exists. If mail delivery fails after a configured request, the response remains generic and a sanitized server log notes the failure. Check Vercel runtime logs and SMTP settings if no email arrives. No raw reset tokens or passwords are logged or returned by the API.

After deployment is Ready, use **Account → Forgot password?** with an existing account. Check Gmail/spam, open the link, choose a new password, and log in. Receiving a real email is the final live verification; automated tests use a captured sender and never send real reset links. The application works without SMTP configuration, but recovery reports unavailable until those variables are set.

## Order receipts

After checkout, use **View receipt** on the confirmation order card. Receipts are also available in **My Orders** and administrator order cards. **Print / Save PDF** opens the browser print dialog; choose Save as PDF to download a copy. Receipts use the order's saved item prices and totals, not today's catalog prices. Customers can access only their own receipts; administrators can access store orders. These are clearly labelled demo order receipts, not tax invoices or proof of a real payment. Receipt emails are not sent automatically.
