'use client'

import { useState } from 'react'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { AlertTriangle, BellOff, CheckCheck, CheckCircle2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/Page'
import { api, fetcher } from '@/lib/api'
import { formatDateTime, formatNumber, timeAgo } from '@/lib/format'
import type { StockAlert } from '@/types'
import { useSWRConfig } from 'swr'

export default function AlertsPage() {
  const { data, error, isLoading, mutate } = useSWR<StockAlert[]>('/api/admin/alerts', fetcher, { refreshInterval: 20000 })
  const { mutate: globalMutate } = useSWRConfig()
  const [tab, setTab] = useState<'open' | 'resolved'>('open')
  const [busy, setBusy] = useState<string | null>(null)

  const alerts = data ?? []
  const open = alerts.filter((a) => !a.acknowledged)
  const resolved = alerts.filter((a) => a.acknowledged)
  const list = tab === 'open' ? open : resolved

  async function update(id: string, acknowledged: boolean) {
    setBusy(id)
    try {
      await api('/api/admin/alerts', 'PUT', { id, acknowledged })
      await Promise.all([mutate(), globalMutate('/api/alerts')])
    } catch (e: any) { toast.error(e.message) } finally { setBusy(null) }
  }

  async function ackAll() {
    setBusy('all')
    try {
      await api('/api/admin/alerts', 'PUT', { all: true })
      toast.success('All alerts dismissed')
      await Promise.all([mutate(), globalMutate('/api/alerts')])
    } catch (e: any) { toast.error(e.message) } finally { setBusy(null) }
  }

  return (
    <>
      <PageHeader title="Stock alerts" description="You are alerted when an ingredient drops to its minimum level. Alerts clear themselves once you restock."
        actions={open.length > 1 && tab === 'open' ? <Button variant="outline" size="sm" loading={busy === 'all'} onClick={ackAll}><CheckCheck className="h-4 w-4" /> Dismiss all</Button> : undefined} />

      <div className="page space-y-6">
        <div className="flex gap-2">
          {([['open', `Open (${open.length})`], ['resolved', `Resolved (${resolved.length})`]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${tab === key ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border-secondary)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background-tertiary)]'}`}>
              {label}
            </button>
          ))}
        </div>

        {error && !data ? <ErrorState message={error.message} onRetry={() => mutate()} />
        : isLoading ? <div className="space-y-3">{[0,1,2].map((i) => <div key={i} className="skeleton h-20" />)}</div>
        : list.length === 0 ? (
          <EmptyState icon={tab === 'open' ? CheckCircle2 : BellOff} title={tab === 'open' ? 'No open alerts' : 'Nothing resolved yet'}
            description={tab === 'open' ? 'Every ingredient is above its minimum level.' : 'Dismissed and auto-resolved alerts appear here.'} />
        ) : (
          <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
            {list.map((a) => (
              <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-6">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${a.acknowledged ? 'bg-[var(--color-background-tertiary)]' : 'bg-[var(--color-warning-bg)]'}`}>
                  {a.acknowledged ? <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" /> : <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--color-text-primary)]">{a.message}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                    {timeAgo(a.createdAt)} · {formatDateTime(a.createdAt)}
                    {a.inventoryItem && <> · now {formatNumber(a.inventoryItem.quantity)} {a.inventoryItem.unit} (min {formatNumber(a.threshold ?? a.inventoryItem.minStock)})</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!a.acknowledged && <Link href="/admin/inventory"><Button size="sm">Restock</Button></Link>}
                  {a.acknowledged ? (
                    <Button variant="outline" size="sm" loading={busy === a.id} onClick={() => update(a.id, false)}><Undo2 className="h-4 w-4" /> Reopen</Button>
                  ) : (
                    <Button variant="outline" size="sm" loading={busy === a.id} onClick={() => update(a.id, true)}>Dismiss</Button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </>
  )
}
