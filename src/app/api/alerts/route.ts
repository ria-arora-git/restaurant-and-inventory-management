export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { fail } from '@/lib/route'

// Open (unacknowledged) alerts only – used for the navbar bell.
export async function GET() {
  try {
    const { restaurantId } = await getRestaurantContext()
    const alerts = await prisma.stockAlert.findMany({
      where: { acknowledged: false, inventoryItem: { restaurantId } },
      include: { inventoryItem: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(alerts)
  } catch (error) {
    return fail(error, 'alerts')
  }
}
