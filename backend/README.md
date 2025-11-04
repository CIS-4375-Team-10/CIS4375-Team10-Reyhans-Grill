# Reyhan's Grill Inventory API

Node.js/Express backend that connects the MySQL inventory schema to the Square Sandbox APIs so you can test catalog and inventory flows before going live.

## Prerequisites

- Node.js 18+
- MySQL 8 (or compatible)
- Square Sandbox account with an application, access token, and at least one location

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment template and fill in real values (keep secrets out of source control):

   ```bash
   cp .env.example .env
   ```

   | Variable | Purpose |
   | --- | --- |
   | `PORT` | Port the API listens on (default `4000`) |
   | `MYSQL_*` | Connection info for the schema in `db/schema.sql` |
   | `SQUARE_APPLICATION_ID` | Sandbox app id (informational) |
   | `SQUARE_ACCESS_TOKEN` | Sandbox access token (required for API calls) |
   | `SQUARE_LOCATION_ID` | Sandbox location that mirrors the truck |
   | `SQUARE_ENVIRONMENT` | `sandbox` or `production` |

3. Build the schema described in the ERD:

   ```bash
   mysql -u <user> -p reyhans_grill < db/schema.sql
   ```

4. Start the API:

   ```bash
   npm run dev
   ```

## Key Files

- `src/config/env.js` – loads `.env` before anything else runs
- `src/config/db.js` – MySQL connection pool using `mysql2/promise`
- `src/config/squareClient.js` – Configured Square SDK client
- `src/services/squareInventoryService.js` – Helper methods for Locations, Catalog, and Inventory APIs
- `src/controllers/inventoryController.js` – Implements inventory reads plus a Square sync stub that writes counts into the `Item` table
- `db/schema.sql` – Tables that match the ERD you supplied

## Endpoints

| Method/Path | Description |
| --- | --- |
| `GET /health` | Simple readiness probe |
| `GET /api/inventory` | Lists items with their categories from MySQL |
| `GET /api/inventory/square/locations` | Lists sandbox locations via Square SDK |
| `POST /api/inventory/square-sync` | Pulls Square inventory counts and updates `Item.Quantity_In_Stock` (requires `Item_ID` = `catalog_object_id`) |

`POST /api/inventory/square-sync` expects JSON like:

```json
{
  "locationId": "L8898CH7C7Y4A" // optional, defaults to SQUARE_LOCATION_ID
}
```

For the sync to work you need a deterministic mapping between Square catalog objects and your `Item` rows. The easiest option is to set each Square Catalog Object ID (or SKU) to match `Item.Item_ID`. If you prefer a different mapping, add a new column (e.g., `Square_Object_ID`) and adjust `inventoryController.syncInventoryFromSquare`.

## Next Steps

- Flesh out CRUD routes for the remaining tables (`Purchase`, `Usage`, `Report`, `Users`)
- Store Square catalog IDs explicitly in the schema instead of overloading `Item_ID`
- Add authentication/authorization on the API routes
- Add webhook handling for Square inventory and catalog events to keep MySQL synchronized automatically
