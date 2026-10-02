# RestaurantOS (execraft)

A restaurant and inventory management system: QR table ordering, a live kitchen board, automatic
inventory tracking, recipes with customer-facing customization, staff roles, table billing, order
history and analytics. Built with Next.js 14 (App Router), Prisma + PostgreSQL, Clerk (an
organization = a restaurant) and Tailwind.

## Features

- **Owner (registration & authentication)** — sign up, create the restaurant, and manage everything:
  menu, inventory, recipes, tables, staff and roles, order history, bills and analytics.
- **Staff accounts & roles** — the Owner invites Managers and Staff by email; each role sees only
  what it's allowed to (see **Roles** below). Enforced on every API route, not just hidden in the UI.
- **Tables & QR codes** — create tables, print a QR code for each, regenerate a code if it leaks.
- **Menu & recipes** — dishes with price, prep time and an image; recipes define how much of each
  ingredient a serving uses, and any ingredient can be marked **customer-removable** (e.g. "no onion").
- **Customer ordering (no login)** — scan a table's QR code, browse the live menu, customize a dish
  by removing allowed ingredients, add a special request and a name/phone number, then track the
  order's status live. Sold-out dishes (insufficient stock) are shown as unavailable automatically.
- **Order processing & inventory deduction** — placing an order atomically deducts exactly the
  ingredients needed (minus anything the customer removed), preventing overselling under load.
- **Low-stock alerts** — an alert opens automatically when an ingredient drops to its minimum and
  resolves itself once restocked; Owners/Managers can also dismiss or reopen alerts manually.
- **Table occupancy & billing** — a table stays occupied while it has active orders. Once every
  order on a table is served, staff can **close the table**: all its orders are marked paid and
  combined into one bill, the table is freed, and the bill is kept for history/analytics.
- **Order history & bills** with search/filters and an Excel export; **analytics** with revenue
  trends, best sellers, peak hours and period-over-period comparisons.

## Roles

| Role | Can access | Can change |
|---|---|---|
| **Owner** (`org:admin`) | Everything | Restaurant, staff & roles, menu, inventory, recipes, tables, orders, bills, analytics |
| **Manager** (`org:manager`) | Orders, tables, menu, inventory, recipes, order history, analytics | Everything except staff/roles |
| **Staff** (`org:staff`) | Live orders, tables, alerts, menu (read-only) | Order status, table billing, inventory quantity (restock) |

Roles map to Clerk organization roles. `org:admin` is Clerk's built-in creator role. **`org:manager`
and `org:staff` are custom roles you create once** in the Clerk Dashboard:
**Organizations Settings → Roles → Create role**, with keys `org:manager` and `org:staff` (Clerk
does not currently expose role creation over the API). Do this once per Clerk application/environment
before inviting staff from `/admin/staff` — invites for a role that doesn't exist yet will fail with
a clear error telling you to add it.

## Setup

1. `cp .env.example .env` and fill in `DATABASE_URL` and the Clerk keys (enable **Organizations** in
   Clerk, and add the two custom roles above).
2. `npm install` (runs `prisma generate` automatically via `postinstall`)
3. `npm run db:deploy` (applies the included migrations; use `npm run prisma:migrate` instead in development)
4. `npm run dev` → http://localhost:3000
5. Sign up, create a restaurant, then set up Menu → Inventory → Recipes → Tables, and invite staff
   from **Staff & roles** if needed.

Optional demo data: set `SEED_CLERK_ORG_ID` in `.env` to your organization id and run `npm run db:seed`.

## How ordering, customization and billing fit together

1. A recipe ingredient marked **removable** shows up to customers as a "No <ingredient>" checkbox
   when they customize a dish. The order stores exactly which ingredients were left out.
2. Placing an order deducts each ingredient's recipe quantity × the ordered quantity, skipping any
   ingredient the customer removed for that line, in one atomic transaction.
3. When stock drops to or below its minimum, a low-stock alert appears for the Owner/Manager.
4. Staff move each order through Pending → Preparing → Ready → Served on the live board.
5. Once every order on a table is Served, **Table Management → Close table & bill** consolidates
   them into a single bill, marks them Paid, and frees the table. The bill is visible afterwards
   under **Order history → Bills**.

## Scripts

`dev`, `build`, `start`, `typecheck`, `db:deploy`, `db:seed`.

## Theming

Colours live in `src/lib/theme-config.ts` (switch `ACTIVE_THEME`). Currency/locale:
`NEXT_PUBLIC_CURRENCY`, `NEXT_PUBLIC_LOCALE`.

## Notes

- Deleting a dish or table that already appears in past orders is blocked to protect history/analytics.
- The public order endpoint validates quantities/customizations and deducts stock atomically to
  prevent overselling.
- A table can only be billed once every one of its active orders is marked Served.
- No tax/service-charge modelling is included; `Bill.subtotal`/`Bill.total` are currently equal —
  extend `close-bill`'s route if you need to add charges.
