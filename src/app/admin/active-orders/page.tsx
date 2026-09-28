'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import { CheckCircle2, ChefHat, Clock, Receipt, RefreshCw, Search, StickyNote, Users, X, Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState, ErrorState, GridSkeleton, PageHeader, StatCard } from '@/components/ui/Page'
import { api, fetcher } from '@/lib/api'
import { formatCurrency, formatTime, timeAgo } from '@/lib/format'
import { NEXT_STATUS, STATUS_META, type OrderStatus } from '@/lib/status'
import type { OrderRow } from '@/types'

const FILTERS: { key: 'ALL' | OrderStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY', label: 'Ready' },
  { key: 'SERVED', label: 'Awaiting payment' },
]

export default function ActiveOrdersPage() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<OrderRow[]>('/api/admin/active-orders', fetcher, {
    refreshInterval: 5000,
  })
  const [filter, setFilter] = useState<'ALL' | OrderStatus>('ALL')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<OrderRow | null>(null)

  const orders = data ?? []
  const counts = useMemo(() => {
    const c: Record<string, number> = { PENDING: 0, PREPARING: 0, READY: 0, SERVED: 0 }
    orders.forEach((o) => (c[o.status] = (c[o.status] ?? 0) + 1))
    return c
  }, [orders])

  const visible = orders.filter((o) => {
    if (filter !== 'ALL' && o.status !== filter) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      `table ${o.table.number}`.includes(q) ||
      String(o.table.number) === q
    )
  })

  async function setStatus(order: OrderRow, status: OrderStatus) {
    setBusyId(order.id)
    try {
      await api('/api/orders', 'PUT', { id: order.id, status })
      toast.success(
        status === 'CANCELLED' ? `${order.orderNumber} cancelled` : `${order.orderNumber} → ${STATUS_META[status].label.toLowerCase()}`
      )
      await mutate()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
      setCancelTarget(null)
    }
  }

  return (
    <>
      <PageHeader
        title="Live orders"
        description="Move orders through the kitchen. This board refreshes automatically."
        actions={
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        }
      />

      <div className="page space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Pending" value={counts.PENDING} icon={Clock} tone="warning" />
          <StatCard label="Preparing" value={counts.PREPARING} icon={ChefHat} tone="info" />
          <StatCard label="Ready to serve" value={counts.READY} icon={Bell} tone="success" />
          <StatCard label="Awaiting payment" value={counts.SERVED} icon={Receipt} tone="primary" />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white'
                    : 'border-[var(--color-border-secondary)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)]'
                }`}
              >
                {f.label}
                {f.key !== 'ALL' && <span className="ml-1.5 opacity-70">{counts[f.key] ?? 0}</span>}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input className="input pl-9" placeholder="Search order, table or name" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        {error && !data ? (
          <ErrorState message={error.message} onRetry={() => mutate()} />
        ) : isLoading ? (
          <GridSkeleton count={6} height="h-64" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={orders.length === 0 ? 'All caught up' : 'No orders match'}
            description={
              orders.length === 0
                ? 'New orders placed from table QR codes will show up here automatically.'
                : 'Try a different status filter or search term.'
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((order) => {
              const meta = STATUS_META[order.status]
              const next = NEXT_STATUS[order.status]
              const busy = busyId === order.id
              return (
                <Card key={order.id} className="flex flex-col overflow-hidden">
                  <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
                        <span className="text-[10px] uppercase leading-none opacity-80">Table</span>
                        <span className="text-lg font-bold leading-none">{order.table.number}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--color-text-primary)]">{order.orderNumber}</p>
                        <p className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                          <Users className="h-3 w-3" /> {order.customerName}
                        </p>
                      </div>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>

                  <div className="flex-1 space-y-3 p-4">
                    <ul className="space-y-1.5 text-sm">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-3">
                          <span className="text-[var(--color-text-primary)]">
                            <span className="font-semibold">{item.quantity}×</span> {item.menuItem.name}
                            {item.notes && <span className="block text-xs text-[var(--color-text-secondary)]">{item.notes}</span>}
                          </span>
                          <span className="text-[var(--color-text-secondary)]">{formatCurrency(item.quantity * item.price)}</span>
                        </li>
                      ))}
                    </ul>
                    {order.notes && (
                      <div className="flex gap-2 rounded-lg bg-[var(--color-warning-bg)] p-2.5 text-sm text-[var(--color-text-primary)]">
                        <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
                        {order.notes}
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-dashed border-[var(--color-border)] pt-3 text-sm">
                      <span className="text-[var(--color-text-secondary)]">
                        {formatTime(order.createdAt)} · {timeAgo(order.createdAt)}
                      </span>
                      <span className="text-lg font-bold text-[var(--color-text-primary)]">{formatCurrency(order.total)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-[var(--color-border)] bg-[var(--color-background-secondary)] p-3">
                    {next && (
                      <Button className="flex-1" size="sm" loading={busy} onClick={() => setStatus(order, next.to)}>
                        {next.label}
                      </Button>
                    )}
                    {order.status !== 'SERVED' && (
                      <Button variant="outline" size="sm" disabled={busy} onClick={() => setCancelTarget(order)} aria-label="Cancel order">
                        <X className="h-4 w-4" /> Cancel
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        title="Cancel this order?"
        confirmLabel="Cancel order"
        loading={busyId === cancelTarget?.id}
        message={
          cancelTarget && (
            <>
              <p>
                {cancelTarget.orderNumber} for table {cancelTarget.table.number} will be cancelled.
              </p>
              {cancelTarget.status === 'PENDING' ? (
                <p className="mt-2">Ingredients reserved for it will go back into inventory.</p>
              ) : (
                <p className="mt-2">Cooking has already started, so ingredients are not returned to stock.</p>
              )}
            </>
          )
        }
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelTarget && setStatus(cancelTarget, 'CANCELLED')}
      />
    </>
  )
}
