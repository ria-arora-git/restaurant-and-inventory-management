export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { fail, toNumber } from '@/lib/route'
import { syncStockAlert } from '@/lib/stock'

const UNIT_RE = /^[a-zA-Z][a-zA-Z .]{0,11}$/

export async function GET(req: NextRequest) {
  try {
    const { restaurantId } = await getRestaurantContext()

    const id = req.nextUrl.searchParams.get('id')
    if (id) {
      const usage = await prisma.menuItemIngredient.findMany({
        where: { inventoryItemId: id, menuItem: { restaurantId } },
        include: { menuItem: true },
      })
      return NextResponse.json({ usedIn: usage.map((u) => u.menuItem.name) })
    }

    const items = await prisma.inventoryItem.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
      include: {
        alerts: { where: { acknowledged: false } },
        ingredients: { include: { menuItem: { select: { id: true, name: true } } } },
      },
    })
    return NextResponse.json(items)
  } catch (error) {
    return fail(error, 'inventory-get')
  }
}

export async function POST(req: NextRequest) {
  try {
    const { restaurantId } = await getRestaurantContext()
    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const unit = String(body.unit ?? '').trim()
    const quantity = toNumber(body.quantity)
    const minStock = toNumber(body.minStock)

    if (!name || !unit || quantity === null || minStock === null) {
      return NextResponse.json({ error: 'Name, unit, quantity and minimum stock are required' }, { status: 400 })
    }
    if (quantity < 0 || minStock < 0) {
      return NextResponse.json({ error: 'Values must be zero or greater' }, { status: 400 })
    }
    if (!UNIT_RE.test(unit)) {
      return NextResponse.json({ error: 'Unit must be text such as kg, g, l, ml or pcs' }, { status: 400 })
    }

    const duplicate = await prisma.inventoryItem.findFirst({
      where: { restaurantId, name: { equals: name, mode: 'insensitive' } },
    })
    if (duplicate) {
      return NextResponse.json({ error: `"${duplicate.name}" already exists in your inventory` }, { status: 409 })
    }

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({ data: { name, unit, quantity, minStock, restaurantId } })
      await syncStockAlert(tx, created)
      return created
    })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return fail(error, 'inventory-post')
  }
}

// Either { id, quantityChange }            – restock / adjust by a delta
// or     { id, name?, unit?, minStock?, quantity? } – edit details / set an absolute level
export async function PUT(req: NextRequest) {
  try {
    const { restaurantId } = await getRestaurantContext()
    const body = await req.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'Missing item id' }, { status: 400 })

    const item = await prisma.inventoryItem.findFirst({ where: { id, restaurantId } })
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const data: { name?: string; unit?: string; minStock?: number; quantity?: number } = {}

    if (body.name !== undefined) {
      const name = String(body.name).trim()
      if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      const dup = await prisma.inventoryItem.findFirst({
        where: { restaurantId, id: { not: id }, name: { equals: name, mode: 'insensitive' } },
      })
      if (dup) return NextResponse.json({ error: `"${dup.name}" already exists` }, { status: 409 })
      data.name = name
    }
    if (body.unit !== undefined) {
      const unit = String(body.unit).trim()
      if (!UNIT_RE.test(unit)) return NextResponse.json({ error: 'Invalid unit' }, { status: 400 })
      data.unit = unit
    }
    if (body.minStock !== undefined) {
      const minStock = toNumber(body.minStock)
      if (minStock === null || minStock < 0) return NextResponse.json({ error: 'Invalid minimum stock' }, { status: 400 })
      data.minStock = minStock
    }

    let change = 0
    if (body.quantityChange !== undefined) {
      const delta = toNumber(body.quantityChange)
      if (delta === null) return NextResponse.json({ error: 'Invalid quantity change' }, { status: 400 })
      data.quantity = Math.round((item.quantity + delta) * 1000) / 1000
      change = data.quantity - item.quantity
    } else if (body.quantity !== undefined) {
      const q = toNumber(body.quantity)
      if (q === null) return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
      data.quantity = q
      change = q - item.quantity
    }
    if (data.quantity !== undefined && data.quantity < 0) {
      return NextResponse.json({ error: 'Stock cannot go below zero' }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.inventoryItem.update({ where: { id }, data })
      if (change !== 0) {
        await tx.inventoryChangeLog.create({
          data: { inventoryItemId: id, changeAmount: change, changeType: 'MANUAL' },
        })
      }
      await syncStockAlert(tx, u)
      return u
    })
    return NextResponse.json(updated)
  } catch (error) {
    return fail(error, 'inventory-put')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { restaurantId } = await getRestaurantContext()
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing item id' }, { status: 400 })

    const item = await prisma.inventoryItem.findFirst({ where: { id, restaurantId } })
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const usage = await prisma.menuItemIngredient.findMany({
      where: { inventoryItemId: id },
      include: { menuItem: true },
    })
    if (usage.length > 0) {
      const names = [...new Set(usage.map((u) => u.menuItem.name))].join(', ')
      return NextResponse.json(
        { error: `Cannot delete – used in recipes for: ${names}. Remove it from those recipes first.` },
        { status: 409 }
      )
    }

    await prisma.$transaction([
      prisma.stockAlert.deleteMany({ where: { inventoryItemId: id } }),
      prisma.inventoryChangeLog.deleteMany({ where: { inventoryItemId: id } }),
      prisma.inventoryItem.delete({ where: { id } }),
    ])
    return NextResponse.json({ success: true })
  } catch (error) {
    return fail(error, 'inventory-delete')
  }
}
