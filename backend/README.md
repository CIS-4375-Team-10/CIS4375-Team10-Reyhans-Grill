# Reyhan's Grill Inventory Backend

Node 18+ + Express service that keeps MySQL inventory for Reyhan's Grill in sync with Square payments and refunds. It exposes simple admin APIs for managing items and bills-of-materials, validates Square webhook signatures (HMAC-SHA256), and runs a nightly reconciliation to fill gaps when webhooks are missed.

## Prerequisites
- Node.js 18 or newer
- MySQL 8 (or compatible with InnoDB + utf8mb4)
- Square Sandbox account with a test location, access token, and webhook signature key
- Optional: tunnelling tool (ngrok, Cloudflare Tunnel, etc.) for webhook testing

## Getting Started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env vars and fill them in:
   ```bash
   cp .env.example .env
   ```
   - `SQUARE_ACCESS_TOKEN` / `SQUARE_WEBHOOK_SIGNATURE_KEY` come from the Square dashboard
   - `SQUARE_LOCATION_ID` is the sandbox location that represents the truck
   - Leave `ALLOW_UNVERIFIED_WEBHOOKS=false` in production; set to `true` locally when you want to bypass signature checks.
3. Create the database schema and seed sample data (adjust credentials as needed):
   ```bash
   mysql -u <user> -p -e "CREATE DATABASE IF NOT EXISTS reyhans_grill CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u <user> -p reyhans_grill < src/db/migrate.sql
   mysql -u <user> -p reyhans_grill < src/db/seed.sql
   ```
4. Run the API:
   ```bash
   npm run dev   # nodemon
   # or
   npm start
   ```
5. Subscribe to Square webhooks in the Sandbox Dashboard: `payment.updated`, `refund.updated`. Point the URL to `http://localhost:8080/webhooks/square` (use a tunnel if the service is not publicly reachable).
6. Set the same signature key in the Square dashboard and `.env` file. Signature verification can be toggled with `ALLOW_UNVERIFIED_WEBHOOKS=true` for local testing.
7. Bootstrap catalog + recipes:
   - `POST /admin/catalog/sync` to mirror Square variations into `catalog_variation`
   - `POST /admin/items` to define inventory items (include `initialOnHand` when appropriate)
   - `POST /admin/recipes` to link catalog variations to inventory consumption
8. Operational workflow:
   - Square completes a payment → webhook decrements inventory via `/webhooks/square`
   - Square completes a refund → webhook increments inventory to restock
   - Admins can perform manual adjustments via `/admin/items/:id/adjust`
9. Idempotency:
   - `webhook_event` stores every webhook `event_id`
   - `stock_ledger` enforces uniqueness on `(square_event_id, item_id)` so duplicate deliveries cannot alter inventory.
10. Nightly reconciliation (`node-cron` at 03:30 UTC by default) replays yesterday’s orders with the recipe map. If SALE ledger entries are missing, `RECON` entries true-up balances. Modify the schedule with `CRON_RECONCILE_SCHEDULE` if needed.

## Project Structure
```
src/
  config/           # env loader, MySQL pool, pino logger
  controllers/      # admin + webhook request handlers
  db/               # SQL migrations and seed data
  jobs/             # node-cron reconciliation bootstrap
  routes/           # Express routers
  services/         # Square clients, inventory math, reconciliation
  square/           # Square SDK and webhook helpers
  server.js         # Express bootstrap + cron wiring
test/
  curl-examples.http
```

## Key Endpoints
- `GET /healthz` – readiness check (`db` ping + Square config flag)
- `POST /webhooks/square` – receives Square `payment.updated` and `refund.updated`
  - Verifies HMAC signature unless `ALLOW_UNVERIFIED_WEBHOOKS=true`
  - Logs status in `webhook_event`, updates ledger & balance tables
- `GET /admin/items` – list items with current on-hand counts and low-stock flag
- `POST /admin/items` – create an item (optional `initialOnHand`)
- `PATCH /admin/items/:id` – update name/uom/threshold/active/etc.
- `POST /admin/items/:id/adjust` – manual or physical count adjustments
- `GET /admin/items/:id/ledger` – last 50 ledger entries for the item
- `GET /admin/low-stock` – items at/below threshold
- `GET /admin/ledger` – paginated ledger with filters (`itemId`, `reason`, `start`, `end`)
- `GET /admin/recipes/:variation` & `POST /admin/recipes` – manage recipe components
- `POST /admin/catalog/sync` – one-click Square catalog variation import
- `GET /admin/catalog` – inspect stored variations

Use the sample `test/curl-examples.http` file with VS Code’s REST client or `curl` to exercise the API locally. Supply the `X-Square-Hmacsha256-Signature` header when posting real webhooks; when `ALLOW_UNVERIFIED_WEBHOOKS=true`, any value is accepted for development convenience.

## Data Model Highlights
- `inventory_item` holds shared metadata and low-stock thresholds
- `inventory_balance` tracks current on-hand counts (one row per item)
- `recipe_component` maps Square catalog variations to inventory usage (supports modifier-specific overrides)
- `stock_ledger` is append-only and audited (`SALE`, `REFUND`, `MANUAL`, `RECON`, `PHYSICAL_COUNT`)
- `webhook_event` captures processing status and errors for each Square webhook
- `catalog_variation` caches Square catalog variation metadata for easier joins

## Reconciliation Job
The cron job (defaults to `30 3 * * *` in UTC) loads yesterday’s completed orders with the Square Orders API and recomputes expected inventory usage from the recipe map. It compares expected usage to the sum of recorded `SALE` and `RECON` ledger entries. When gaps exist, it writes compensating `RECON` entries so balances stay accurate even when webhooks were delayed or dropped. Run it manually via:
```bash
npm run reconcile
```

## Additional Notes
- All numeric quantities use MySQL `DECIMAL`; round/scale is controlled by the `decimals` column on inventory items.
- Authentication for admin routes is intentionally deferred – add your preferred middleware (header token, OAuth, etc.) before deploying to production.
- `ALLOW_UNVERIFIED_WEBHOOKS` should only be used locally. Production deployments must rely on HMAC validation to avoid spoofed inventory changes.
- Extend `recipe_component` with modifier entries (e.g., “extra cheese”) by supplying `modifierCatalogObjectId` from the Square order line modifiers.
