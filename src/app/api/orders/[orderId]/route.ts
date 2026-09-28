export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { fail } from '@/lib/route'

// Two ways in:
//  - ?token=<table token>  → public, limited view for the customer who ordered
//  - signed-in admin       → full order for their own restaurant
export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    const include = { items: { include: { menuItem: true } }, table: true } as const

    if (token) {
      const order = await prisma.order.findFirst({
        where: { id: params.orderId, table: { token } },
        include,
      })
      if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      return NextResponse.json({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        tableNumber: order.table.number,
        items: order.items.map((i) => ({
          id: i.id,
          name: i.menuItem.name,
          quantity: i.quantity,
          price: i.price,
        })),
      })
    }

    const { restaurantId } = await getRestaurantContext()
    const order = await prisma.order.findFirst({ where: { id: params.orderId, restaurantId }, include })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    return NextResponse.json(order)
  } catch (error) {
    return fail(error, 'order-get')
  }
}
