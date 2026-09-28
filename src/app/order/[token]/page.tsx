'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChefHat, Clock, ImageOff, Loader2, Minus, Plus, QrCode, Search, ShoppingBag, StickyNote, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/format'

interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  prepTime: number | null
  image: string | null
  available: boolean
}
interface TableInfo { id: string; number: number; capacity: number; restaurantName: string }
type Cart = Record<string, number>

const MAX_PER_ITEM = 20

export default function CustomerOrderPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const cartKey = `cart-${params.token}`
  const [table, setTable] = useState<TableInfo | null>(null)
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'invalid' | 'error'>('loading')
  const [cart, setCart] = useState<Cart>({})
  const [cartLoaded, setCartLoaded] = useState(false)
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const t = await fetch('/api/tables/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: params.token }),
        })
        if (t.status === 404) return !cancelled && setState('invalid')
        if (!t.ok) throw new Error()
        const tableData: TableInfo = await t.json()
        const m = await fetch(`/api/menu?tableToken=${encodeURIComponent(params.token)}`)
        if (!m.ok) throw new Error()
        const items: MenuItem[] = await m.json()
        if (cancelled) return
        setTable(tableData)
        setMenu(items)
        setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => { cancelled = true }
  }, [params.token])

  // restore / persist the cart
  useEffect(() => {
    try {
      const saved = localStorage.getItem(cartKey)
      if (saved) setCart(JSON.parse(saved))
      const savedName = localStorage.getItem('customer-name')
      if (savedName) setName(savedName)
    } catch { /* ignore */ }
    setCartLoaded(true)
  }, [cartKey])

  useEffect(() => {
    if (!cartLoaded) return
    try {
      if (Object.keys(cart).length) localStorage.setItem(cartKey, JSON.stringify(cart))
      else localStorage.removeItem(cartKey)
    } catch { /* ignore */ }
  }, [cart, cartKey, cartLoaded])

  // drop cart lines whose dish disappeared or sold out
  useEffect(() => {
    if (state !== 'ready') return
    setCart((c) => {
      const next: Cart = {}
      for (const [id, q] of Object.entries(c)) {
        const item = menu.find((m) => m.id === id)
        if (item && item.available) next[id] = q
      }
      return Object.keys(next).length === Object.keys(c).length ? c : next
    })
  }, [menu, state])

  const categories = useMemo(() => ['All', ...[...new Set(menu.map((m) => m.category))].sort()], [menu])
  const visible = menu.filter((m) => {
    if (category !== 'All' && m.category !== category) return false
    const q = query.trim().toLowerCase()
    return !q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
  })

  const lines = Object.entries(cart)
    .map(([id, quantity]) => ({ item: menu.find((m) => m.id === id)!, quantity }))
    .filter((l) => l.item)
  const count = lines.reduce((s, l) => s + l.quantity, 0)
  const total = lines.reduce((s, l) => s + l.item.price * l.quantity, 0)

  const change = (id: string, delta: number) =>
    setCart((c) => {
      const q = Math.min(MAX_PER_ITEM, (c[id] ?? 0) + delta)
      const next = { ...c }
      if (q <= 0) delete next[id]
      else next[id] = q
      return next
    })

  async function placeOrder() {
    if (!table || lines.length === 0) return
    setSubmitting(true)
    try {
      const order = await api<{ id: string; orderNumber: string }>('/api/orders', 'POST', {
        tableToken: params.token,
        customerName: name.trim() || undefined,
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({ menuItemId: l.item.id, quantity: l.quantity })),
      })
      try {
        if (name.trim()) localStorage.setItem('customer-name', name.trim())
        localStorage.removeItem(cartKey)
      } catch { /* ignore */ }
      setCart({})
      router.push(`/order/${params.token}/confirmation?order=${order.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Could not place your order')
      // refresh availability so sold-out dishes are greyed out
      fetch(`/api/menu?tableToken=${encodeURIComponent(params.token)}`).then((r) => r.ok && r.json()).then((d) => d && setMenu(d)).catch(() => {})
      setSubmitting(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background-secondary)]">
        <div className="text-center"><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[var(--color-primary)]" /><p className="text-sm text-[var(--color-text-secondary)]">Loading the menu…</p></div>
      </div>
    )
  }

  if (state !== 'ready' || !table) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background-secondary)] p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-error-bg)]"><QrCode className="h-8 w-8 text-[var(--color-error)]" /></div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">{state === 'invalid' ? 'This QR code is not valid' : 'We could not load the menu'}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            {state === 'invalid' ? 'Please ask a member of staff for help – the QR code may have been replaced.' : 'Check your connection and try again.'}
          </p>
          {state === 'error' && <Button className="mt-5" onClick={() => location.reload()}>Try again</Button>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)] pb-28">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-[var(--color-text-primary)]">{table.restaurantName}</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">Table {table.number}</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white"><ChefHat className="h-5 w-5" /></div>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input className="input pl-9" placeholder="Search the menu" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="thin-scroll -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-3">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${category === c ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white' : 'border-[var(--color-border-secondary)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {menu.length === 0 ? (
          <div className="py-20 text-center"><ChefHat className="mx-auto mb-3 h-12 w-12 text-[var(--color-text-muted)]" /><p className="font-medium text-[var(--color-text-primary)]">The menu is not available yet</p><p className="text-sm text-[var(--color-text-secondary)]">Please ask a member of staff.</p></div>
        ) : visible.length === 0 ? (
          <div className="py-20 text-center"><Search className="mx-auto mb-3 h-10 w-10 text-[var(--color-text-muted)]" /><p className="font-medium text-[var(--color-text-primary)]">Nothing matches “{query}”</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visible.map((item) => {
              const qty = cart[item.id] ?? 0
              return (
                <div key={item.id} className={`flex overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm ${item.available ? '' : 'opacity-60'}`}>
                  <div className="flex flex-1 flex-col p-4">
                    <h2 className="font-semibold text-[var(--color-text-primary)]">{item.name}</h2>
                    {item.description && <p className="mt-1 line-clamp-2 text-sm text-[var(--color-text-secondary)]">{item.description}</p>}
                    <div className="mt-auto flex items-end justify-between pt-3">
                      <div>
                        <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(item.price)}</p>
                        {item.prepTime ? <p className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]"><Clock className="h-3 w-3" /> ~{item.prepTime} min</p> : null}
                      </div>
                      {!item.available ? (
                        <span className="rounded-full bg-[var(--color-error-bg)] px-3 py-1 text-xs font-medium text-[var(--color-error)]">Sold out</span>
                      ) : qty === 0 ? (
                        <Button size="sm" onClick={() => change(item.id, 1)}><Plus className="h-4 w-4" /> Add</Button>
                      ) : (
                        <div className="flex items-center gap-1 rounded-full bg-[var(--color-background-tertiary)] p-1">
                          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)] shadow-sm" onClick={() => change(item.id, -1)} aria-label={`Remove one ${item.name}`}><Minus className="h-4 w-4" /></button>
                          <span className="w-7 text-center text-sm font-semibold">{qty}</span>
                          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-white disabled:opacity-40" disabled={qty >= MAX_PER_ITEM} onClick={() => change(item.id, 1)} aria-label={`Add one more ${item.name}`}><Plus className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="relative hidden w-28 shrink-0 bg-[var(--color-background-tertiary)] min-[420px]:block">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                    ) : <div className="flex h-full items-center justify-center"><ImageOff className="h-6 w-6 text-[var(--color-text-muted)]" /></div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 p-4">
          <button onClick={() => setOpen(true)} className="mx-auto flex w-full max-w-md items-center justify-between rounded-2xl bg-[var(--color-primary)] px-5 py-4 text-white shadow-xl transition-transform active:scale-[0.99]">
            <span className="flex items-center gap-3">
              <span className="relative"><ShoppingBag className="h-5 w-5" /><span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[var(--color-primary)]">{count}</span></span>
              <span className="font-semibold">View your order</span>
            </span>
            <span className="font-bold">{formatCurrency(total)}</span>
          </button>
        </div>
      )}

      <Modal open={open} onClose={() => !submitting && setOpen(false)} title="Your order" description={`Table ${table.number}`}
        footer={<Button size="lg" className="w-full" loading={submitting} disabled={lines.length === 0} onClick={placeOrder}>Place order · {formatCurrency(total)}</Button>}>
        {lines.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--color-text-secondary)]">Your cart is empty.</p>
        ) : (
          <div className="space-y-5">
            <ul className="divide-y divide-[var(--color-border)]">
              {lines.map(({ item, quantity }) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--color-text-primary)]">{item.name}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{formatCurrency(item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-[var(--color-background-tertiary)] p-1">
                    <button className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface)]" onClick={() => change(item.id, -1)} aria-label="Decrease">{quantity === 1 ? <Trash2 className="h-3.5 w-3.5 text-[var(--color-error)]" /> : <Minus className="h-3.5 w-3.5" />}</button>
                    <span className="w-6 text-center text-sm font-semibold">{quantity}</span>
                    <button className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-white disabled:opacity-40" disabled={quantity >= MAX_PER_ITEM} onClick={() => change(item.id, 1)} aria-label="Increase"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <p className="w-16 text-right font-semibold">{formatCurrency(item.price * quantity)}</p>
                </li>
              ))}
            </ul>
            <div>
              <label className="label" htmlFor="cust-name">Your name <span className="font-normal text-[var(--color-text-muted)]">(optional)</span></label>
              <input id="cust-name" className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="So we can call it out" />
            </div>
            <div>
              <label className="label" htmlFor="cust-notes"><StickyNote className="mr-1 inline h-3.5 w-3.5" />Special requests <span className="font-normal text-[var(--color-text-muted)]">(optional)</span></label>
              <textarea id="cust-notes" className="input min-h-[70px]" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergies, spice level, no onions…" />
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-4 text-lg font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>
        )}
      </Modal>
    </div>
  )
}
