# Deployment Guide – Reyhan's Grill Inventory System

This guide explains how to deploy the full‑stack application (Node.js/Express backend + Vue 3 frontend + MySQL) to a non‑development environment (staging or production).

The instructions are environment‑agnostic and will work on most Linux or Windows servers (VMs, containers, or PaaS) as long as the prerequisites are met.

---

## 1. Architecture Overview

- **Backend**: Node.js + Express REST API in `backend/`, connects to MySQL.
- **Database**: MySQL 8 (or compatible), schema and migrations in `backend/sql/`.
- **Frontend**: Vue 3 + Vite SPA in `frontend/`, built to static files in `frontend/dist/`.
- **Typical setup**:
  - MySQL hosted on a managed service or server.
  - Backend runs as a long‑lived Node process (systemd, PM2, or similar).
  - Frontend is served as static files by Nginx/Apache or a static hosting service, proxying API traffic to the backend.

---

## 2. Prerequisites

On the **server** where the app will run:

- Node.js:
  - Backend: Node **18+**
  - Frontend: Node **20.19+** or **22.12+** (see `frontend/package.json`)
- npm (bundled with Node).
- MySQL 8 (or compatible such as MariaDB) reachable from the backend.
- A way to keep the backend process running:
  - Linux: `systemd`, `pm2`, `forever`, Docker, etc.
  - Windows: NSSM, a Windows Service wrapper, or a container/orchestrator.

You should also have:

- A host name or IP for the MySQL instance.
- Credentials for a database user with permission to create tables and run migrations.

---

## 3. Database Setup

These steps assume a **fresh** database instance. If you already have data in production, see the **Migrations & Upgrades** section instead.

1. Create the database (if not already created):

   ```sql
   CREATE DATABASE reyhans_grill
     DEFAULT CHARACTER SET utf8mb4
     DEFAULT COLLATE utf8mb4_unicode_ci;
   ```

2. From the project root, run the schema script against the new database:

   ```sh
   cd backend
   mysql -h <DB_HOST> -u <DB_USER> -p reyhans_grill < sql/schema.sql
   ```

   Replace:

   - `<DB_HOST>` – your MySQL host (e.g. `localhost` or a cloud DB endpoint).
   - `<DB_USER>` – MySQL user with appropriate privileges.

This will:

- Create all required tables (inventory, usage, income, expense, users, sessions, etc.).
- Seed default configuration and an initial `admin` user.

---

## 4. Backend Deployment (API)

### 4.1 Copy code to the server

On your target server:

1. Clone the repository or copy the `backend/` folder:

   ```sh
   git clone <your-repo-url> cis4375-reyhans-grill
   cd cis4375-reyhans-grill/backend
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

### 4.2 Configure environment variables

Create a `.env` file in `backend/` (or configure environment variables via your hosting provider). The backend uses either a single `DATABASE_URL` or individual DB fields.

Minimum recommended variables:

```env
NODE_ENV=production
PORT=4000
FRONTEND_ORIGIN=https://your-frontend-domain.example

# Option 1: single connection string
DATABASE_URL=mysql://<user>:<password>@<host>:<port>/<database>

# Option 2: individual fields
DB_HOST=<your-db-host>
DB_PORT=3306
DB_USER=<your-db-user>
DB_PASSWORD=<your-db-password>
DB_NAME=reyhans_grill
DB_POOL_SIZE=10

# Optional SSL flag if your MySQL host requires TLS
DB_SSL=true
```

Notes:

- `FRONTEND_ORIGIN` is used for CORS; set it to your deployed frontend origin (or a comma‑separated list).
- Do **not** commit real credentials to source control. Use secrets managers or environment‑specific configuration.

### 4.3 Start the API server

To run the API directly:

```sh
cd backend
npm run start
```

For production, run the server under a process manager so it restarts automatically on failure/reboot. For example, with PM2:

```sh
npm install -g pm2
pm2 start src/server.js --name reyhans-grill-api
pm2 save
```

You should now be able to reach the API at:

```text
http://<server-host>:<PORT>/api/health
```

If you put the backend behind a reverse proxy, expose a friendly HTTPS domain and proxy `/api` to the backend `PORT`.

---

## 5. Frontend Deployment (Vue SPA)

### 5.1 Configure API base URL

The frontend uses `VITE_API_BASE_URL` to know where the backend is hosted.

In `frontend/.env` (or via your deployment platform’s env settings):

```env
VITE_API_BASE_URL=https://your-api-domain.example/api
```

You can start from `frontend/.env.example`:

```sh
cd frontend
cp .env.example .env
# then edit .env to point at your API
```

### 5.2 Build static assets

On the server (or in your CI pipeline):

```sh
cd frontend
npm install
npm run build
```

This creates the production‑ready static files in `frontend/dist/`.

### 5.3 Serve the frontend

Common options:

- **Nginx / Apache**: copy the contents of `frontend/dist/` to the web root and configure a virtual host.
- **Static hosting service** (S3 + CloudFront, Netlify, Vercel, etc.): upload `dist/` as your site artifact.

Make sure:

- The frontend domain is configured in `FRONTEND_ORIGIN` on the backend.
- The frontend’s `VITE_API_BASE_URL` points to the backend `/api` URL.

---

## 6. Migrations & Upgrades

Over time, the schema evolves via SQL migration files in `backend/sql/migrations/` (for example `20241120_add_user_sessions.sql`).

### 6.1 Applying migrations to an existing database

When you deploy a new version that includes new migration files:

1. Copy the latest `backend/sql/migrations/*.sql` files to the server (usually via git pull).
2. Apply any **new** migration files to your production database, in timestamp order:

   ```sh
   cd backend
   mysql -h <DB_HOST> -u <DB_USER> -p reyhans_grill < sql/migrations/20241119_create_expense_tracker_tables.sql
   mysql -h <DB_HOST> -u <DB_USER> -p reyhans_grill < sql/migrations/20241120_add_user_sessions.sql
   ```

3. Restart the backend process if needed.

Keep a simple log (e.g. spreadsheet or table) of which migration files have been applied to each environment so you don’t run the same file twice.

### 6.2 Fresh installs vs. migrations

- **Fresh environment**: running `sql/schema.sql` is usually enough; it contains the current schema plus seed data.
- **Existing environment**: apply **only the new migration files** since the last deployed version to avoid dropping or duplicating data.

---

## 7. Post‑Deployment Checks

After deploying, verify:

- Backend:
  - `GET /api/health` returns a healthy response.
  - You can fetch core resources such as `/api/items`, `/api/categories`, or `/api/dashboard/summary`.
- Frontend:
  - Application loads without console errors.
  - It can log in as the admin user and interact with inventory, usage, and reports.
- Database:
  - Tables like `user`, `Item`, `Purchase`, `user_sessions`, `Expense`, etc. exist and contain expected seed rows.

---

## 8. Environment Management Tips

- Use different databases for dev, staging, and production (different `DB_NAME` or different servers).
- Keep `.env` files **out of version control**; use `.env.example` for documentation only.
- Automate deployment steps with a CI/CD pipeline where possible:
  - Backend: build/test (if tests are added), deploy code, run migrations, restart process.
  - Frontend: build assets, upload `dist/` to your hosting target.

If you share where you plan to host (e.g. AWS EC2 + RDS, Azure App Service, Docker, etc.), you can further specialize these steps into a platform-specific runbook.

---

## 9. AWS Example: EC2 + RDS + S3

This section shows how to map the generic steps above to a concrete AWS setup:

- **RDS (MySQL)**: production database.
- **EC2 instance**: runs the Node.js backend.
- **S3 bucket**: hosts the built Vue frontend as a static website (optionally fronted by CloudFront).

### 9.1 Create the RDS MySQL database

1. In the AWS Console, go to **RDS → Databases → Create database**.
2. Engine: **MySQL** (8.x).
3. Templates: choose **Free tier** or an appropriate instance class (e.g. `db.t3.micro`) for non‑production.
4. Set:
   - **DB instance identifier** (e.g. `reyhansgrill-db`).
   - **Master username/password** (record them securely).
   - **Initial database name** (e.g. `reyhans_grill` or another name you’ll use for `DB_NAME`).
5. Networking:
   - Place RDS in the same **VPC** as the EC2 instance.
   - Use a **security group** that only allows MySQL (port 3306) **from your EC2 security group**, not from the internet.
6. Create the database and wait until it’s available.

Then, on a machine that can reach RDS (often the EC2 instance itself):

```sh
mysql -h <RDS_ENDPOINT> -u <DB_USER> -p <DB_NAME> < backend/sql/schema.sql
```

Where:

- `<RDS_ENDPOINT>` is the hostname shown in the RDS console, e.g. `reyhansgrill-db.xxxxx.us-east-1.rds.amazonaws.com`.
- `<DB_NAME>` matches what you want your app to use.

This runs the full schema and seed data on RDS.

### 9.2 Provision the EC2 instance (backend)

1. In the AWS Console, go to **EC2 → Instances → Launch instance**.
2. Choose an AMI, for example:
   - **Amazon Linux 2023** or **Ubuntu 22.04**.
3. Instance type: e.g. `t3.small` or similar for a small app.
4. Networking:
   - Place EC2 in the same **VPC** as RDS.
   - Security group rules (example):
     - Inbound `22` (SSH) from your IP only.
     - Inbound `80`/`443` from the internet (if you expose the API directly) or from a load balancer.
   - Outbound: allow default outbound so it can reach RDS by its endpoint.
5. Launch and connect via SSH.

On the EC2 instance, install Node.js and Git (example for Amazon Linux):

```sh
sudo dnf install -y git
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

Then deploy the backend:

```sh
git clone <your-repo-url> /var/www/reyhans-grill
cd /var/www/reyhans-grill/backend
npm install
```

Create `/var/www/reyhans-grill/backend/.env` with your RDS info:

```env
NODE_ENV=production
PORT=4000
FRONTEND_ORIGIN=https://<your-frontend-domain-or-cloudfront-url>

DB_HOST=<RDS_ENDPOINT>
DB_PORT=3306
DB_USER=<DB_USER>
DB_PASSWORD=<DB_PASSWORD>
DB_NAME=<DB_NAME>
DB_POOL_SIZE=10
DB_SSL=true
```

Start the API with a process manager such as PM2:

```sh
sudo npm install -g pm2
cd /var/www/reyhans-grill/backend
pm2 start src/server.js --name reyhans-grill-api
pm2 save
```

You can now test:

```sh
curl http://localhost:4000/api/health
```

If you want a friendlier URL (e.g. `https://api.yourdomain.com`), put an **Application Load Balancer** or **Nginx** in front of the EC2 instance and terminate HTTPS there.

### 9.3 Build and upload the frontend to S3

1. In the AWS Console, go to **S3 → Create bucket**.
   - Choose a globally unique name, e.g. `reyhans-grill-frontend-prod`.
   - For a public website, allow public access for this bucket (you can tighten this later with CloudFront).
2. Enable static website hosting:
   - In the bucket properties, enable **Static website hosting**.
   - Set **Index document** to `index.html`.
   - Optionally set **Error document** to `index.html` for SPA routing.

On a machine with the code and AWS CLI configured:

```sh
cd frontend
cp .env.example .env
```

Edit `frontend/.env` to point to your deployed API:

```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

Build and upload:

```sh
cd frontend
npm install
npm run build
aws s3 sync dist/ s3://reyhans-grill-frontend-prod/ --delete
```

Now your site is available at the S3 website URL (and, if configured, via CloudFront).

### 9.4 Wire everything together

- On the **backend**, `FRONTEND_ORIGIN` should match the URL users use to access the S3/CloudFront site, for example:

  ```env
  FRONTEND_ORIGIN=https://d1234567890abcdef.cloudfront.net
  ```

- On the **frontend**, `VITE_API_BASE_URL` should match the public API URL (e.g. behind a load balancer or directly on EC2).
- Make sure security groups allow:
  - S3/CloudFront → browser (public HTTPS).
  - Browser → API (public HTTPS endpoint).
  - EC2 → RDS (port 3306) inside the VPC.

With this setup:

- Users hit the S3/CloudFront URL for the Vue app.
- The Vue app calls the EC2‑hosted API at `VITE_API_BASE_URL`.
- The API talks to the RDS MySQL database using the configuration in `.env`.
