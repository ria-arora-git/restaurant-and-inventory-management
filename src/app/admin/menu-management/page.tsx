'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import { ChefHat, Clock, ImageOff, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, Field, GridSkeleton, PageHeader } from '@/components/ui/Page'
import { api, fetcher } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { MenuItem } from '@/types'

const blank = { name: '', description: '', category: '', price: '', prepTime: '', image: '' }
type Form = typeof blank

export default function MenuManagementPage() {
  const { data, error, isLoading, mutate } = useSWR<MenuItem[]>('/api/menu', fetcher)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [editing, setEditing] = useState<MenuItem | 'new' | null>(null)
  const [form, setForm] = useState<Form>(blank)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<MenuItem | null>(null)
  const [busyDelete, setBusyDelete] = useState(false)

  const items = data ?? []
  const categories = useMemo(() => [...new Set(items.map((i) => i.category))].sort(), [items])

  const visible = items.filter((i) => {
    if (category !== 'all' && i.category !== category) return false
    const q = query.trim().toLowerCase()
    return !q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
  })

  function openNew() {
    setForm({ ...blank, category: category !== 'all' ? category : '' })
    setEditing('new')
  }
  function openEdit(item: MenuItem) {
    setForm({
      name: item.name,
      description: item.description,
      category: item.category,
      price: String(item.price),
      prepTime: item.prepTime != null ? String(item.prepTime) : '',
      image: item.image ?? '',
    })
    setEditing(item)
  }
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function save() {
    if (!form.name.trim() || !form.category.trim() || form.price === '') {
      return toast.error('Name, category and price are required')
    }
    if (Number(form.price) < 0 || Number.isNaN(Number(form.price))) return toast.error('Enter a valid price')
    setSaving(true)
    try {
      const payload = { ...form, price: Number(form.price), prepTime: form.prepTime === '' ? null : Number(form.prepTime) }
      if (editing === 'new') await api('/api/menu', 'POST', payload)
      else if (editing) await api(`/api/menu/${editing.id}`, 'PUT', payload)
      toast.success(editing === 'new' ? 'Dish added' : 'Dish updated')
      setEditing(null)
      mutate()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!deleting) return
    setBusyDelete(true)
    try {
      await api(`/api/menu/${deleting.id}`, 'DELETE')
      toast.success(`${deleting.name} deleted`)
      setDeleting(null)
      mutate()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusyDelete(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Menu"
        description="The dishes your customers see when they scan a table QR code."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" /> Add dish
          </Button>
        }
      />

      <div className="page space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input className="input pl-9" placeholder="Search dishes" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select className="input sm:w-56" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {error && !data ? (
          <ErrorState message={error.message} onRetry={() => mutate()} />
        ) : isLoading ? (
          <GridSkeleton count={6} height="h-72" />
        ) : items.length === 0 ? (
          <EmptyState icon={ChefHat} title="Your menu is empty" description="Add your first dish, then link its ingredients in Recipes so stock updates automatically."
            action={<Button onClick={openNew}><Plus className="h-4 w-4" /> Add your first dish</Button>} />
        ) : visible.length === 0 ? (
          <EmptyState icon={Search} title="No dishes match" description="Try a different search or category." />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => (
              <Card key={item.id} className="group flex flex-col overflow-hidden">
                <div className="relative h-40 bg-[var(--color-background-tertiary)]">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <div className="flex h-full items-center justify-center"><ImageOff className="h-8 w-8 text-[var(--color-text-muted)]" /></div>
                  )}
                  <div className="absolute left-3 top-3"><Badge tone="neutral" className="bg-[var(--color-surface)]">{item.category}</Badge></div>
                  {item.available === false && <div className="absolute right-3 top-3"><Badge tone="error" className="bg-[var(--color-surface)]">Out of stock</Badge></div>}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-[var(--color-text-primary)]">{item.name}</h3>
                    <span className="font-bold text-[var(--color-primary)]">{formatCurrency(item.price)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 flex-1 text-sm text-[var(--color-text-secondary)]">{item.description || 'No description'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-secondary)]">
                    {item.prepTime != null && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {item.prepTime} min</span>}
                    {(item.ingredients?.length ?? 0) === 0 ? (
                      <Link href="/admin/recipes" className="text-[var(--color-warning)] hover:underline">No recipe · stock not tracked</Link>
                    ) : (
                      <span>{item.ingredients!.length} ingredient{item.ingredients!.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2 border-t border-[var(--color-border)] pt-3">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(item)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                    <Button variant="outline" size="icon" onClick={() => setDeleting(item)} aria-label={`Delete ${item.name}`}>
                      <Trash2 className="h-4 w-4 text-[var(--color-error)]" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => !saving && setEditing(null)}
        title={editing === 'new' ? 'Add dish' : 'Edit dish'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} loading={saving}>{editing === 'new' ? 'Add dish' : 'Save changes'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name *"><input className="input" value={form.name} onChange={set('name')} placeholder="Margherita pizza" autoFocus /></Field>
          <Field label="Description"><textarea className="input min-h-[80px]" value={form.description} onChange={set('description')} placeholder="Tomato, mozzarella and fresh basil" /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Category *">
              <input className="input" list="menu-categories" value={form.category} onChange={set('category')} placeholder="Mains" />
              <datalist id="menu-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Price *"><input className="input" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="9.99" /></Field>
            <Field label="Prep time (minutes)"><input className="input" type="number" min="0" step="1" value={form.prepTime} onChange={set('prepTime')} placeholder="15" /></Field>
            <Field label="Image URL"><input className="input" type="url" value={form.image} onChange={set('image')} placeholder="https://…" /></Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleting} title="Delete dish?" loading={busyDelete} onClose={() => setDeleting(null)} onConfirm={remove}
        message={<>“{deleting?.name}” and its recipe will be removed from the menu.</>} />
    </>
  )
}
