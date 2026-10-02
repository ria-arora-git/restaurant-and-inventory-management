export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { fail } from '@/lib/route'
import { assertRole } from '@/lib/roles'

// All alerts (open + resolved), newest first.
export async function GET() {
  try {
    const { restaurantId } = await getRestaurantContext()
    const alerts = await prisma.stockAlert.findMany({
      where: { inventoryItem: { restaurantId } },
      include: { inventoryItem: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json(alerts)
  } catch (error) {
    return fail(error, 'admin-alerts')
  }
}

// { id, acknowledged }  – update one alert
// { all: true }         – acknowledge every open alert
export async function PUT(req: NextRequest) {
  try {
    const { restaurantId, role } = await getRestaurantContext()
    assertRole(role, ['admin', 'manager'])
    const body = await req.json()

    if (body.all === true) {
      const res = await prisma.stockAlert.updateMany({
        where: { acknowledged: false, inventoryItem: { restaurantId } },
        data: { acknowledged: true },
      })
      return NextResponse.json({ updated: res.count })
    }

    const { id, acknowledged } = body
    if (!id || typeof acknowledged !== 'boolean') {
      return NextResponse.json({ error: 'Missing alert id or acknowledged flag' }, { status: 400 })
    }
    const alert = await prisma.stockAlert.findFirst({ where: { id, inventoryItem: { restaurantId } } })
    if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 })

    const updated = await prisma.stockAlert.update({ where: { id }, data: { acknowledged } })
    return NextResponse.json(updated)
  } catch (error) {
    return fail(error, 'admin-alerts-put')
  }
}
