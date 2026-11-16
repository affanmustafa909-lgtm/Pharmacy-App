# Pharmacy App

## Mobile (CLI / native Android)

```bash
cd mobile
npm install
npm run android
```

This builds the native Android app (`mobile/android`) and installs it on your emulator or device.

## Admin dashboard

```bash
cd admin
npm install
npm run dev
```

Opens the Hera admin dashboard at http://localhost:5173. It talks to the API at http://localhost:4000.

## API

PostgreSQL runs from `backend/docker-compose.yml`. Copy `backend/.env.example` to `backend/.env` if you want to override the defaults. The API also accepts those defaults when `.env` is missing.

```bash
cd backend
docker compose up -d
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

`npm run db:seed` upserts demo data and **keeps stores you added in the portal**. Only run a full wipe with `FORCE_SEED=1 npm run db:seed` when you intentionally want to reset everything.

The API listens on http://localhost:4000. Postgres is published on port 5436 so it does not collide with another database already using 5432. Stores are saved in the Postgres volume (`hera_pg`) and survive API restarts.

Demo sign-in:

- Admin: `ava@hera.care` / `HeraAdmin!234`
- Staff (Chelsea only): `leo@hera.care` / `HeraStaff!234`
- Customer used by the mobile app: `michael.johnson@email.com` / `HeraCustomer!234`

The mobile app loads the catalog, stores, reminders, profile, and orders from the same API. On an Android emulator it uses http://10.0.2.2:4000.

Delivery and service charges support fixed amounts or percentages with an explicit calculation base. BFP charge rules are paused until their meaning and calculation are confirmed. Parallel sits after Pharmacies and does not save records until its purpose and fields are defined.

Product images can be set with a URL or uploaded under `backend/uploads/products`.
