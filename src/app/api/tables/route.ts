export const dynamic = 'force-dynamic'

import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { fail, toNumber } from '@/lib/route'
import { assertRole } from '@/lib/roles'

const newToken = () => randomBytes(9).toString('base64url')

export async function GET() {
  try {
    const { restaurantId } = await getRestaurantContext()
    const tables = await prisma.table.findMany({
      where: { restaurantId },
      orderBy: { number: 'asc' },
      include: {
        orders: {
          where: { status: { notIn: ['PAID', 'CANCELLED'] } },
          select: { id: true, total: true, status: true, createdAt: true },
        },
      },
    })
    return NextResponse.json(tables)
  } catch (error) {
    return fail(error, 'tables-get')
  }
}

export async function POST(req: NextRequest) {
  try {
    const { restaurantId, role } = await getRestaurantContext()
    assertRole(role, ['admin', 'manager'])
    const body = await req.json()
    const number = toNumber(body.number)
    const capacity = toNumber(body.capacity)

    if (number === null || !Number.isInteger(number) || number < 1) {
      return NextResponse.json({ error: 'Table number must be a whole number of 1 or more' }, { status: 400 })
    }
    if (capacity === null || !Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
      return NextResponse.json({ error: 'Capacity must be between 1 and 50' }, { status: 400 })
    }

    const existing = await prisma.table.findFirst({ where: { number, restaurantId } })
    if (existing) return NextResponse.json({ error: `Table ${number} already exists` }, { status: 409 })

    const table = await prisma.table.create({
      data: { number, capacity, status: 'AVAILABLE', token: newToken(), restaurantId },
    })
    return NextResponse.json(table, { status: 201 })
  } catch (error) {
    return fail(error, 'tables-post')
  }
}

// { id, number?, capacity?, regenerateToken? }
export async function PUT(req: NextRequest) {
  try {
    const { restaurantId, role } = await getRestaurantContext()
    assertRole(role, ['admin', 'manager'])
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'Missing table id' }, { status: 400 })

    const table = await prisma.table.findFirst({ where: { id: body.id, restaurantId } })
    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 })

    const data: { number?: number; capacity?: number; token?: string } = {}

    if (body.number !== undefined) {
      const number = toNumber(body.number)
      if (number === null || !Number.isInteger(number) || number < 1) {
        return NextResponse.json({ error: 'Table number must be a whole number of 1 or more' }, { status: 400 })
      }
      const clash = await prisma.table.findFirst({ where: { restaurantId, number, id: { not: table.id } } })
      if (clash) return NextResponse.json({ error: `Table ${number} already exists` }, { status: 409 })
      data.number = number
    }
    if (body.capacity !== undefined) {
      const capacity = toNumber(body.capacity)
      if (capacity === null || !Number.isInteger(capacity) || capacity < 1 || capacity > 50) {
        return NextResponse.json({ error: 'Capacity must be between 1 and 50' }, { status: 400 })
      }
      data.capacity = capacity
    }
    if (body.regenerateToken === true) data.token = newToken()

    const updated = await prisma.table.update({ where: { id: table.id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    return fail(error, 'tables-put')
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { restaurantId, role } = await getRestaurantContext()
    assertRole(role, ['admin', 'manager'])
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing table id' }, { status: 400 })

    const table = await prisma.table.findFirst({ where: { id, restaurantId } })
    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 })

    const active = await prisma.order.count({
      where: { tableId: id, status: { notIn: ['PAID', 'CANCELLED'] } },
    })
    if (active > 0) {
      return NextResponse.json({ error: 'This table has active orders. Complete them first.' }, { status: 409 })
    }

    const history = await prisma.order.count({ where: { tableId: id } })
    if (history > 0) {
      return NextResponse.json(
        { error: 'This table has order history, so it is kept for your records. Change its number or capacity instead.' },
        { status: 409 }
      )
    }

    await prisma.$transaction([
      prisma.tableSession.deleteMany({ where: { tableId: id } }),
      prisma.table.delete({ where: { id } }),
    ])
    return NextResponse.json({ success: true })
  } catch (error) {
    return fail(error, 'tables-delete')
  }
}
