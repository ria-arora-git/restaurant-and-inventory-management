export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { fail, toNumber } from '@/lib/route'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await getRestaurantContext()
    const existing = await prisma.menuItem.findFirst({ where: { id: params.id, restaurantId } })
    if (!existing) return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })

    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const description = String(body.description ?? '').trim()
    const category = String(body.category ?? '').trim()
    const price = toNumber(body.price)
    const prepTime = toNumber(body.prepTime)
    const image = typeof body.image === 'string' && body.image.trim() ? body.image.trim() : null

    if (!name || !category || price === null) {
      return NextResponse.json({ error: 'Name, category and price are required' }, { status: 400 })
    }
    if (price < 0) return NextResponse.json({ error: 'Price cannot be negative' }, { status: 400 })

    const updated = await prisma.menuItem.update({
      where: { id: params.id },
      data: {
        name,
        description,
        category,
        price,
        prepTime: prepTime === null ? null : Math.round(prepTime),
        image,
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    return fail(error, 'menu-put')
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { restaurantId } = await getRestaurantContext()
    const existing = await prisma.menuItem.findFirst({ where: { id: params.id, restaurantId } })
    if (!existing) return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })

    const active = await prisma.orderItem.count({
      where: { menuItemId: params.id, order: { status: { notIn: ['PAID', 'CANCELLED'] } } },
    })
    if (active > 0) {
      return NextResponse.json(
        { error: 'This dish is part of an active order. Finish or cancel those orders first.' },
        { status: 409 }
      )
    }

    const past = await prisma.orderItem.count({ where: { menuItemId: params.id } })
    if (past > 0) {
      return NextResponse.json(
        { error: 'This dish appears in past orders, so it is kept for your order history and analytics.' },
        { status: 409 }
      )
    }

    await prisma.$transaction([
      prisma.menuItemIngredient.deleteMany({ where: { menuItemId: params.id } }),
      prisma.menuItem.delete({ where: { id: params.id } }),
    ])
    return NextResponse.json({ success: true })
  } catch (error) {
    return fail(error, 'menu-delete')
  }
}
