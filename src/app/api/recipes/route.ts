export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { fail, toNumber } from '@/lib/route'

export async function GET() {
  try {
    const { restaurantId } = await getRestaurantContext()
    const rows = await prisma.menuItemIngredient.findMany({
      where: { menuItem: { restaurantId } },
      include: { menuItem: true, inventoryItem: true },
      orderBy: [{ menuItem: { name: 'asc' } }, { createdAt: 'asc' }],
    })
    return NextResponse.json(rows)
  } catch (error) {
    return fail(error, 'recipes-get')
  }
}

export async function POST(req: NextRequest) {
  try {
    const { restaurantId } = await getRestaurantContext()
    const body = await req.json()
    const { menuItemId, inventoryItemId } = body
    const quantity = toNumber(body.quantity)

    if (!menuItemId || !inventoryItemId || quantity === null || quantity <= 0) {
      return NextResponse.json({ error: 'Choose a dish, an ingredient and a quantity above zero' }, { status: 400 })
    }

    const [menuItem, inventoryItem] = await Promise.all([
      prisma.menuItem.findFirst({ where: { id: menuItemId, restaurantId } }),
      prisma.inventoryItem.findFirst({ where: { id: inventoryItemId, restaurantId } }),
    ])
    if (!menuItem) return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    if (!inventoryItem) return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 })

    const existing = await prisma.menuItemIngredient.findUnique({
      where: { menuItemId_inventoryItemId: { menuItemId, inventoryItemId } },
    })
    if (existing) {
      return NextResponse.json({ error: `${inventoryItem.name} is already in the recipe for ${menuItem.name}` }, { status: 409 })
    }

    const created = await prisma.menuItemIngredient.create({
      data: { menuItemId, inventoryItemId, quantity },
      include: { menuItem: true, inventoryItem: true },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return fail(error, 'recipes-post')
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { restaurantId } = await getRestaurantContext()
    const body = await req.json()
    const quantity = toNumber(body.quantity)
    if (!body.id || quantity === null || quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be above zero' }, { status: 400 })
    }
    const row = await prisma.menuItemIngredient.findFirst({ where: { id: body.id, menuItem: { restaurantId } } })
    if (!row) return NextResponse.json({ error: 'Recipe ingredient not found' }, { status: 404 })

    const updated = await prisma.menuItemIngredient.update({
      where: { id: body.id },
      data: { quantity },
      include: { menuItem: true, inventoryItem: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    return fail(error, 'recipes-put')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { restaurantId } = await getRestaurantContext()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing ingredient id' }, { status: 400 })

    const row = await prisma.menuItemIngredient.findFirst({ where: { id, menuItem: { restaurantId } } })
    if (!row) return NextResponse.json({ error: 'Recipe ingredient not found' }, { status: 404 })

    await prisma.menuItemIngredient.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return fail(error, 'recipes-delete')
  }
}
