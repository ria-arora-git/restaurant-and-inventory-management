/**
 * Demo data loader.
 *
 *   1. Sign in once, create your restaurant (organization) and copy its id
 *      (Clerk dashboard → Organizations → org_xxx).
 *   2. Put it in .env as SEED_CLERK_ORG_ID=org_xxx
 *   3. npm run db:seed
 *
 * Safe to re-run: existing rows are matched by name / table number.
 */
import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

const INVENTORY = [
  { name: 'Pizza dough', unit: 'kg', quantity: 12, minStock: 3 },
  { name: 'Tomato sauce', unit: 'l', quantity: 8, minStock: 2 },
  { name: 'Mozzarella', unit: 'kg', quantity: 6, minStock: 2 },
  { name: 'Fresh basil', unit: 'g', quantity: 400, minStock: 100 },
  { name: 'Paneer', unit: 'kg', quantity: 5, minStock: 1.5 },
  { name: 'Naan bread', unit: 'pcs', quantity: 60, minStock: 15 },
  { name: 'Coffee beans', unit: 'kg', quantity: 3, minStock: 1 },
  { name: 'Milk', unit: 'l', quantity: 20, minStock: 5 },
  { name: 'Lemons', unit: 'pcs', quantity: 40, minStock: 10 },
  { name: 'Sugar', unit: 'kg', quantity: 8, minStock: 2 },
]

const MENU = [
  { name: 'Margherita Pizza', description: 'San Marzano tomato, fior di latte mozzarella and fresh basil.', category: 'Mains', price: 9.5, prepTime: 15, image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600',
    recipe: { 'Pizza dough': 0.25, 'Tomato sauce': 0.08, Mozzarella: 0.12, 'Fresh basil': 5 } },
  { name: 'Paneer Tikka', description: 'Char-grilled cottage cheese marinated in spiced yoghurt.', category: 'Starters', price: 7.25, prepTime: 12, image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600',
    recipe: { Paneer: 0.2 } },
  { name: 'Butter Naan', description: 'Soft leavened bread brushed with butter, baked in the tandoor.', category: 'Sides', price: 1.75, prepTime: 5, image: null,
    recipe: { 'Naan bread': 1 } },
  { name: 'Cold Coffee', description: 'Chilled espresso blended with milk and a touch of sugar.', category: 'Drinks', price: 3.5, prepTime: 4, image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600',
    recipe: { 'Coffee beans': 0.02, Milk: 0.2, Sugar: 0.015 } },
  { name: 'Fresh Lemonade', description: 'Hand-squeezed lemons, sugar and ice.', category: 'Drinks', price: 2.75, prepTime: 3, image: null,
    recipe: { Lemons: 2, Sugar: 0.02 } },
]

async function main() {
  const orgId = process.env.SEED_CLERK_ORG_ID
  if (!orgId) throw new Error('Set SEED_CLERK_ORG_ID in your .env to the Clerk organization id (org_...).')

  const restaurant = await prisma.restaurant.upsert({
    where: { clerkOrgId: orgId },
    update: {},
    create: { name: 'Demo Restaurant', clerkOrgId: orgId },
  })
  const restaurantId = restaurant.id

  const inv = new Map<string, string>()
  for (const item of INVENTORY) {
    const existing = await prisma.inventoryItem.findFirst({ where: { restaurantId, name: item.name } })
    const row = existing ?? (await prisma.inventoryItem.create({ data: { ...item, restaurantId } }))
    inv.set(item.name, row.id)
  }

  for (const { recipe, ...dish } of MENU) {
    const existing = await prisma.menuItem.findFirst({ where: { restaurantId, name: dish.name } })
    const menuItem = existing ?? (await prisma.menuItem.create({ data: { ...dish, restaurantId } }))
    for (const [ingredient, quantity] of Object.entries(recipe)) {
      const inventoryItemId = inv.get(ingredient)!
      await prisma.menuItemIngredient.upsert({
        where: { menuItemId_inventoryItemId: { menuItemId: menuItem.id, inventoryItemId } },
        update: { quantity },
        create: { menuItemId: menuItem.id, inventoryItemId, quantity },
      })
    }
  }

  for (const [number, capacity] of [[1, 2], [2, 2], [3, 4], [4, 4], [5, 6]] as const) {
    const existing = await prisma.table.findFirst({ where: { restaurantId, number } })
    if (!existing) {
      await prisma.table.create({ data: { number, capacity, token: randomBytes(9).toString('base64url'), restaurantId } })
    }
  }

  console.log(`Seeded demo data for organization ${orgId}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
