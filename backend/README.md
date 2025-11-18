## Reyhan's Grill API

Node.js + Express service that exposes inventory data for the Vue frontend.

### Prerequisites

- Node 18+
- MySQL 8 (or compatible such as MariaDB). The connection is managed with `mysql2`.

### Setup

1. Install dependencies

   ```sh
   npm install
   ```

2. Copy the environment file and fill in your values

   ```sh
   cp .env.example .env
   ```

   Required variables:

   | Name | Description |
   |------|-------------|
   | `PORT` | Port for the API (default `4000`) |
   | `FRONTEND_ORIGIN` | Comma separated list of allowed CORS origins (e.g. `http://localhost:5173`) |
   | `DATABASE_URL` | Optional single MySQL connection string |
   | `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` | Individual database credentials if not using `DATABASE_URL` |

3. Create the schema in your database

   ```sh
   mysql -u <user> -p <db_name> < sql/schema.sql
   ```

4. Start the API

   ```sh
   npm run dev
   ```

   The service will verify the DB connection before listening.

### API Overview

All routes are prefixed with `/api`.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Simple health check |
| GET/POST/DELETE | `/categories` | Manage lookup categories defined in the ERD |
| GET/POST/PUT/DELETE | `/items` | Inventory items that belong to categories |
| GET/POST | `/purchases` | Capture purchase orders per user & item |
| GET/POST | `/usage` | Track usage events (quantity used per user) |
| GET/POST | `/reports` | Summary records with totals per reporting period |
| GET | `/users` | Read-only list of users (POST available for admin seeding) |
| GET | `/dashboard/summary` | Aggregated metrics (totals, low stock, expiring soon, spend) |

Example request (create inventory item):

```sh
curl -X POST http://localhost:4000/api/items \
  -H "Content-Type: application/json" \
  -d '{
    "itemName": "Roma Tomato",
    "categoryId": "CAT_VEG",
    "quantityInStock": 30,
    "unitCost": 0.45,
    "shelfLifeDays": 7,
    "expirationDate": "2025-11-16",
    "status": "AVAILABLE"
  }'
```

### Frontend integration

The Vue client reads `VITE_API_BASE_URL` (defaults to `http://localhost:4000/api`). Update `frontend/.env` or `frontend/.env.production` if your API runs elsewhere.
