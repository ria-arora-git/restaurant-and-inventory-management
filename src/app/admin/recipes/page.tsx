'use client'

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import { Check, ChefHat, Pencil, Plus, Search, Soup, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, Field, GridSkeleton, PageHeader } from '@/components/ui/Page'
import { api, fetcher } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import type { InventoryItem, MenuItem } from '@/types'

export default function RecipesPage() {
  const menu = useSWR<MenuItem[]>('/api/menu', fetcher)
  const inv = useSWR<InventoryItem[]>('/api/inventory', fetcher)
  const [query, setQuery] = useState('')
  const [target, setTarget] = useState<MenuItem | null>(null)
  const [ingredientId, setIngredientId] = useState('')
  const [qty, setQty] = useState('')
  const [removable, setRemovable] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')

  const dishes = menu.data ?? []
  const inventory = inv.data ?? []
  const visible = dishes.filter((d) => !query.trim() || d.name.toLowerCase().includes(query.trim().toLowerCase()))
  const refresh = () => Promise.all([menu.mutate(), inv.mutate()])

  const used = new Set(target?.ingredients?.map((i) => i.inventoryItem.id))
  const choices = inventory.filter((i) => !used.has(i.id))
  const chosen = inventory.find((i) => i.id === ingredientId)

  function openAdd(d: MenuItem) { setTarget(d); setIngredientId(''); setQty(''); setRemovable(false) }

  async function add() {
    if (!target || !ingredientId) return toast.error('Choose an ingredient')
    if (!(Number(qty) > 0)) return toast.error('Enter the quantity used per serving')
    setSaving(true)
    try {
      await api('/api/recipes', 'POST', { menuItemId: target.id, inventoryItemId: ingredientId, quantity: Number(qty), removable })
      toast.success('Ingredient added to recipe')
      setTarget(null)
      refresh()
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  async function toggleRemovable(id: string, next: boolean) {
    try {
      await api('/api/recipes', 'PUT', { id, removable: next })
      refresh()
    } catch (e: any) { toast.error(e.message) }
  }

  async function saveQty(id: string) {
    if (!(Number(editQty) > 0)) return toast.error('Quantity must be above zero')
    try {
      await api('/api/recipes', 'PUT', { id, quantity: Number(editQty) })
      setEditId(null)
      refresh()
    } catch (e: any) { toast.error(e.message) }
  }

  async function remove(id: string, name: string) {
    try {
      await api(`/api/recipes?id=${id}`, 'DELETE')
      toast.success(`${name} removed`)
      refresh()
    } catch (e: any) { toast.error(e.message) }
  }

  const error = menu.error || inv.error

  return (
    <>
      <PageHeader title="Recipes" description="Define how much of each ingredient one serving uses. Orders deduct this from inventory automatically." />

      <div className="page space-y-6">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input className="input pl-9" placeholder="Search dishes" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {error && !menu.data ? <ErrorState message={error.message} onRetry={refresh} />
        : menu.isLoading ? <GridSkeleton count={4} />
        : dishes.length === 0 ? (
          <EmptyState icon={ChefHat} title="Add dishes first" description="Recipes belong to menu items. Create your menu, then come back to add ingredients."
            action={<Link href="/admin/menu-management"><Button>Go to menu</Button></Link>} />
        ) : visible.length === 0 ? <EmptyState icon={Search} title="No dishes match" />
        : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {visible.map((dish) => {
              const ings = dish.ingredients ?? []
              return (
                <Card key={dish.id} className="flex flex-col">
                  <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] p-4">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-[var(--color-text-primary)]">{dish.name}</h3>
                      <p className="text-xs text-[var(--color-text-secondary)]">{dish.category}</p>
                    </div>
                    {ings.length === 0 ? <Badge tone="warning">No recipe</Badge> : dish.available === false ? <Badge tone="error">Insufficient stock</Badge> : <Badge tone="success">{ings.length} ingredient{ings.length !== 1 ? 's' : ''}</Badge>}
                  </div>
                  <div className="flex-1 p-4">
                    {ings.length === 0 ? (
                      <p className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]"><Soup className="h-4 w-4" /> Stock is not deducted for this dish until you add ingredients.</p>
                    ) : (
                      <ul className="divide-y divide-[var(--color-border)]">
                        {ings.map((ing) => (
                          <li key={ing.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                            <span className="flex min-w-0 items-center gap-2 truncate text-[var(--color-text-primary)]">
                              {ing.inventoryItem.name}
                              {ing.removable && <Badge tone="info" className="shrink-0">Removable</Badge>}
                            </span>
                            {editId === ing.id ? (
                              <span className="flex items-center gap-1.5">
                                <input className="input !w-20 !py-1" type="number" min="0" step="any" value={editQty} autoFocus onChange={(e) => setEditQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveQty(ing.id)} />
                                <span className="text-xs text-[var(--color-text-secondary)]">{ing.inventoryItem.unit}</span>
                                <Button size="icon" variant="ghost" onClick={() => saveQty(ing.id)} aria-label="Save"><Check className="h-4 w-4 text-[var(--color-success)]" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => setEditId(null)} aria-label="Cancel"><X className="h-4 w-4" /></Button>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <span className="font-medium">{formatNumber(ing.quantity)} <span className="text-xs font-normal text-[var(--color-text-secondary)]">{ing.inventoryItem.unit}</span></span>
                                <Button size="icon" variant="ghost" onClick={() => { setEditId(ing.id); setEditQty(String(ing.quantity)) }} aria-label={`Edit ${ing.inventoryItem.name}`}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => toggleRemovable(ing.id, !ing.removable)} aria-label={`Toggle removable for ${ing.inventoryItem.name}`} title="Let customers remove this">
                                  <Soup className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => remove(ing.id, ing.inventoryItem.name)} aria-label={`Remove ${ing.inventoryItem.name}`}><Trash2 className="h-3.5 w-3.5 text-[var(--color-error)]" /></Button>
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="border-t border-[var(--color-border)] p-3">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => openAdd(dish)}><Plus className="h-4 w-4" /> Add ingredient</Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={!!target} onClose={() => !saving && setTarget(null)} title={`Add ingredient to ${target?.name ?? ''}`} size="sm"
        footer={<><Button variant="outline" onClick={() => setTarget(null)} disabled={saving}>Cancel</Button><Button onClick={add} loading={saving} disabled={choices.length === 0}>Add</Button></>}>
        {inventory.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">You have no ingredients yet. <Link href="/admin/inventory" className="font-medium text-[var(--color-primary)] hover:underline">Add some in Inventory</Link>.</p>
        ) : choices.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Every ingredient is already in this recipe.</p>
        ) : (
          <div className="space-y-4">
            <Field label="Ingredient">
              <select className="input" value={ingredientId} onChange={(e) => setIngredientId(e.target.value)}>
                <option value="">Select…</option>
                {choices.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </select>
            </Field>
            <Field label={`Quantity per serving${chosen ? ` (${chosen.unit})` : ''}`}>
              <input className="input" type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="e.g. 0.15" />
            </Field>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-[var(--color-background-secondary)] p-3 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded" checked={removable} onChange={(e) => setRemovable(e.target.checked)} />
              <span>
                <span className="font-medium text-[var(--color-text-primary)]">Customers can remove this</span>
                <span className="block text-xs text-[var(--color-text-secondary)]">e.g. &ldquo;no onion&rdquo; — shown as an option on the order page</span>
              </span>
            </label>
          </div>
        )}
      </Modal>
    </>
  )
}
