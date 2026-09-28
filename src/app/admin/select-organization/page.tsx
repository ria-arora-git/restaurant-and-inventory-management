'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganization, useOrganizationList } from '@clerk/nextjs'
import { ArrowRight, Building2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageLoader } from '@/components/ui/Page'
import { BRAND } from '@/lib/brand'

export default function SelectOrganizationPage() {
  const router = useRouter()
  const { organization } = useOrganization()
  const { isLoaded, setActive, createOrganization, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  })
  const [name, setName] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (organization) router.replace('/admin')
  }, [organization, router])

  if (!isLoaded) return <PageLoader />

  const choose = async (orgId: string) => {
    if (!setActive) return
    setBusy(orgId)
    try {
      await setActive({ organization: orgId })
      router.replace('/admin')
    } catch {
      toast.error('Could not open that restaurant. Please try again.')
      setBusy(null)
    }
  }

  const create = async () => {
    const trimmed = name.trim()
    if (!trimmed || !createOrganization || !setActive) return
    setBusy('new')
    try {
      const org = await createOrganization({ name: trimmed })
      await setActive({ organization: org.id })
      toast.success(`${trimmed} is ready!`)
      router.replace('/admin')
    } catch (e: any) {
      toast.error(e?.errors?.[0]?.longMessage || 'Could not create the restaurant.')
      setBusy(null)
    }
  }

  const memberships = userMemberships?.data ?? []

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background-secondary)] p-4">
      <div className="w-full max-w-lg space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)] text-white shadow-md">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Welcome to {BRAND.name}</h1>
          <p className="mt-1 text-[var(--color-text-secondary)]">Pick a restaurant or create a new one to continue.</p>
        </div>

        {memberships.length > 0 && (
          <Card className="divide-y divide-[var(--color-border)]">
            {memberships.map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--color-info-bg)]">
                    <Building2 className="h-5 w-5 text-[var(--color-primary)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--color-text-primary)]">{m.organization.name}</p>
                    <p className="text-xs capitalize text-[var(--color-text-secondary)]">{m.role.replace('org:', '')}</p>
                  </div>
                </div>
                <Button size="sm" loading={busy === m.organization.id} onClick={() => choose(m.organization.id)}>
                  Open <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {userMemberships?.hasNextPage && (
              <div className="p-3 text-center">
                <Button variant="ghost" size="sm" onClick={() => userMemberships.fetchNext?.()}>
                  Show more
                </Button>
              </div>
            )}
          </Card>
        )}

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-[var(--color-text-primary)]">
            <Plus className="h-4 w-4" /> Create a new restaurant
          </h2>
          <label className="label" htmlFor="org-name">Restaurant name</label>
          <input
            id="org-name"
            className="input"
            placeholder="e.g. The Spice Route"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <Button className="mt-4 w-full" onClick={create} loading={busy === 'new'} disabled={!name.trim()}>
            Create restaurant
          </Button>
        </Card>
      </div>
    </div>
  )
}
