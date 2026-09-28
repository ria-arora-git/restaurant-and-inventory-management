export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { fail } from '@/lib/route'

export async function GET(_req: NextRequest, { params }: { params: { tableId: string } }) {
  try {
    const { restaurantId } = await getRestaurantContext()
    const orders = await prisma.order.findMany({
      where: { tableId: params.tableId, restaurantId, status: { notIn: ['PAID', 'CANCELLED'] } },
      include: { items: { include: { menuItem: true } }, table: true },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(orders)
  } catch (error) {
    return fail(error, 'table-orders')
  }
}
