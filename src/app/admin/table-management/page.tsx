'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import QRCode from 'qrcode'
import toast from 'react-hot-toast'
import { Copy, ExternalLink, Pencil, Plus, Printer, QrCode, RefreshCw, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, Field, GridSkeleton, PageHeader } from '@/components/ui/Page'
import { api, fetcher } from '@/lib/api'
import { useOrganization } from '@clerk/nextjs'
import type { TableRow } from '@/types'

const orderUrl = (token: string) => `${typeof window !== 'undefined' ? window.location.origin : ''}/order/${token}`

export default function TableManagementPage() {
  const { organization } = useOrganization()
  const { data, error, isLoading, mutate } = useSWR<TableRow[]>('/api/tables', fetcher, { refreshInterval: 10000 })
  const [editing, setEditing] = useState<TableRow | 'new' | null>(null)
  const [number, setNumber] = useState('')
  const [capacity, setCapacity] = useState('4')
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState<TableRow | null>(null)
  const [qrTable, setQrTable] = useState<TableRow | null>(null)
  const [qrImage, setQrImage] = useState('')
  const [regen, setRegen] = useState(false)

  const tables = data ?? []

  useEffect(() => {
    if (!qrTable) return setQrImage('')
    QRCode.toDataURL(orderUrl(qrTable.token), { width: 640, margin: 2, errorCorrectionLevel: 'M' })
      .then(setQrImage)
      .catch(() => toast.error('Could not generate the QR code'))
  }, [qrTable])

  // keep the open QR modal in sync after a token is regenerated
  useEffect(() => {
    if (qrTable && data) {
      const fresh = data.find((t) => t.id === qrTable.id)
      if (fresh && fresh.token !== qrTable.token) setQrTable(fresh)
    }
  }, [data, qrTable])

  function openNew() {
    const next = tables.length ? Math.max(...tables.map((t) => t.number)) + 1 : 1
    setNumber(String(next)); setCapacity('4'); setEditing('new')
  }
  function openEdit(t: TableRow) { setNumber(String(t.number)); setCapacity(String(t.capacity)); setEditing(t) }

  async function save() {
    const n = Number(number), c = Number(capacity)
    if (!Number.isInteger(n) || n < 1) return toast.error('Table number must be a whole number')
    if (!Number.isInteger(c) || c < 1 || c > 50) return toast.error('Capacity must be between 1 and 50')
    setBusy(true)
    try {
      if (editing === 'new') await api('/api/tables', 'POST', { number: n, capacity: c })
      else if (editing) await api('/api/tables', 'PUT', { id: editing.id, number: n, capacity: c })
      toast.success(editing === 'new' ? `Table ${n} created` : 'Table updated')
      setEditing(null)
      mutate()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  async function remove() {
    if (!deleting) return
    setBusy(true)
    try {
      await api(`/api/tables?id=${deleting.id}`, 'DELETE')
      toast.success(`Table ${deleting.number} deleted`)
      mutate()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false); setDeleting(null) }
  }

  async function regenerate() {
    if (!qrTable) return
    setRegen(true)
    try {
      await api('/api/tables', 'PUT', { id: qrTable.id, regenerateToken: true })
      toast.success('New QR code generated. Reprint it – the old one no longer works.')
      await mutate()
    } catch (e: any) { toast.error(e.message) } finally { setRegen(false) }
  }

  async function copyLink() {
    if (!qrTable) return
    try { await navigator.clipboard.writeText(orderUrl(qrTable.token)); toast.success('Link copied') }
    catch { toast.error('Copy failed – select the link manually') }
  }

  function printQr() {
    if (!qrTable || !qrImage) return
    const w = window.open('', '_blank', 'width=520,height=720')
    if (!w) return toast.error('Allow pop-ups to print the QR code')
    const restaurant = (organization?.name ?? '').replace(/[<>&]/g, '')
    w.document.write(`<!doctype html><title>Table ${qrTable.number}</title>
      <style>body{font-family:system-ui,sans-serif;text-align:center;padding:32px}h1{margin:0 0 4px;font-size:28px}h2{margin:0 0 20px;font-size:52px}
      img{width:360px;height:360px}p{color:#555;font-size:16px;margin-top:16px}</style>
      <h1>${restaurant}</h1><h2>Table ${qrTable.number}</h2><img src="${qrImage}" /><p>Scan to view the menu and order from your table</p>
      <script>window.onload=()=>{window.print()}<\/script>`)
    w.document.close()
  }

  const occupied = tables.filter((t) => t.status === 'OCCUPIED').length

  return (
    <>
      <PageHeader title="Tables" description={tables.length ? `${tables.length} tables · ${occupied} occupied` : 'Create tables and print a QR code for each one.'}
        actions={<Button onClick={openNew}><Plus className="h-4 w-4" /> Add table</Button>} />

      <div className="page">
        {error && !data ? <ErrorState message={error.message} onRetry={() => mutate()} />
        : isLoading ? <GridSkeleton count={6} height="h-40" />
        : tables.length === 0 ? (
          <EmptyState icon={Users} title="No tables yet" description="Add a table to generate its QR code. Guests scan it to see your menu and place orders."
            action={<Button onClick={openNew}><Plus className="h-4 w-4" /> Add your first table</Button>} />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tables.map((t) => {
              const activeCount = t.orders?.length ?? 0
              return (
                <Card key={t.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">Table</p>
                      <p className="text-4xl font-bold leading-none text-[var(--color-text-primary)]">{t.number}</p>
                    </div>
                    <Badge tone={t.status === 'OCCUPIED' ? 'warning' : 'success'}>{t.status === 'OCCUPIED' ? 'Occupied' : 'Available'}</Badge>
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]"><Users className="h-4 w-4" /> Seats {t.capacity}</p>
                  {activeCount > 0 && (
                    <Link href="/admin/active-orders" className="mt-1 text-sm font-medium text-[var(--color-primary)] hover:underline">
                      {activeCount} active order{activeCount !== 1 ? 's' : ''} →
                    </Link>
                  )}
                  <div className="mt-5 flex gap-2 border-t border-[var(--color-border)] pt-4">
                    <Button size="sm" className="flex-1" onClick={() => setQrTable(t)}><QrCode className="h-4 w-4" /> QR code</Button>
                    <Button variant="outline" size="icon" onClick={() => openEdit(t)} aria-label={`Edit table ${t.number}`}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" onClick={() => setDeleting(t)} aria-label={`Delete table ${t.number}`}><Trash2 className="h-4 w-4 text-[var(--color-error)]" /></Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={editing !== null} onClose={() => !busy && setEditing(null)} title={editing === 'new' ? 'Add table' : 'Edit table'} size="sm"
        footer={<><Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button><Button onClick={save} loading={busy}>{editing === 'new' ? 'Create table' : 'Save'}</Button></>}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Table number"><input className="input" type="number" min="1" value={number} onChange={(e) => setNumber(e.target.value)} autoFocus /></Field>
          <Field label="Seats"><input className="input" type="number" min="1" max="50" value={capacity} onChange={(e) => setCapacity(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></Field>
        </div>
      </Modal>

      <Modal open={!!qrTable} onClose={() => setQrTable(null)} title={`Table ${qrTable?.number ?? ''} QR code`} description="Guests scan this to open your menu for this table." size="sm"
        footer={<><Button variant="outline" onClick={copyLink}><Copy className="h-4 w-4" /> Copy link</Button><Button onClick={printQr} disabled={!qrImage}><Printer className="h-4 w-4" /> Print</Button></>}>
        <div className="space-y-4 text-center">
          <div className="mx-auto flex aspect-square w-full max-w-[260px] items-center justify-center rounded-xl border border-[var(--color-border)] bg-white p-2">
            {qrImage ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={qrImage} alt={`QR code for table ${qrTable?.number}`} className="h-full w-full" /> : <div className="skeleton h-full w-full" />}
          </div>
          {qrTable && (
            <a href={orderUrl(qrTable.token)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-xs text-[var(--color-primary)] hover:underline">
              {orderUrl(qrTable.token)} <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}
          <div className="border-t border-[var(--color-border)] pt-3">
            <Button variant="ghost" size="sm" onClick={regenerate} loading={regen}><RefreshCw className="h-3.5 w-3.5" /> Generate a new code</Button>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Use this if a QR code was shared publicly. The old one stops working.</p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleting} title={`Delete table ${deleting?.number ?? ''}?`} loading={busy} onClose={() => setDeleting(null)} onConfirm={remove}
        message="Its QR code will stop working. Tables that already have orders are kept for your history and cannot be deleted." />
    </>
  )
}
