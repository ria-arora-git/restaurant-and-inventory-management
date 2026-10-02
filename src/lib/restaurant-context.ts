import { auth, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { roleFromClerk } from '@/lib/roles'

async function organizationName(orgId: string): Promise<string | null> {
  try {
    const client = await clerkClient()
    const org = await client.organizations.getOrganization({ organizationId: orgId })
    return org.name || null
  } catch {
    return null
  }
}

export async function getRestaurantContext() {
  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId) {
    throw new Error('Unauthorized: No user or organization context')
  }

  const placeholder = `Restaurant ${orgId.slice(-6)}`
  let restaurant = await prisma.restaurant.findUnique({ where: { clerkOrgId: orgId } })

  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: { name: (await organizationName(orgId)) ?? placeholder, clerkOrgId: orgId },
    })
  } else if (restaurant.name === placeholder) {
    // Older rows were created with a placeholder name – adopt the real organization name.
    const name = await organizationName(orgId)
    if (name) restaurant = await prisma.restaurant.update({ where: { id: restaurant.id }, data: { name } })
  }

  return { userId, orgId, restaurantId: restaurant.id, restaurant, role: roleFromClerk(orgRole) }
}

export async function getPublicRestaurantByTableToken(token: string) {
  const table = await prisma.table.findUnique({ where: { token }, include: { restaurant: true } })
  if (!table) throw new Error('Invalid table token')
  return { table, restaurant: table.restaurant, restaurantId: table.restaurantId }
}
