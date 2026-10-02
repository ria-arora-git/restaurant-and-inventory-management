import { HttpError } from '@/lib/route'

/**
 * Roles map onto Clerk organization roles:
 *  - org:admin   -> Owner   (Clerk's default "creator" role)
 *  - org:manager -> Manager (custom role — create once in the Clerk Dashboard)
 *  - org:staff   -> Staff   (custom role — create once in the Clerk Dashboard)
 *
 * See README.md "Staff roles" for the one-time Clerk setup.
 */
export type Role = 'admin' | 'manager' | 'staff'

const ROLE_BY_CLERK_KEY: Record<string, Role> = {
  'org:admin': 'admin',
  'org:manager': 'manager',
  'org:staff': 'staff',
}

export function roleFromClerk(orgRole: string | null | undefined): Role {
  if (!orgRole) return 'staff'
  return ROLE_BY_CLERK_KEY[orgRole] ?? 'staff'
}

export const ROLE_LABEL: Record<Role, string> = { admin: 'Owner', manager: 'Manager', staff: 'Staff' }

export function assertRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) {
    throw new HttpError(403, `This action needs the ${allowed.map((r) => ROLE_LABEL[r]).join(' or ')} role.`)
  }
}
