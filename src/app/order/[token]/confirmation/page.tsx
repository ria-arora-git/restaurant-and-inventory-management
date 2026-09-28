'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { CheckCircle2, ChefHat, Clock, Loader2, Receipt, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { fetcher } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { OrderStatus } from '@/lib/status'

interface Tracked {
  id: string
  orderNumber: string
  status: OrderStatus
  total: number
  tableNumber: number
  items: { id: string; name: string; quantity: number; price: number }[]
}

const STEPS: { key: OrderStatus; label: string; icon: typeof Clock }[] = [
  { key: 'PENDING', label: 'Received', icon: Receipt },
  { key: 'PREPARING', label: 'Preparing', icon: ChefHat },
  { key: 'READY', label: 'Ready', icon: CheckCircle2 },
  { key: 'SERVED', label: 'Served', icon: CheckCircle2 },
]

function Tracker() {
  const { token } = useParams<{ token: string }>()
  const orderId = useSearchParams().get('order')
  const { data, error } = useSWR<Tracked>(orderId ? `/api/orders/${orderId}?token=${encodeURIComponent(token)}` : null, fetcher, { refreshInterval: 5000 })

  const stepIndex = data ? Math.max(0, STEPS.findIndex((s) => s.key === data.status || (data.status === 'PAID' && s.key === 'SERVED'))) : 0
  const cancelled = data?.status === 'CANCELLED'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background-secondary)] p-5">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-lg">
        <div className="text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${cancelled ? 'bg-[var(--color-error-bg)]' : 'bg-[var(--color-success-bg)]'}`}>
            {cancelled ? <XCircle className="h-9 w-9 text-[var(--color-error)]" /> : <CheckCircle2 className="h-9 w-9 text-[var(--color-success)]" />}
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{cancelled ? 'Order cancelled' : 'Order placed!'}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {cancelled ? 'Please speak to a member of staff.' : 'We are on it. You can leave this page open to follow along.'}
          </p>
          {data && <p className="mt-3 inline-block rounded-full bg-[var(--color-background-tertiary)] px-3 py-1 text-sm font-medium">{data.orderNumber} · Table {data.tableNumber}</p>}
        </div>

        {!orderId ? null : error && !data ? (
          <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">We could not load the live status, but your order has been sent to the kitchen.</p>
        ) : !data ? (
          <div className="mt-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" /></div>
        ) : (
          <>
            {!cancelled && (
              <ol className="mt-8 flex items-start justify-between">
                {STEPS.map((s, i) => {
                  const done = i <= stepIndex
                  return (
                    <li key={s.key} className="relative flex flex-1 flex-col items-center text-center">
                      {i > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full ${i <= stepIndex ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />}
                      <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs ${done ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border-secondary)] bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                        <s.icon className="h-4 w-4" />
                      </span>
                      <span className={`mt-2 text-xs ${done ? 'font-medium text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)]'}`}>{s.label}</span>
                    </li>
                  )
                })}
              </ol>
            )}
            <ul className="mt-8 divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] text-sm">
              {data.items.map((i) => (
                <li key={i.id} className="flex justify-between px-3 py-2.5"><span>{i.quantity}× {i.name}</span><span>{formatCurrency(i.quantity * i.price)}</span></li>
              ))}
              <li className="flex justify-between bg-[var(--color-background-secondary)] px-3 py-2.5 font-bold"><span>Total</span><span>{formatCurrency(data.total)}</span></li>
            </ul>
          </>
        )}

        <Link href={`/order/${token}`}><Button className="mt-7 w-full" size="lg">Order something else</Button></Link>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" /></div>}>
      <Tracker />
    </Suspense>
  )
}
