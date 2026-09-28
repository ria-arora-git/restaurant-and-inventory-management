'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useOrganization } from '@clerk/nextjs'
import {
  AlertTriangle,
  ArrowRight,
  ChefHat,
  Clock,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingCart,
  Users,
  BarChart3,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ErrorState, PageHeader, StatCard } from '@/components/ui/Page'
import { fetcher } from '@/lib/api'
import { formatCurrency, formatTime, timeAgo } from '@/lib/format'
import { STATUS_META } from '@/lib/status'
import type { OrderRow, StockAlert } from '@/types'

interface Analytics {
  todayOrders: number
  todayRevenue: number
  todayOrdersChange: number
  todayRevenueChange: number
  activeOrdersCount: number
  lowStockCount: number
  totalMenuItems: number
  totalInventoryItems: number
  totalTables: number
}

function Delta({ value }: { value: number }) {
  const up = value >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${up ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
      <Icon className="h-3.5 w-3.5" />
      {up ? '+' : ''}
      {value.toFixed(0)}% vs yesterday
    </span>
  )
}

export default function AdminDashboard() {
  const { organization } = useOrganization()
  const a = useSWR<Analytics>('/api/admin/analytics?range=today', fetcher, { refreshInterval: 30000 })
  const o = useSWR<OrderRow[]>('/api/admin/active-orders', fetcher, { refreshInterval: 8000 })
  const al = useSWR<StockAlert[]>('/api/alerts', fetcher, { refreshInterval: 30000 })

  const refresh = () => Promise.all([a.mutate(), o.mutate(), al.mutate()])

  if (a.error && !a.data) return <div className="page"><ErrorState message={a.error.message} onRetry={refresh} /></div>

  const stats = a.data
  const orders = o.data ?? []
  const alerts = al.data ?? []

  return (
    <>
      <PageHeader
        title={`${organization?.name ?? 'Your restaurant'}`}
        description="Here is what is happening in your restaurant today."
        actions={
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      <div className="page space-y-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {!stats ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[112px]" />)
          ) : (
            <>
              <Link href="/admin/order-history">
                <StatCard label="Today's orders" value={stats.todayOrders} icon={ShoppingCart} hint={undefined} />
                <div className="-mt-1 px-5 pb-1"><Delta value={stats.todayOrdersChange} /></div>
              </Link>
              <Link href="/admin/analytics">
                <StatCard label="Today's revenue" value={formatCurrency(stats.todayRevenue)} icon={DollarSign} tone="success" />
                <div className="-mt-1 px-5 pb-1"><Delta value={stats.todayRevenueChange} /></div>
              </Link>
              <Link href="/admin/active-orders">
                <StatCard
                  label="Active orders"
                  value={stats.activeOrdersCount}
                  icon={Clock}
                  tone="info"
                  hint={stats.activeOrdersCount === 0 ? 'Kitchen is clear' : 'Waiting on the kitchen or table'}
                />
              </Link>
              <Link href="/admin/inventory">
                <StatCard
                  label="Low stock items"
                  value={stats.lowStockCount}
                  icon={AlertTriangle}
                  tone={stats.lowStockCount > 0 ? 'warning' : 'success'}
                  hint={stats.lowStockCount > 0 ? 'Needs restocking' : 'Everything is stocked'}
                />
              </Link>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Live orders</CardTitle>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{orders.length} waiting</p>
              </div>
              <Link href="/admin/active-orders">
                <Button variant="outline" size="sm">Open board <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {!o.data ? (
                <div className="space-y-3 p-6">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div>
              ) : orders.length === 0 ? (
                <div className="px-6 pb-10 pt-4 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[var(--color-success)]" />
                  <p className="font-medium text-[var(--color-text-primary)]">No open orders</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">New orders from table QR codes appear here instantly.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {orders.slice(0, 6).map((order) => {
                    const meta = STATUS_META[order.status]
                    return (
                      <li key={order.id}>
                        <Link href="/admin/active-orders" className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[var(--color-background-secondary)]">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-background-tertiary)] text-sm font-bold text-[var(--color-text-primary)]">
                            T{order.table.number}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-[var(--color-text-primary)]">
                              {order.items.reduce((s, i) => s + i.quantity, 0)} items · {order.orderNumber}
                            </p>
                            <p className="text-xs text-[var(--color-text-secondary)]">{timeAgo(order.createdAt)} · {formatTime(order.createdAt)}</p>
                          </div>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          <span className="w-20 text-right font-semibold text-[var(--color-text-primary)]">{formatCurrency(order.total)}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">Stock alerts</CardTitle>
                <Link href="/admin/alerts" className="text-sm font-medium text-[var(--color-primary)] hover:underline">View all</Link>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" /> All ingredients are above minimum levels.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {alerts.slice(0, 4).map((alert) => (
                      <li key={alert.id} className="flex items-start gap-2.5 rounded-lg border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
                        <span className="text-[var(--color-text-primary)]">{alert.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Your restaurant</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'Dishes', value: stats?.totalMenuItems, href: '/admin/menu-management', icon: ChefHat },
                    { label: 'Ingredients', value: stats?.totalInventoryItems, href: '/admin/inventory', icon: Package },
                    { label: 'Tables', value: stats?.totalTables, href: '/admin/table-management', icon: Users },
                  ].map((s) => (
                    <Link key={s.label} href={s.href} className="rounded-lg bg-[var(--color-background-secondary)] p-3 transition-colors hover:bg-[var(--color-background-tertiary)]">
                      <s.icon className="mx-auto mb-1 h-4 w-4 text-[var(--color-primary)]" />
                      <p className="text-lg font-bold text-[var(--color-text-primary)]">{s.value ?? '–'}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{s.label}</p>
                    </Link>
                  ))}
                </div>
                <Link href="/admin/analytics">
                  <Button variant="outline" className="w-full"><BarChart3 className="h-4 w-4" /> View analytics</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
