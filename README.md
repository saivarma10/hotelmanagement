# Hotel Management POS — Phase 1

Production-grade restaurant POS MVP: billing, table management, KOT, GST billing, payments, and day-end reports.

**Architecture:** See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system diagrams, microservices plan, and full tech stack.

## Stack

| Layer | Technology |
|-------|------------|
| API | NestJS + Prisma + PostgreSQL |
| POS UI | React + Vite + Tailwind CSS |
| Auth | JWT |

## Quick Start

You can run everything as **local processes** — Docker is optional.

### Option A: Local PostgreSQL (recommended on Mac)

If you have Homebrew Postgres:

```bash
brew services start postgresql@14   # or your installed version

# One-time setup (create DB user)
psql postgres -c "CREATE USER hotel WITH PASSWORD 'hotel' CREATEDB;"
psql postgres -c "CREATE DATABASE hotelmanagement OWNER hotel;"
```

### Option B: Docker PostgreSQL

```bash
docker compose up -d
```

### Backend (terminal 1)

```bash
cd backend
cp .env.example .env   # if .env doesn't exist
npm install
npx prisma db push
npm run db:seed
npm run start:dev
```

API runs at `http://localhost:3000/api`

### Frontend (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

POS runs at `http://localhost:5173`

### Demo login

- **Email:** `admin@demo.com`
- **Password:** `password123`

### Onboard a new restaurant (UI)

1. Open http://localhost:5173/register
2. Fill business name, outlet name, owner details
3. Complete the **Setup wizard** (Restaurant → Floor Plan → Menu)
4. Go live on the Floor Plan

Or from login page: **Register here** → setup wizard → POS.

## Phase 1 Features

- **Auth** — JWT login, multi-tenant (organization → outlet)
- **Staff & Roles** — Petpooja-style role templates (Owner, Manager, Cashier, Captain, Kitchen), staff CRUD, PIN switch on shared terminal, API + UI permission enforcement
- **Floor plan** — Areas, tables with status (vacant / occupied / billing)
- **Menu** — Categories, items, variations, add-ons
- **Orders** — Add items, notes, remove pending items
- **KOT** — Send to kitchen, print KOT (browser print)
- **Billing** — GST tax, discount %/₹, split payments (cash/UPI/card)
- **Bill History** — Search, filter, reprint, day-end summary (Petpooja-style sales register)
- **Reports** — Day sales, payment breakdown, item-wise sales
- **QR Menu (view-only)** — Per-table QR codes; guests scan to browse live menu on phone (Petpooja Scan & Order — view mode)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register org + outlet |
| GET | `/api/auth/me` | Current user + permissions |
| POST | `/api/auth/pin-switch` | Switch staff on shared POS (4-digit PIN) |
| GET | `/api/users` | List staff (Owner only) |
| POST | `/api/users` | Add staff member |
| PATCH | `/api/users/:id` | Update role / activate / deactivate |
| POST | `/api/users/:id/reset-password` | Reset staff password |
| GET | `/api/outlets/:id/floor` | Floor plan |
| GET | `/api/outlets/:id/menu` | Full menu |
| POST | `/api/orders/tables/:tableId/outlets/:outletId` | Open order |
| POST | `/api/orders/:id/items` | Add item |
| POST | `/api/orders/:id/kot` | Send KOT |
| GET | `/api/billing/orders/:id/preview` | Bill preview |
| POST | `/api/billing/orders/:id/settle` | Settle bill |
| GET | `/api/billing/outlets/:id/bills` | Bill history (search, filter, paginate) |
| GET | `/api/billing/outlets/:id/bills/day-end` | Day-end biller-wise summary |
| GET | `/api/billing/bills/:billId` | Bill detail + reprint data |
| GET | `/api/public/menu/:qrToken` | Guest menu (no login) |
| GET | `/api/outlets/:id/qr-menu` | Table QR codes for printing |
| PATCH | `/api/outlets/:id/qr-menu` | Enable/disable QR menu |

## Project Structure

```
hotelmanagement/
├── backend/
│   ├── prisma/schema.prisma   # Database schema
│   ├── prisma/seed.ts         # Demo data
│   └── src/
│       ├── auth/              # Authentication
│       ├── menus/             # Menu management
│       ├── tables/            # Floor plan
│       ├── orders/            # Order + KOT
│       ├── billing/           # Billing + payments
│       └── reports/           # Day-end reports
├── frontend/
│   └── src/
│       ├── pages/             # Login, Floor, Order, Reports
│       └── components/        # Modals, print helpers
└── docker-compose.yml         # PostgreSQL
```

## POS Workflow

1. **Login** → select outlet (auto-selected for demo)
2. **Floor** → tap a vacant table to open order
3. **Order** → add menu items → **Send KOT** (prints kitchen ticket)
4. **Bill & Pay** → apply discount → record payment → print invoice
5. **Reports** → view day-end summary

## Production Notes

- Change `JWT_SECRET` in production
- Use `prisma migrate deploy` instead of `db push` in production
- Run `npm run build` for both backend and frontend
- Backend: `npm run start:prod`
- Frontend: serve `frontend/dist` via nginx/CDN

## Next Phases

- Phase 2b: QR guest ordering (cart + staff validation + KOT)
- Phase 3: Captain app + KDS kitchen screen
- Phase 4: Inventory + recipe auto-deduction
