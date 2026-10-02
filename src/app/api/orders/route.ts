export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { fail, HttpError } from '@/lib/route'
import { syncStockAlert } from '@/lib/stock'
import { assertRole } from '@/lib/roles'

const VALID_STATUSES = ['PENDING', 'PREPARING', 'READY', 'SERVED', 'PAID', 'CANCELLED'] as const
const MAX_QTY_PER_LINE = 50

function generateOrderNumber() {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ORD-${timestamp.slice(-5)}${random}`
}

// Public: customers place orders from the table QR page.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tableId, tableToken } = body
    const customerName = String(body.customerName ?? '').trim().slice(0, 80)
    const customerPhone = body.customerPhone ? String(body.customerPhone).trim().slice(0, 30) : null
    const notes = body.notes ? String(body.notes).trim().slice(0, 500) : null

    if ((!tableId && !tableToken) || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty' }, { status: 400 })
    }

    const table = await prisma.table.findFirst({
      where: tableToken ? { token: String(tableToken) } : { id: String(tableId) },
    })
    if (!table) return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
    const restaurantId = table.restaurantId

    // Merge duplicate lines (same dish + same customization) and validate quantities.
    type Line = { menuItemId: string; quantity: number; notes: string | null; removedIds: string[] }
    const lines = new Map<string, Line>()
    for (const raw of body.items) {
      const qty = Number(raw?.quantity)
      if (!raw?.menuItemId || !Number.isInteger(qty) || qty < 1) {
        return NextResponse.json({ error: 'Each item needs a quantity of at least 1' }, { status: 400 })
      }
      const removedIds: string[] = Array.isArray(raw?.removedIngredientIds)
        ? [...new Set<string>(raw.removedIngredientIds.map((x: unknown) => String(x)))].sort()
        : []
      const key = `${raw.menuItemId}::${removedIds.join(',')}`
      const prev = lines.get(key)
      lines.set(key, {
        menuItemId: raw.menuItemId,
        quantity: (prev?.quantity ?? 0) + qty,
        notes: raw.notes ? String(raw.notes).slice(0, 200) : prev?.notes ?? null,
        removedIds,
      })
    }
    for (const l of lines.values()) {
      if (l.quantity > MAX_QTY_PER_LINE) {
        return NextResponse.json({ error: `You can order at most ${MAX_QTY_PER_LINE} of one item` }, { status: 400 })
      }
    }

    const menuItemIds = [...new Set([...lines.values()].map((l) => l.menuItemId))]
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, restaurantId },
      include: { ingredients: { include: { inventoryItem: true } } },
    })
    if (menuItems.length !== menuItemIds.length) {
      return NextResponse.json(
        { error: 'Some items are no longer on the menu. Please refresh and try again.' },
        { status: 400 }
      )
    }
    const menuItemById = new Map(menuItems.map((m) => [m.id, m]))

    // A customer can only remove ingredients the restaurant marked as removable for that dish.
    for (const line of lines.values()) {
      if (line.removedIds.length === 0) continue
      const removable = new Set(
        menuItemById
          .get(line.menuItemId)!
          .ingredients.filter((i) => (i as { removable?: boolean }).removable)
          .map((i) => i.inventoryItemId)
      )
      if (line.removedIds.some((id) => !removable.has(id))) {
        return NextResponse.json({ error: 'One of your customizations is no longer available. Please review your order.' }, { status: 400 })
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      let session = await tx.tableSession.findFirst({ where: { tableId: table.id, status: 'ACTIVE' } })
      if (!session) {
        session = await tx.tableSession.create({ data: { tableId: table.id, restaurantId, status: 'ACTIVE' } })
      }

      let total = 0
      const itemsData = [...lines.values()].map((line) => {
        const m = menuItemById.get(line.menuItemId)!
        total += m.price * line.quantity
        const removedIngredients = line.removedIds.map((id) => m.ingredients.find((i) => i.inventoryItemId === id)!.inventoryItem.name)
        return { menuItemId: m.id, quantity: line.quantity, price: m.price, notes: line.notes, removedIngredients }
      })

      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          tableId: table.id,
          restaurantId,
          sessionId: session.id,
          customerName: customerName || `Table ${table.number}`,
          customerPhone,
          total: Math.round(total * 100) / 100,
          notes,
          items: { create: itemsData as unknown as Prisma.OrderItemUncheckedCreateWithoutOrderInput[] },
        },
        include: { items: { include: { menuItem: true } }, table: true },
      })

      // Deduct stock atomically – the WHERE guard stops concurrent orders overselling.
      // Ingredients the customer removed for a line are skipped for that line's quantity.
      const needed = new Map<string, number>()
      for (const line of lines.values()) {
        const m = menuItemById.get(line.menuItemId)!
        for (const ing of m.ingredients) {
          if (line.removedIds.includes(ing.inventoryItemId)) continue
          needed.set(ing.inventoryItemId, (needed.get(ing.inventoryItemId) ?? 0) + ing.quantity * line.quantity)
        }
      }
      for (const [inventoryItemId, required] of needed) {
        const res = await tx.inventoryItem.updateMany({
          where: { id: inventoryItemId, quantity: { gte: required } },
          data: { quantity: { decrement: required } },
        })
        if (res.count === 0) {
          const inv = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } })
          const dish = menuItems.find((m) => m.ingredients.some((i) => i.inventoryItemId === inventoryItemId))
          throw new HttpError(409, `Sorry, ${dish?.name ?? inv?.name ?? 'an item'} just ran out of stock.`)
        }
        await tx.inventoryChangeLog.create({
          data: { inventoryItemId, changeAmount: -required, changeType: 'ORDER', orderId: created.id },
        })
        const inv = await tx.inventoryItem.findUniqueOrThrow({ where: { id: inventoryItemId } })
        await syncStockAlert(tx, inv)
      }

      await tx.table.update({ where: { id: table.id }, data: { status: 'OCCUPIED' } })
      return created
    })

    return NextResponse.json(
      { id: order.id, orderNumber: order.orderNumber, total: order.total, status: order.status },
      { status: 201 }
    )
  } catch (error) {
    return fail(error, 'orders-post')
  }
}

// Admin: change order status.
export async function PUT(req: NextRequest) {
  try {
    const { restaurantId, role } = await getRestaurantContext()
    assertRole(role, ['admin', 'manager', 'staff'])
    const { id, status } = await req.json()

    if (!id || !status) return NextResponse.json({ error: 'Missing order id or status' }, { status: 400 })
    if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

    const existing = await prisma.order.findFirst({ where: { id, restaurantId } })
    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Cancelled orders cannot be changed' }, { status: 409 })
    }
    if (existing.status === 'PAID' && status !== 'PAID') {
      return NextResponse.json({ error: 'Paid orders cannot be changed' }, { status: 409 })
    }
    if (existing.status === status) {
      return NextResponse.json({ error: `Order is already ${status.toLowerCase()}` }, { status: 409 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Cancelling before the kitchen starts returns the ingredients to stock.
      if (status === 'CANCELLED' && existing.status === 'PENDING') {
        const logs = await tx.inventoryChangeLog.findMany({
          where: { orderId: id, changeType: 'ORDER' },
        })
        for (const log of logs) {
          const restored = await tx.inventoryItem.update({
            where: { id: log.inventoryItemId },
            data: { quantity: { increment: -log.changeAmount } },
          })
          await tx.inventoryChangeLog.create({
            data: { inventoryItemId: log.inventoryItemId, changeAmount: -log.changeAmount, changeType: 'CANCEL', orderId: id },
          })
          await syncStockAlert(tx, restored)
        }
      }

      const order = await tx.order.update({
        where: { id },
        data: { status },
        include: { items: { include: { menuItem: true } }, table: true },
      })

      const stillActive = await tx.order.count({
        where: { tableId: order.tableId, status: { notIn: ['PAID', 'CANCELLED'] } },
      })
      await tx.table.update({
        where: { id: order.tableId },
        data: { status: stillActive > 0 ? 'OCCUPIED' : 'AVAILABLE' },
      })
      if (stillActive === 0) {
        await tx.tableSession.updateMany({
          where: { tableId: order.tableId, status: 'ACTIVE' },
          data: { status: 'CLOSED' },
        })
      }
      return order
    })

    return NextResponse.json(updated)
  } catch (error) {
    return fail(error, 'orders-put')
  }
}
