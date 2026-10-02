'use client'

import { useState } from 'react'
import useSWR from 'swr'
import toast from 'react-hot-toast'
import { useOrganization } from '@clerk/nextjs'
import { Clock, Mail, Plus, ShieldCheck, Trash2, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { EmptyState, ErrorState, Field, PageHeader } from '@/components/ui/Page'
import { api, fetcher } from '@/lib/api'
import { ROLE_LABEL, roleFromClerk, type Role } from '@/lib/roles'
import { formatDateTime } from '@/lib/format'

interface Member { id: string; role: string; name: string | null; email: string | null; userId: string | null; createdAt: number }
interface Pending { id: string; email: string; role: string; createdAt: number }

const ROLE_TONE: Record<Role, 'primary' | 'info' | 'neutral'> = { admin: 'primary', manager: 'info', staff: 'neutral' }

export default function StaffPage() {
  const { membership } = useOrganization()
  const myRole = roleFromClerk(membership?.role)
  const { data, error, isLoading, mutate } = useSWR<{ members: Member[]; pending: Pending[] }>(
    myRole === 'admin' ? '/api/admin/staff' : null,
    fetcher
  )
  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'staff'>('staff')
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<{ kind: 'member' | 'invite'; id: string; label: string } | null>(null)

  if (myRole !== 'admin') {
    return (
      <div className="page">
        <EmptyState icon={ShieldCheck} title="Owner access only" description="Only the restaurant Owner can manage staff and roles." />
      </div>
    )
  }

  async function invite() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Enter a valid email address')
    setBusy(true)
    try {
      await api('/api/admin/staff', 'POST', { email, role })
      toast.success(`Invitation sent to ${email}`)
      setInviteOpen(false); setEmail(''); setRole('staff')
      mutate()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false) }
  }

  async function changeRole(member: Member, newRole: Role) {
    try {
      await api('/api/admin/staff', 'PUT', { membershipId: member.userId, role: newRole })
      toast.success(`${member.name || member.email} is now ${ROLE_LABEL[newRole]}`)
      mutate()
    } catch (e: any) { toast.error(e.message) }
  }

  async function remove() {
    if (!removing) return
    setBusy(true)
    try {
      const qs = removing.kind === 'member' ? `membershipId=${removing.id}` : `invitationId=${removing.id}`
      await api(`/api/admin/staff?${qs}`, 'DELETE')
      toast.success(removing.kind === 'member' ? 'Removed from the team' : 'Invitation revoked')
      mutate()
    } catch (e: any) { toast.error(e.message) } finally { setBusy(false); setRemoving(null) }
  }

  const members = data?.members ?? []
  const pending = data?.pending ?? []

  return (
    <>
      <PageHeader title="Staff & roles" description="Invite managers and staff, and control what they can access."
        actions={<Button onClick={() => setInviteOpen(true)}><Plus className="h-4 w-4" /> Invite</Button>} />

      <div className="page space-y-6">
        <Card className="grid grid-cols-1 divide-y divide-[var(--color-border)] p-0 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {(['admin', 'manager', 'staff'] as Role[]).map((r) => (
            <div key={r} className="p-4">
              <Badge tone={ROLE_TONE[r]}>{ROLE_LABEL[r]}</Badge>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                {r === 'admin' && 'Full access: menu, inventory, recipes, tables, staff, analytics and billing.'}
                {r === 'manager' && 'Everything except managing staff: menu, inventory, recipes, tables, orders and analytics.'}
                {r === 'staff' && 'Runs the floor: manage live orders, restock inventory, and close out tables to bill.'}
              </p>
            </div>
          ))}
        </Card>

        {error && !data ? <ErrorState message={error.message} onRetry={() => mutate()} />
        : isLoading ? <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)}</div>
        : (
          <>
            <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
              {members.length === 0 ? (
                <div className="p-6"><EmptyState icon={Users} title="No team members yet" /></div>
              ) : members.map((m) => {
                const r = roleFromClerk(m.role)
                return (
                  <div key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--color-text-primary)]">{m.name || m.email || 'Team member'}</p>
                      {m.email && <p className="truncate text-xs text-[var(--color-text-secondary)]">{m.email}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {r === 'admin' ? (
                        <Badge tone="primary">Owner</Badge>
                      ) : (
                        <select className="input !w-auto !py-1.5 text-sm" value={r} onChange={(e) => changeRole(m, e.target.value as Role)}>
                          <option value="manager">Manager</option>
                          <option value="staff">Staff</option>
                        </select>
                      )}
                      {r !== 'admin' && (
                        <Button variant="outline" size="icon" onClick={() => setRemoving({ kind: 'member', id: m.userId!, label: m.name || m.email || 'this member' })} aria-label="Remove">
                          <Trash2 className="h-4 w-4 text-[var(--color-error)]" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </Card>

            {pending.length > 0 && (
              <Card className="divide-y divide-[var(--color-border)] overflow-hidden">
                <div className="bg-[var(--color-background-secondary)] px-6 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                  Pending invitations
                </div>
                {pending.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-4 sm:px-6">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Mail className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{p.email}</p>
                        <p className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]"><Clock className="h-3 w-3" /> Invited {formatDateTime(new Date(p.createdAt))}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={ROLE_TONE[roleFromClerk(p.role)]}>{ROLE_LABEL[roleFromClerk(p.role)]}</Badge>
                      <Button variant="outline" size="icon" onClick={() => setRemoving({ kind: 'invite', id: p.id, label: p.email })} aria-label="Revoke invitation"><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </div>

      <Modal open={inviteOpen} onClose={() => !busy && setInviteOpen(false)} title="Invite a team member" size="sm"
        footer={<><Button variant="outline" onClick={() => setInviteOpen(false)} disabled={busy}>Cancel</Button><Button onClick={invite} loading={busy}>Send invite</Button></>}>
        <div className="space-y-4">
          <Field label="Email address"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus /></Field>
          <Field label="Role">
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as 'manager' | 'staff')}>
              <option value="manager">Manager – full access except staff management</option>
              <option value="staff">Staff – orders, inventory restock, table billing</option>
            </select>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog open={!!removing} title={removing?.kind === 'invite' ? 'Revoke invitation?' : 'Remove team member?'} loading={busy}
        onClose={() => setRemoving(null)} onConfirm={remove}
        message={removing?.kind === 'invite' ? <>The invitation to {removing.label} will be cancelled.</> : <>{removing?.label} will lose access to this restaurant.</>} />
    </>
  )
}
