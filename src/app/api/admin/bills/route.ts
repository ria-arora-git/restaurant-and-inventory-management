export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type {} from '@prisma/client'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { assertRole } from '@/lib/roles'
import { fail } from '@/lib/route'

export async function GET() {
  try {
    const { restaurantId, role } = await getRestaurantContext()
    assertRole(role, ['admin', 'manager'])
    const bills = await prisma.bill.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { orders: { include: { items: { include: { menuItem: true } }, table: true } } },
    })
    return NextResponse.json(bills)
  } catch (error) {
    return fail(error, 'admin-bills')
  }
}
