# CLOVER

React 19 + Tailwind CSS 4 + Node.js/Express + PostgreSQL 17 storefront. Includes accounts, product/size SKUs, inventory, checkout with simulated payment approval, customer order history, and administrator stock/order monitoring.

## Windows: first setup

Install Node.js 22.12+ and Docker Desktop (Linux containers), and start Docker Desktop. Extract the ZIP and open PowerShell in the nested `CLOTHING-SHOP` directory containing `package.json`. Stop any older Clover server with Ctrl+C.

```powershell
npm install
npm run db:up
npm run dev
```

`db:up` creates a private `.env` with a random local database password, starts PostgreSQL, applies the SQL migration, seeds the product catalog, and imports legacy accounts if available. It does not reset existing stock or accounts. Open the address Vite prints in the terminal (normally port 5173). Node runs on 3001.

For later starts, start Docker Desktop, run `npm run db:up` if PostgreSQL is stopped, then `npm run dev`. Do not open `index.html` directly: the storefront requires the Node API and database.

## Existing PostgreSQL installation

Docker is optional if you already run PostgreSQL. Create a database (for example, `clover`) or choose an existing development database. Copy `.env.example` to `.env`, set `DATABASE_URL` to your own database, then run:

```sh
npm run db:setup
npm run dev
```

The database user must be able to create the schema tables. Tests create and remove isolated schemas, so the test database user also needs CREATE permission. For remote databases, use the provider's supported TLS connection settings; certificate verification is not disabled.

## Create a store administrator

Register your account through the header account icon. New registrations are customers. In a separate terminal in the project directory run:

```powershell
npm run admin:grant -- your-registered-email@example.com
```

Replace the example with your actual registered email. Refresh the website. **Manage Store** now appears in the header and account menu. Customer accounts cannot grant themselves this role through the website/API.

- **Stock monitoring:** product IDs, size SKUs, available quantities, low-stock filter (threshold 5), signed stock adjustments with required reasons, and recent stock movement history.
- **Order status:** search by status, paginated orders, shipping details, tracking reference, status changes, and history.
- **My Orders:** customers see only their own orders, simulated payment result, delivery details, and status timeline.

## Checkout and payment behavior

Add products to your bag and log in. Checkout records shipping details and computes current prices and stock on the server. Shipping is free at ₱1,500; otherwise ₱100. All amounts are PHP.

The only payment method is **Demo payment — automatically approved**. No card information is collected, no gateway is contacted, and no real money is charged. PostgreSQL records an approved simulated payment and a pending order. These are separate payment and fulfillment statuses.

Checkout locks stock rows and saves the order, item snapshots, payment, status event and inventory movements in one transaction. Invalid/out-of-stock checkout writes no partial order. Duplicate submissions with the same request ID return the existing order and do not deduct stock twice.

Allowed status transitions:

```text
Pending → Processing → Shipped → Delivered
Pending or Processing → Cancelled
```

Cancellation restores stock once and changes the demo payment to reversed. Delivered, shipped, and cancelled orders cannot be cancelled through this demo workflow.

## Database and data retention

The full schema is in `database/migrations/001_store.sql`; see `database/README.md` for relationships. Products have stable IDs, unique product and size SKUs, and stock per size. Initial demo stock is **20 units per size**, seeded only when a variant is first created. Edit quantities in Manage Store to reflect your own stock. Color swatches are visual metadata; stock is tracked by size, not by color.

Accounts and sessions are stored in PostgreSQL. Passwords remain salted scrypt hashes. HttpOnly, SameSite cookies identify database-backed sessions lasting up to eight hours, including across Node restarts. For HTTPS hosting behind a TLS proxy set `AUTH_COOKIE_SECURE=true`.

Docker stores data in the named `clover_postgres` volume (prefixed by the Compose project name). Keep both this volume and `.env` when updating the application; they are not included in download ZIPs. `docker compose stop` stops PostgreSQL without deleting data. Do not delete the volume if you want to keep accounts/orders. A Docker volume is local to its Docker host; moving to another host requires a database backup/restore or an external PostgreSQL service.

To migrate accounts from the earlier JSON version, copy its `.local/users.json` into the same path in this project **before** running `db:up` or `db:setup`. The importer preserves password hashes and leaves the source file untouched. It does not overwrite existing database accounts. Do not include that file or `.env` in shared archives.

## Build and validate

With PostgreSQL running and the database initialized:

```sh
npm test
npm run build
npm start
```

`npm test` uses real PostgreSQL with isolated, disposable test schemas. It covers registration, persistent sessions, legacy-account import, product/variant stock, safe reseeding, server-side pricing, order privacy, admin permissions, idempotency, concurrent overselling prevention, rollback, cancellation/restocking, inventory audit logs, and status transitions.

`npm start` serves the built frontend and API together on port 3001. Set `PORT` to change production port. Development Vite proxies `/api` to port 3001 with `changeOrigin:false` for same-origin requests. A database must be configured and migrated before Node starts.

## Source organization

Each visible page and section has co-located JSX/CSS:

- `src/pages/`: Home, Shop, Men, Women, Unisex, Accessories, About, Contact, Checkout, Orders, Admin.
- `src/sections/`: Benefits, Categories, FeaturedProducts, Story, Newsletter.
- `src/components/`: shared layout, catalog, account, bag, order-card and pagination components.
- `src/context/StoreContext.jsx`: catalog, bag, account and notification state.
- `server/`: PostgreSQL connection/migration/seed, authentication, catalog queries, checkout and admin APIs.
- `database/`: SQL migration and schema documentation.
- `scripts/`: local database startup, setup, admin promotion, development process launcher.

All generated photos and the shared compact five-leaf logo live in `public/images`. Fonts are local too. The layouts follow the supplied Clover references, with generated photographic recreations. Contact messages are submitted to Formspree; newsletter signup remains unconnected. Fulfillment status and tracking are managed manually; no carrier service is connected.

## Contact delivery

The contact form sends name, email, and message to `https://formspree.io/f/myeegnrb`. The public contact address is `jerichobalayog2@gmail.com`. Set and verify that recipient in the Formspree dashboard; the recipient cannot be changed by website code. No Gmail password or Formspree API key is needed in the frontend.

The form shows success only after Formspree accepts the submission, keeps entered details on failure, prevents repeat clicks while sending, and includes a spam honeypot. Formspree may require CAPTCHA verification or apply account submission limits. If you restrict allowed domains in Formspree, allow the final deployment domain. Use the published site to send one message yourself and confirm receipt in the Formspree dashboard and Gmail (including spam). Automated checks mock delivery and do not send real email.

## Deploy to Vercel with Neon

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Vercel configuration, required environment variables, and the safe local-to-Neon transfer that preserves accounts, admin roles, stock and orders. Docker remains local; Vercel connects to hosted PostgreSQL.

### Management analytics and stock

Manage Store includes a Sales analytics tab with 7-, 30-, and 90-day reports in Philippine time. Revenue includes shipping on approved, non-cancelled demo orders; reversed payments are excluded and shown separately. Reports include units sold, purchasing customers, average order value, daily figures, top products, current order status, and current inventory health. No real payments or profit tracking are implied.

Stock monitoring displays one row per product. Select a size to see and adjust that size's stock or view its movement history; the selection remains after saving. Search supports product names and product/size SKUs. Low-stock filtering selects products with at least one low-stock size. No database migration is required for these management features.

### Interface refresh

The storefront keeps the ivory CLOVER palette and editorial imagery, with larger text and controls, a sticky header with mobile navigation, collapsible filters on mobile, size buttons in product details, and a free-shipping progress indicator in the bag. Checkout, account dialogs, contact, orders and analytics share updated form and card styling. Stock rows become individual product cards on phones while retaining the size selector and per-size history. The UI changes require no new environment variables or database migration.

The signed-in account panel includes order/store shortcuts, contact support, and a sign-out confirmation. Sign-out failures preserve the active account for retry; successful sign-out revokes the session and retains the local shopping bag. The bag uses a scrolling item list with a persistent checkout summary, estimated shipping/total, stock-aware quantity limits, and an empty state. Missing or unavailable sizes must be removed or adjusted before checkout.

Catalog prices now range from PHP150 to PHP700. Migration `002_catalog_prices.sql` updates existing catalog product prices once during `db:setup` (including the Vercel build), without changing stock, users, historical order item prices or payment totals. New checkouts use the updated product prices; price filters use the new range.
