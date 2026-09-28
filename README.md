# RestaurantOS (execraft)

QR table ordering, a live kitchen board, automatic inventory tracking, recipes and analytics for restaurants.
Built with Next.js 14 (App Router), Prisma + PostgreSQL, Clerk (organizations = restaurants) and Tailwind.

## Features
- **Guests**: scan a table QR code → browse menu → order → live order tracking. Sold-out dishes are greyed out.
- **Live orders**: pending → preparing → ready → served → paid, plus cancel (restocks ingredients if cooking hasn't started).
- **Menu & recipes**: add/edit/delete dishes; define ingredient quantities per serving.
- **Inventory**: add/edit/adjust/delete ingredients; stock is deducted per order; low-stock alerts open and auto-resolve.
- **Tables**: add/edit/delete, printable QR codes, regenerate a leaked code.
- **Order history** with filters, details and Excel export; **analytics** with revenue, best sellers, peak hours.
- Every admin API is scoped to the signed-in restaurant.

## Setup
1. `cp .env.example .env` and fill in `DATABASE_URL` and the Clerk keys (enable **Organizations** in Clerk).
2. `npm install`
3. `npm run db:deploy` (or `npm run prisma:migrate` in development)
4. `npm run dev` → http://localhost:3000
5. Sign up, create a restaurant, then use Menu → Inventory → Recipes → Tables.

Optional demo data: set `SEED_CLERK_ORG_ID` in `.env` to your organization id and run `npm run db:seed`.

## Scripts
`dev`, `build`, `start`, `typecheck`, `db:deploy`, `db:seed`.

## Theming
Colours live in `src/lib/theme-config.ts` (switch `ACTIVE_THEME`). Currency/locale: `NEXT_PUBLIC_CURRENCY`, `NEXT_PUBLIC_LOCALE`.

## Notes
- Deleting a dish or table that already appears in past orders is blocked to protect history/analytics.
- The public order endpoint validates quantities and deducts stock atomically to prevent overselling.
# restaurant-and-inventory-management
