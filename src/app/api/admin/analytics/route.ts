export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { fail } from '@/lib/route'

const RANGES: Record<string, number> = { today: 1, '7d': 7, '30d': 30, '90d': 90 }

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function dayKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET(req: NextRequest) {
  try {
    const { restaurantId } = await getRestaurantContext()
    const rangeParam = req.nextUrl.searchParams.get('range') || '7d'
    const days = RANGES[rangeParam] ?? 7

    const now = new Date()
    const today = startOfDay(now)
    const rangeStart = new Date(today)
    rangeStart.setDate(rangeStart.getDate() - (days - 1))
    const prevStart = new Date(rangeStart)
    prevStart.setDate(prevStart.getDate() - days)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Everything since the start of the previous period (for period-over-period deltas).
    const orders = await prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: prevStart } },
      include: { items: { include: { menuItem: true } } },
    })
    const valid = orders.filter((o) => o.status !== 'CANCELLED')

    const inRange = valid.filter((o) => o.createdAt >= rangeStart)
    const inPrev = valid.filter((o) => o.createdAt < rangeStart)
    const sum = (list: typeof valid) => list.reduce((s, o) => s + o.total, 0)

    const todayOrders = valid.filter((o) => o.createdAt >= today)
    const yesterdayOrders = valid.filter((o) => o.createdAt >= yesterday && o.createdAt < today)

    // Daily series (zero-filled)
    const series = new Map<string, { date: string; revenue: number; orders: number }>()
    for (let i = 0; i < days; i++) {
      const d = new Date(rangeStart)
      d.setDate(d.getDate() + i)
      series.set(dayKey(d), { date: dayKey(d), revenue: 0, orders: 0 })
    }
    for (const o of inRange) {
      const s = series.get(dayKey(o.createdAt))
      if (s) {
        s.revenue += o.total
        s.orders += 1
      }
    }

    // Top selling items
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    for (const o of inRange) {
      for (const it of o.items) {
        const cur = itemMap.get(it.menuItemId) ?? { name: it.menuItem.name, quantity: 0, revenue: 0 }
        cur.quantity += it.quantity
        cur.revenue += it.quantity * it.price
        itemMap.set(it.menuItemId, cur)
      }
    }
    const topItems = [...itemMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8)

    // Orders by hour of day
    const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }))
    for (const o of inRange) hourly[o.createdAt.getHours()].orders += 1

    // Status breakdown for the selected range (cancelled included)
    const statusBreakdown: Record<string, number> = {}
    for (const o of orders.filter((o) => o.createdAt >= rangeStart)) {
      statusBreakdown[o.status] = (statusBreakdown[o.status] ?? 0) + 1
    }

    const [inventory, activeOrdersCount, totalMenuItems, totalInventoryItems, totalTables] = await Promise.all([
      prisma.inventoryItem.findMany({ where: { restaurantId }, select: { name: true, quantity: true, minStock: true, unit: true } }),
      prisma.order.count({ where: { restaurantId, status: { notIn: ['PAID', 'CANCELLED'] } } }),
      prisma.menuItem.count({ where: { restaurantId } }),
      prisma.inventoryItem.count({ where: { restaurantId } }),
      prisma.table.count({ where: { restaurantId } }),
    ])
    const lowStock = inventory.filter((i) => i.quantity <= i.minStock)

    const revenue = sum(inRange)
    const prevRevenue = sum(inPrev)
    const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0)

    return NextResponse.json({
      range: rangeParam,
      days,
      // Headline numbers used by the dashboard
      todayOrders: todayOrders.length,
      todayRevenue: sum(todayOrders),
      todayOrdersChange: pct(todayOrders.length, yesterdayOrders.length),
      todayRevenueChange: pct(sum(todayOrders), sum(yesterdayOrders)),
      activeOrdersCount,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock.slice(0, 5),
      totalMenuItems,
      totalInventoryItems,
      totalTables,
      // Selected-range analytics
      revenue,
      revenueChange: pct(revenue, prevRevenue),
      orders: inRange.length,
      ordersChange: pct(inRange.length, inPrev.length),
      averageOrderValue: inRange.length ? revenue / inRange.length : 0,
      itemsSold: inRange.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0),
      daily: [...series.values()],
      topItems,
      hourly,
      statusBreakdown,
    })
  } catch (error) {
    return fail(error, 'analytics')
  }
}
