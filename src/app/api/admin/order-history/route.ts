export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { fail } from '@/lib/route'

export async function GET(req: NextRequest) {
  try {
    const { restaurantId } = await getRestaurantContext()
    const from = req.nextUrl.searchParams.get('from')
    const to = req.nextUrl.searchParams.get('to')

    const createdAt: { gte?: Date; lte?: Date } = {}
    if (from && !isNaN(Date.parse(from))) createdAt.gte = new Date(from)
    if (to && !isNaN(Date.parse(to))) createdAt.lte = new Date(to)

    const orders = await prisma.order.findMany({
      where: { restaurantId, ...(createdAt.gte || createdAt.lte ? { createdAt } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 2000,
      include: { items: { include: { menuItem: true } }, table: true },
    })
    return NextResponse.json(orders)
  } catch (error) {
    return fail(error, 'order-history')
  }
}
