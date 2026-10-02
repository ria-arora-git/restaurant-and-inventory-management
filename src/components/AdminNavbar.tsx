'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton, OrganizationSwitcher, useOrganization } from '@clerk/nextjs'
import useSWR from 'swr'
import {
  AlertTriangle,
  BarChart3,
  ChefHat,
  Clock,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  ShieldCheck,
  Soup,
  Users,
  X,
} from 'lucide-react'
import { fetcher } from '@/lib/api'
import { BRAND } from '@/lib/brand'
import { roleFromClerk, type Role } from '@/lib/roles'

const navigation: { name: string; href: string; icon: typeof LayoutDashboard; badge?: 'orders' | 'alerts'; roles: Role[] }[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ['admin', 'manager', 'staff'] },
  { name: 'Orders', href: '/admin/active-orders', icon: Clock, badge: 'orders', roles: ['admin', 'manager', 'staff'] },
  { name: 'History', href: '/admin/order-history', icon: FileText, roles: ['admin', 'manager'] },
  { name: 'Menu', href: '/admin/menu-management', icon: ChefHat, roles: ['admin', 'manager'] },
  { name: 'Inventory', href: '/admin/inventory', icon: Package, roles: ['admin', 'manager', 'staff'] },
  { name: 'Recipes', href: '/admin/recipes', icon: Soup, roles: ['admin', 'manager'] },
  { name: 'Tables', href: '/admin/table-management', icon: Users, roles: ['admin', 'manager', 'staff'] },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, roles: ['admin', 'manager'] },
  { name: 'Alerts', href: '/admin/alerts', icon: AlertTriangle, badge: 'alerts', roles: ['admin', 'manager', 'staff'] },
  { name: 'Staff', href: '/admin/staff', icon: ShieldCheck, roles: ['admin'] },
]

export default function AdminNavbar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { membership } = useOrganization()
  const role = roleFromClerk(membership?.role)

  const { data: alerts } = useSWR<unknown[]>('/api/alerts', fetcher, { refreshInterval: 30000 })
  const { data: active } = useSWR<unknown[]>('/api/admin/active-orders', fetcher, { refreshInterval: 10000 })
  const counts = { alerts: alerts?.length ?? 0, orders: active?.length ?? 0 }

  useEffect(() => setOpen(false), [pathname])

  const isActive = (href: string) => (href === '/admin' ? pathname === href : pathname.startsWith(href))
  const items = navigation.filter((item) => item.roles.includes(role))

  return (
    <header className="no-print sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/admin" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-sm">
            <ChefHat className="h-5 w-5" />
          </span>
          <span className="hidden text-lg font-bold text-[var(--color-text-primary)] sm:block">{BRAND.name}</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-0.5 xl:flex">
          {items.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            const count = item.badge ? counts[item.badge] : 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
                {count > 0 && (
                  <span
                    className={`ml-0.5 rounded-full px-1.5 text-[11px] font-semibold leading-5 ${
                      item.badge === 'alerts'
                        ? 'bg-[var(--color-error)] text-white'
                        : active
                        ? 'bg-white/25 text-white'
                        : 'bg-[var(--color-primary)] text-white'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <OrganizationSwitcher
              hidePersonal
              afterSelectOrganizationUrl="/admin"
              afterCreateOrganizationUrl="/admin"
              appearance={{ elements: { organizationSwitcherTrigger: 'rounded-lg px-2 py-1.5' } }}
            />
          </div>
          <UserButton appearance={{ elements: { avatarBox: 'h-8 w-8' } }} />
          <button
            className="rounded-lg border border-[var(--color-border-secondary)] p-2 text-[var(--color-text-primary)] xl:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-[var(--color-border)] bg-[var(--color-surface)] xl:hidden">
          <div className="mx-auto max-h-[calc(100vh-4rem)] max-w-7xl space-y-1 overflow-y-auto px-3 py-3">
            {items.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              const count = item.badge ? counts[item.badge] : 0
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                    active
                      ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                      : 'text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                  {count > 0 && (
                    <span className="ml-auto rounded-full bg-[var(--color-error)] px-2 text-xs font-semibold text-white">{count}</span>
                  )}
                </Link>
              )
            })}
            <div className="border-t border-[var(--color-border)] px-1 pt-3 md:hidden">
              <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/admin" />
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
