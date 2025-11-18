# CIS4375-Team10-Reyhans-Grill

Full-stack capstone inventory system.

## Getting started

### Backend

```sh
cd backend
npm install
cp .env  # update with your DB credentials
mysql -u <user> -p <db_name> < sql/schema.sql
npm run dev
```

The API listens on `PORT` (defaults to `4000`) and follows the ERD entities:

- `/categories` – category lookup table for ingredients + utensils
- `/items` – inventory items joined to categories
- `/purchases`, `/usage`, `/reports` – purchase orders, consumption logs, and roll‑up reports linked to users/items
- `/users` – users referenced by purchase/usage/report tables
- `/dashboard/summary` – metrics used by the Vue dashboard (totals, low stock, expiring soon, recent spend)

### Frontend

```sh
cd frontend
npm install
cp .env.example .env   # optional: only if you need to override the API origin
npm run dev
```

The Vue client reads from `VITE_API_BASE_URL` (defaults to `http://localhost:4000/api`) and now pulls all table data from the backend instead of hard-coded values.

For production deployment, see `DEPLOYMENT.md` in the project root.
