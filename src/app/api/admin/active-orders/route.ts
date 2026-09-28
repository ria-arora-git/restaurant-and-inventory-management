export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { fail } from '@/lib/route'

// Orders that still need attention (oldest first, like a kitchen ticket rail).
export async function GET() {
  try {
    const { restaurantId } = await getRestaurantContext()
    const orders = await prisma.order.findMany({
      where: { restaurantId, status: { notIn: ['PAID', 'CANCELLED'] } },
      include: { items: { include: { menuItem: true } }, table: true },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(orders)
  } catch (error) {
    return fail(error, 'active-orders')
  }
}
