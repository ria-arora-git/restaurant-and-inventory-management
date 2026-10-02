export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { assertRole } from '@/lib/roles'
import { fail, HttpError } from '@/lib/route'

/**
 * Closes out a table: every SERVED order for it is marked PAID and combined
 * into one Bill, the table is freed and its session is closed. This is the
 * "staff removes active status -> bill is generated automatically" step.
 */
export async function POST(_req: NextRequest, { params }: { params: { tableId: string } }) {
  try {
    const { restaurantId, role } = await getRestaurantContext()
    assertRole(role, ['admin', 'manager', 'staff'])

    const table = await prisma.table.findFirst({ where: { id: params.tableId, restaurantId } })
    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 })

    const bill = await prisma.$transaction(async (tx) => {
      const active = await tx.order.findMany({
        where: { tableId: table.id, restaurantId, status: { notIn: ['PAID', 'CANCELLED'] } },
        include: { items: { include: { menuItem: true } } },
        orderBy: { createdAt: 'asc' },
      })
      if (active.length === 0) throw new HttpError(400, 'This table has no orders to bill.')

      const notReady = active.filter((o) => o.status !== 'SERVED')
      if (notReady.length > 0) {
        throw new HttpError(409, 'Every order must be marked served before the table can be billed.')
      }

      const subtotal = Math.round(active.reduce((s, o) => s + o.total, 0) * 100) / 100
      const last = active[active.length - 1]

      const created = await tx.bill.create({
        data: {
          restaurantId,
          tableId: table.id,
          tableNumber: table.number,
          customerName: last.customerName,
          customerPhone: last.customerPhone,
          subtotal,
          total: subtotal,
        },
      })

      await tx.order.updateMany({
        where: { id: { in: active.map((o) => o.id) } },
        data: { status: 'PAID', billId: created.id } as Prisma.OrderUncheckedUpdateManyInput,
      })
      await tx.table.update({ where: { id: table.id }, data: { status: 'AVAILABLE' } })
      await tx.tableSession.updateMany({ where: { tableId: table.id, status: 'ACTIVE' }, data: { status: 'CLOSED' } })

      return { ...created, orders: active }
    })

    return NextResponse.json(bill, { status: 201 })
  } catch (error) {
    return fail(error, 'close-bill')
  }
}
