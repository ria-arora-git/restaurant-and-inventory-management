'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import { ChevronLeft, ChevronRight, Download, FileText, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/Page'
import { fetcher } from '@/lib/api'
import { exportOrders } from '@/lib/export'
import { formatCurrency, formatDateTime } from '@/lib/format'
import { STATUS_META } from '@/lib/status'
import type { OrderRow } from '@/types'

const PAGE_SIZE = 12

export default function OrderHistoryPage() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<OrderRow[]>('/api/admin/order-history', fetcher, {
    revalidateOnFocus: true,
  })
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<OrderRow | null>(null)
  const [exporting, setExporting] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const fromT = from ? new Date(from + 'T00:00:00').getTime() : null
    const toT = to ? new Date(to + 'T23:59:59.999').getTime() : null
    return (data ?? []).filter((o) => {
      if (status !== 'ALL' && o.status !== status) return false
      const t = new Date(o.createdAt).getTime()
      if (fromT && t < fromT) return false
      if (toT && t > toT) return false
      if (!q) return true
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        String(o.table.number) === q ||
        o.items.some((i) => i.menuItem.name.toLowerCase().includes(q))
      )
    })
  }, [data, query, status, from, to])

  useEffect(() => setPage(1), [query, status, from, to])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const revenue = filtered.filter((o) => o.status !== 'CANCELLED').reduce((s, o) => s + o.total, 0)

  async function handleExport() {
    if (filtered.length === 0) return toast.error('Nothing to export')
    setExporting(true)
    try {
      await exportOrders(filtered)
      toast.success(`Exported ${filtered.length} orders`)
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const hasFilters = query || status !== 'ALL' || from || to

  return (
    <>
      <PageHeader
        title="Order history"
        description="Search every order and export it to Excel."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button size="sm" onClick={handleExport} loading={exporting}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </>
        }
      />

      <div className="page space-y-6">
        <Card className="p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input className="input pl-9" placeholder="Order #, customer, table or dish" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              <option value="ALL">All statuses</option>
              {Object.entries(STATUS_META).map(([k, m]) => (
                <option key={k} value={k}>{m.label}</option>
              ))}
            </select>
            <input type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
            <input type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--color-text-secondary)]">
            <span>
              <strong className="text-[var(--color-text-primary)]">{filtered.length}</strong> orders ·{' '}
              <strong className="text-[var(--color-text-primary)]">{formatCurrency(revenue)}</strong> revenue (excl. cancelled)
            </span>
            {hasFilters && (
              <button className="font-medium text-[var(--color-primary)] hover:underline" onClick={() => { setQuery(''); setStatus('ALL'); setFrom(''); setTo('') }}>
                Clear filters
              </button>
            )}
          </div>
        </Card>

        {error && !data ? (
          <ErrorState message={error.message} onRetry={() => mutate()} />
        ) : isLoading ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} title={data?.length ? 'No orders match your filters' : 'No orders yet'} description={data?.length ? undefined : 'Orders will be listed here once customers start ordering.'} />
        ) : (
          <>
            <Card className="overflow-hidden">
              <div className="thin-scroll overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-[var(--color-background-secondary)] text-left text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                    <tr>
                      <th className="px-5 py-3 font-medium">Order</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Table</th>
                      <th className="px-5 py-3 font-medium">Items</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {rows.map((o) => (
                      <tr key={o.id} className="cursor-pointer transition-colors hover:bg-[var(--color-background-secondary)]" onClick={() => setSelected(o)}>
                        <td className="px-5 py-3.5 font-medium text-[var(--color-text-primary)]">{o.orderNumber}</td>
                        <td className="px-5 py-3.5 text-[var(--color-text-secondary)]">{formatDateTime(o.createdAt)}</td>
                        <td className="px-5 py-3.5">Table {o.table.number}</td>
                        <td className="max-w-[240px] truncate px-5 py-3.5 text-[var(--color-text-secondary)]">
                          {o.items.map((i) => `${i.quantity}× ${i.menuItem.name}`).join(', ')}
                        </td>
                        <td className="px-5 py-3.5"><Badge tone={STATUS_META[o.status].tone}>{STATUS_META[o.status].label}</Badge></td>
                        <td className="px-5 py-3.5 text-right font-semibold">{formatCurrency(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {pages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--color-text-secondary)]">Page {page} of {pages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Prev</Button>
                  <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.orderNumber ?? ''}
        description={selected ? `Table ${selected.table.number} · ${formatDateTime(selected.createdAt)}` : undefined}
        footer={<Button variant="outline" onClick={() => setSelected(null)}>Close</Button>}
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Status</span>
              <Badge tone={STATUS_META[selected.status].tone}>{STATUS_META[selected.status].label}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-secondary)]">Customer</span>
              <span className="font-medium">{selected.customerName}{selected.customerPhone ? ` · ${selected.customerPhone}` : ''}</span>
            </div>
            <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
              {selected.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 px-3 py-2.5">
                  <span>{i.quantity}× {i.menuItem.name}{i.notes && <span className="block text-xs text-[var(--color-text-secondary)]">{i.notes}</span>}</span>
                  <span>{formatCurrency(i.quantity * i.price)}</span>
                </li>
              ))}
            </ul>
            {selected.notes && <p className="rounded-lg bg-[var(--color-background-secondary)] p-3 text-[var(--color-text-secondary)]">Note: {selected.notes}</p>}
            <div className="flex justify-between border-t border-[var(--color-border)] pt-3 text-base font-bold">
              <span>Total</span>
              <span>{formatCurrency(selected.total)}</span>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
