'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { BarChart3, DollarSign, Receipt, RefreshCw, ShoppingBag, TrendingDown, TrendingUp, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/Page'
import { fetcher } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { STATUS_META, type OrderStatus } from '@/lib/status'

interface Analytics {
  days: number
  revenue: number
  revenueChange: number
  orders: number
  ordersChange: number
  averageOrderValue: number
  itemsSold: number
  daily: { date: string; revenue: number; orders: number }[]
  topItems: { name: string; quantity: number; revenue: number }[]
  hourly: { hour: number; orders: number }[]
  statusBreakdown: Record<string, number>
}

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
]

function Change({ value }: { value: number }) {
  const up = value >= 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${up ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
      <Icon className="h-3.5 w-3.5" /> {up ? '+' : ''}{value.toFixed(0)}% vs previous period
    </span>
  )
}

function Kpi({ label, value, icon: Icon, change }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; change?: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-[var(--color-text-primary)] lg:text-3xl">{value}</p>
          {change !== undefined && <div className="mt-1"><Change value={change} /></div>}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-info-bg)] text-[var(--color-primary)]"><Icon className="h-5 w-5" /></div>
      </div>
    </Card>
  )
}

function RevenueChart({ data }: { data: Analytics['daily'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((d) => d.revenue))
  const W = 720, H = 240, pad = { l: 8, r: 8, t: 16, b: 28 }
  const bw = (W - pad.l - pad.r) / data.length
  const label = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const step = Math.ceil(data.length / 8)
  const h = hover !== null ? data[hover] : null

  return (
    <div>
      <div className="mb-2 h-6 text-sm text-[var(--color-text-secondary)]">
        {h ? <><strong className="text-[var(--color-text-primary)]">{label(h.date)}</strong> · {formatCurrency(h.revenue)} · {h.orders} order{h.orders !== 1 ? 's' : ''}</> : 'Hover a bar for details'}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Revenue by day">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + (H - pad.t - pad.b) * (1 - f)} y2={pad.t + (H - pad.t - pad.b) * (1 - f)} stroke="var(--color-border)" strokeDasharray="3 4" />
        ))}
        {data.map((d, i) => {
          const bh = ((H - pad.t - pad.b) * d.revenue) / max
          const x = pad.l + i * bw
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onTouchStart={() => setHover(i)}>
              <rect x={x} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              <rect x={x + bw * 0.15} y={H - pad.b - bh} width={bw * 0.7} height={Math.max(bh, d.revenue > 0 ? 2 : 0)} rx={3}
                fill="var(--color-primary)" opacity={hover === null || hover === i ? 1 : 0.35} />
              {i % step === 0 && <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-text-secondary)">{label(d.date)}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function AnalyticsPage() {
  const [range, setRange] = useState('7d')
  const { data, error, isLoading, mutate, isValidating } = useSWR<Analytics>(`/api/admin/analytics?range=${range}`, fetcher, { refreshInterval: 60000 })

  const maxTop = Math.max(1, ...(data?.topItems.map((i) => i.quantity) ?? [1]))
  const peak = data ? data.hourly.reduce((a, b) => (b.orders > a.orders ? b : a), data.hourly[0]) : null
  const maxHour = Math.max(1, ...(data?.hourly.map((h) => h.orders) ?? [1]))
  const statusTotal = data ? Object.values(data.statusBreakdown).reduce((a, b) => a + b, 0) : 0

  return (
    <>
      <PageHeader title="Analytics" description="Sales, best sellers and busy hours."
        actions={
          <>
            <div className="flex rounded-lg border border-[var(--color-border-secondary)] bg-[var(--color-surface)] p-0.5">
              {RANGES.map((r) => (
                <button key={r.key} onClick={() => setRange(r.key)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${range === r.key ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => mutate()}><RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} /></Button>
          </>
        } />

      <div className="page space-y-6">
        {error && !data ? <ErrorState message={error.message} onRetry={() => mutate()} />
        : isLoading || !data ? (
          <div className="space-y-6"><div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map((i) => <div key={i} className="skeleton h-28" />)}</div><div className="skeleton h-72" /></div>
        ) : data.orders === 0 ? (
          <EmptyState icon={BarChart3} title="No sales in this period" description="Once orders come in, you will see revenue trends, best sellers and peak hours here." />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Revenue" value={formatCurrency(data.revenue)} icon={DollarSign} change={data.revenueChange} />
              <Kpi label="Orders" value={String(data.orders)} icon={Receipt} change={data.ordersChange} />
              <Kpi label="Avg. order value" value={formatCurrency(data.averageOrderValue)} icon={ShoppingBag} />
              <Kpi label="Items sold" value={String(data.itemsSold)} icon={Utensils} />
            </div>

            <Card>
              <CardHeader><CardTitle className="text-lg">Revenue by day</CardTitle></CardHeader>
              <CardContent><RevenueChart data={data.daily} /></CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-lg">Best sellers</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {data.topItems.map((item, i) => (
                    <div key={item.name}>
                      <div className="mb-1 flex justify-between gap-3 text-sm">
                        <span className="truncate font-medium text-[var(--color-text-primary)]">{i + 1}. {item.name}</span>
                        <span className="shrink-0 text-[var(--color-text-secondary)]">{item.quantity} sold · {formatCurrency(item.revenue)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-background-tertiary)]">
                        <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${(item.quantity / maxTop) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Busiest hours</CardTitle>
                    {peak && peak.orders > 0 && <p className="text-sm text-[var(--color-text-secondary)]">Peak at {String(peak.hour).padStart(2, '0')}:00 with {peak.orders} orders</p>}
                  </CardHeader>
                  <CardContent>
                    <div className="flex h-28 items-end gap-[3px]" role="img" aria-label="Orders by hour">
                      {data.hourly.map((h) => (
                        <div key={h.hour} className="group relative flex-1" title={`${String(h.hour).padStart(2, '0')}:00 – ${h.orders} orders`}>
                          <div className="w-full rounded-t bg-[var(--color-primary)] transition-opacity group-hover:opacity-70" style={{ height: `${Math.max(h.orders ? 6 : 2, (h.orders / maxHour) * 100)}%`, opacity: h.orders ? 1 : 0.2 }} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-[var(--color-text-muted)]"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-lg">Order outcomes</CardTitle></CardHeader>
                  <CardContent className="space-y-2.5">
                    {Object.entries(data.statusBreakdown).map(([status, count]) => {
                      const meta = STATUS_META[status as OrderStatus]
                      return (
                        <div key={status} className="flex items-center gap-3 text-sm">
                          <span className="w-24 text-[var(--color-text-secondary)]">{meta?.label ?? status}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-background-tertiary)]">
                            <div className="h-full rounded-full" style={{ width: `${(count / statusTotal) * 100}%`, background: `var(--color-${meta?.tone === 'neutral' ? 'primary' : meta?.tone ?? 'primary'})` }} />
                          </div>
                          <span className="w-8 text-right font-medium">{count}</span>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
