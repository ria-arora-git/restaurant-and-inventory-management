export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRestaurantContext, getPublicRestaurantByTableToken } from '@/lib/restaurant-context'
import { fail, toNumber } from '@/lib/route'

export async function GET(req: NextRequest) {
  try {
    const tableToken = req.nextUrl.searchParams.get('tableToken')
    let restaurantId: string
    let isPublic = false

    if (tableToken) {
      try {
        restaurantId = (await getPublicRestaurantByTableToken(tableToken)).restaurantId
        isPublic = true
      } catch {
        return NextResponse.json({ error: 'Invalid table token' }, { status: 404 })
      }
    } else {
      restaurantId = (await getRestaurantContext()).restaurantId
    }

    const items = await prisma.menuItem.findMany({
      where: { restaurantId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: { ingredients: { include: { inventoryItem: true } } },
    })

    const result = items.map((item) => {
      // A dish is "available" while every ingredient has enough stock for one serving.
      const available = item.ingredients.every((ing) => ing.inventoryItem.quantity >= ing.quantity)
      if (isPublic) {
        const { ingredients: _omit, ...rest } = item
        return { ...rest, available }
      }
      return { ...item, available }
    })
    return NextResponse.json(result)
  } catch (error) {
    return fail(error, 'menu-get')
  }
}

export async function POST(req: NextRequest) {
  try {
    const { restaurantId } = await getRestaurantContext()
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
    if (prepTime !== null && prepTime < 0) {
      return NextResponse.json({ error: 'Prep time cannot be negative' }, { status: 400 })
    }

    const item = await prisma.menuItem.create({
      data: {
        name,
        description,
        category,
        price,
        prepTime: prepTime === null ? null : Math.round(prepTime),
        image,
        restaurantId,
      },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return fail(error, 'menu-post')
  }
}
