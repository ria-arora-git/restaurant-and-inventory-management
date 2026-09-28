export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'Token is required' }, { status: 400 })

    const table = await prisma.table.findUnique({ where: { token }, include: { restaurant: true } })
    if (!table) return NextResponse.json({ error: 'Invalid table token' }, { status: 404 })

    return NextResponse.json({
      id: table.id,
      number: table.number,
      capacity: table.capacity,
      restaurantName: table.restaurant.name,
    })
  } catch (error) {
    console.error('Error validating table token:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
