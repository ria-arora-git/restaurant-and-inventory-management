'use client'

import { useState } from 'react'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import { AlertTriangle, Minus, Package, Pencil, Plus, PlusCircle, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, Field, PageHeader, StatCard } from '@/components/ui/Page'
import { api, fetcher } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import type { InventoryItem } from '@/types'

const UNITS = ['kg', 'g', 'l', 'ml', 'pcs', 'dozen', 'pack']
const blank = { name: '', unit: 'kg', quantity: '', minStock: '' }

function level(i: InventoryItem): { tone: 'error' | 'warning' | 'success'; label: string; pct: number } {
  const pct = i.minStock > 0 ? Math.min(100, (i.quantity / (i.minStock * 3)) * 100) : i.quantity > 0 ? 100 : 0
  if (i.quantity <= i.minStock) return { tone: 'error', label: i.quantity === 0 ? 'Out of stock' : 'Low stock', pct }
  if (i.quantity <= i.minStock * 1.5) return { tone: 'warning', label: 'Running low', pct }
  return { tone: 'success', label: 'In stock', pct }
}

export default function InventoryPage() {
  const { data, error, isLoading, mutate } = useSWR<InventoryItem[]>('/api/inventory', fetcher, { refreshInterval: 20000 })
  const [query, setQuery] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | 'new' | null>(null)
  const [form, setForm] = useState(blank)
  const [restock, setRestock] = useState<InventoryItem | null>(null)
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<'add' | 'remove'>('add')
  const [deleting, setDeleting] = useState<InventoryItem | null>(null)
  const [busy, setBusy] = useState(false)

  const items = data ?? []
  const low = items.filter((i) => i.quantity <= i.minStock)
  const visible = items.filter((i) => {
    if (onlyLow && i.quantity > i.minStock) return false
    return !query.trim() || i.name.toLowerCase().includes(query.trim().toLowerCase())
  })

  function openNew() { setForm(blank); setEditing('new') }
  function openEdit(i: InventoryItem) {
    setForm({ name: i.name, unit: i.unit, quantity: String(i.quantity), minStock: String(i.minStock) })
    setEditing(i)
  }

  async function save() {
    if (!form.name.trim() || !form.unit.trim()) return toast.error('Name and unit are required')
    if (form.quantity === '' || form.minStock === '') return toast.error('Enter the current and minimum quantity')
    const quantity = Number(form.quantity), minStock = Number(form.minStock)
    if (quantity < 0 || minStock < 0) return toast.error('Quantities cannot be negative')
    setBusy(true)
    try {
      if (editing === 'new') await api('/api/inventory', 'POST', { name: form.name, unit: form.unit, quantity, minStock })
      else if (editing) await api('/api/inventory', 'PUT', { id: editing.id, name: form.name, unit: form.unit, quantity, minStock })
      toast.success(editing === 'new' ? 'Ingredient added' : 'Ingredient updated')
      setEditing(null)
      mutate()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  async function adjust() {
    const n = Number(amount)
    if (!restock || !amount || !(n > 0)) return toast.error('Enter an amount above zero')
    setBusy(true)
    try {
      await api('/api/inventory', 'PUT', { id: restock.id, quantityChange: mode === 'add' ? n : -n })
      toast.success(`${restock.name} ${mode === 'add' ? 'restocked' : 'reduced'}`)
      setRestock(null); setAmount(''); setMode('add')
      mutate()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  async function remove() {
    if (!deleting) return
    setBusy(true)
    try {
      await api(`/api/inventory?id=${deleting.id}`, 'DELETE')
      toast.success(`${deleting.name} deleted`)
      setDeleting(null)
      mutate()
    } catch (e: any) { toast.error(e.message); setDeleting(null) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Inventory" description="Track ingredient stock. Orders deduct stock automatically using your recipes."
        actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> Add ingredient</Button>} />

      <div className="page space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Ingredients" value={items.length} icon={Package} />
          <StatCard label="Low or out of stock" value={low.length} icon={AlertTriangle} tone={low.length ? 'warning' : 'success'} />
          <StatCard label="Healthy stock" value={items.length - low.length} icon={Package} tone="success" />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input className="input pl-9" placeholder="Search ingredients" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-primary)]">
            <input type="checkbox" className="h-4 w-4 rounded" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
            Show low stock only
          </label>
        </div>

        {error && !data ? <ErrorState message={error.message} onRetry={() => mutate()} />
        : isLoading ? <div className="space-y-3">{[0,1,2,3].map((i) => <div key={i} className="skeleton h-20" />)}</div>
        : items.length === 0 ? (
          <EmptyState icon={Package} title="No ingredients yet" description="Add ingredients such as flour, tomatoes or cheese, then use them in recipes."
            action={<Button onClick={openNew}><Plus className="h-4 w-4" /> Add ingredient</Button>} />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} title="Nothing matches" description="Try clearing the search or the low-stock filter." />
        ) : (
          <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
            {visible.map((item) => {
              const lv = level(item)
              const usedIn = item.ingredients?.length ?? 0
              return (
                <div key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[var(--color-text-primary)]">{item.name}</h3>
                      <Badge tone={lv.tone}>{lv.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                      Minimum {formatNumber(item.minStock)} {item.unit} · {usedIn > 0 ? `used in ${usedIn} recipe${usedIn !== 1 ? 's' : ''}` : 'not used in any recipe'}
                    </p>
                    <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[var(--color-background-tertiary)]">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(3, lv.pct)}%`, background: `var(--color-${lv.tone})` }} />
                    </div>
                  </div>
                  <div className="text-left sm:w-32 sm:text-right">
                    <p className="text-2xl font-bold text-[var(--color-text-primary)]">{formatNumber(item.quantity)}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{item.unit}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setRestock(item); setAmount(''); setMode('add') }}><PlusCircle className="h-4 w-4" /> Adjust</Button>
                    <Button variant="outline" size="icon" onClick={() => openEdit(item)} aria-label={`Edit ${item.name}`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={() => setDeleting(item)} aria-label={`Delete ${item.name}`}><Trash2 className="h-4 w-4 text-[var(--color-error)]" /></Button>
                  </div>
                </div>
              )
            })}
          </Card>
        )}
      </div>

      <Modal open={editing !== null} onClose={() => !busy && setEditing(null)} title={editing === 'new' ? 'Add ingredient' : 'Edit ingredient'}
        footer={<><Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button><Button onClick={save} loading={busy}>{editing === 'new' ? 'Add ingredient' : 'Save changes'}</Button></>}>
        <div className="space-y-4">
          <Field label="Name *"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mozzarella" autoFocus /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Unit *">
              <input className="input" list="units" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              <datalist id="units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
            </Field>
            <Field label="In stock *"><input className="input" type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
            <Field label="Minimum *" hint="Alert when at or below"><input className="input" type="number" min="0" step="any" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} /></Field>
          </div>
        </div>
      </Modal>

      <Modal open={!!restock} onClose={() => !busy && setRestock(null)} title={`Adjust ${restock?.name ?? ''}`} description={restock ? `Currently ${formatNumber(restock.quantity)} ${restock.unit}` : undefined} size="sm"
        footer={<><Button variant="outline" onClick={() => setRestock(null)} disabled={busy}>Cancel</Button><Button onClick={adjust} loading={busy}>{mode === 'add' ? 'Add stock' : 'Remove stock'}</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--color-background-tertiary)] p-1">
            {(['add', 'remove'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${mode === m ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                {m === 'add' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />} {m === 'add' ? 'Restock' : 'Remove'}
              </button>
            ))}
          </div>
          <Field label={`Amount (${restock?.unit ?? ''})`}>
            <input className="input" type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adjust()} autoFocus />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleting} title="Delete ingredient?" loading={busy} onClose={() => setDeleting(null)} onConfirm={remove}
        message={<>“{deleting?.name}” and its stock history will be permanently removed.</>} />
    </>
  )
}
