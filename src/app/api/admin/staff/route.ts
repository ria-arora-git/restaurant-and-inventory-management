export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getRestaurantContext } from '@/lib/restaurant-context'
import { assertRole, ROLE_LABEL, type Role } from '@/lib/roles'
import { fail, HttpError } from '@/lib/route'

const ROLE_TO_CLERK: Record<Exclude<Role, 'admin'>, string> = { manager: 'org:manager', staff: 'org:staff' }

// List current members + pending invitations. Owner-only (staff/roster is sensitive).
export async function GET() {
  try {
    const { orgId, role } = await getRestaurantContext()
    assertRole(role, ['admin'])
    const client = await clerkClient()

    const [memberships, invitations] = await Promise.all([
      client.organizations.getOrganizationMembershipList({ organizationId: orgId, limit: 100 }),
      client.organizations.getOrganizationInvitationList({ organizationId: orgId, status: ['pending'], limit: 100 }),
    ])

    const members = memberships.data.map((m) => ({
      id: m.id,
      role: m.role,
      name: [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(' ') || null,
      email: m.publicUserData?.identifier ?? null,
      userId: m.publicUserData?.userId ?? null,
      createdAt: m.createdAt,
    }))
    const pending = invitations.data.map((i) => ({ id: i.id, email: i.emailAddress, role: i.role, createdAt: i.createdAt }))

    return NextResponse.json({ members, pending })
  } catch (error) {
    return fail(error, 'staff-get')
  }
}

// { email, role: 'manager' | 'staff' } — invite a new staff member.
export async function POST(req: NextRequest) {
  try {
    const { orgId, userId, role } = await getRestaurantContext()
    assertRole(role, ['admin'])
    const body = await req.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const newRole = body.role as Role

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
    }
    if (newRole !== 'manager' && newRole !== 'staff') {
      return NextResponse.json({ error: 'Choose the Manager or Staff role' }, { status: 400 })
    }

    const client = await clerkClient()
    try {
      const invitation = await client.organizations.createOrganizationInvitation({
        organizationId: orgId,
        emailAddress: email,
        role: ROLE_TO_CLERK[newRole],
        inviterUserId: userId,
      })
      return NextResponse.json(invitation, { status: 201 })
    } catch (e: any) {
      const message: string = e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || ''
      if (/already a member|already exists|pending invitation/i.test(message)) {
        throw new HttpError(409, 'That person is already a member or has a pending invitation.')
      }
      if (/not found|role/i.test(message)) {
        throw new HttpError(
          400,
          'The Manager/Staff roles are not set up for this organization yet. Create them once in the Clerk Dashboard (see README) and try again.'
        )
      }
      throw new HttpError(400, message || 'Could not send the invitation.')
    }
  } catch (error) {
    return fail(error, 'staff-post')
  }
}

// { membershipId, role } — change an existing member's role.
export async function PUT(req: NextRequest) {
  try {
    const { orgId, role } = await getRestaurantContext()
    assertRole(role, ['admin'])
    const { membershipId, role: newRole } = await req.json()
    if (!membershipId || (newRole !== 'manager' && newRole !== 'staff' && newRole !== 'admin')) {
      return NextResponse.json({ error: 'Missing member or invalid role' }, { status: 400 })
    }
    const client = await clerkClient()
    const clerkRole = newRole === 'admin' ? 'org:admin' : ROLE_TO_CLERK[newRole as Exclude<Role, 'admin'>]
    const updated = await client.organizations.updateOrganizationMembership({
      organizationId: orgId,
      userId: membershipId, // Clerk accepts either the membership's userId here
      role: clerkRole,
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    return fail(error, 'staff-put')
  }
}

// ?membershipId=  or  ?invitationId=  — remove a member or revoke a pending invite.
export async function DELETE(req: NextRequest) {
  try {
    const { orgId, userId, role } = await getRestaurantContext()
    assertRole(role, ['admin'])
    const client = await clerkClient()

    const invitationId = req.nextUrl.searchParams.get('invitationId')
    if (invitationId) {
      await client.organizations.revokeOrganizationInvitation({ organizationId: orgId, invitationId, requestingUserId: userId })
      return NextResponse.json({ success: true })
    }

    const membershipUserId = req.nextUrl.searchParams.get('membershipId')
    if (!membershipUserId) return NextResponse.json({ error: 'Missing member or invitation id' }, { status: 400 })
    if (membershipUserId === userId) return NextResponse.json({ error: 'You cannot remove yourself.' }, { status: 400 })

    await client.organizations.deleteOrganizationMembership({ organizationId: orgId, userId: membershipUserId })
    return NextResponse.json({ success: true })
  } catch (error) {
    return fail(error, 'staff-delete')
  }
}
