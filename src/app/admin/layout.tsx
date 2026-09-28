'use client'

import { ReactNode, useEffect } from 'react'
import { useOrganization } from '@clerk/nextjs'
import { usePathname, useRouter } from 'next/navigation'
import AdminNavbar from '@/components/AdminNavbar'
import { PageLoader } from '@/components/ui/Page'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { organization, isLoaded } = useOrganization()
  const pathname = usePathname()
  const router = useRouter()
  const onSelectPage = pathname === '/admin/select-organization'

  useEffect(() => {
    if (isLoaded && !organization && !onSelectPage) router.replace('/admin/select-organization')
  }, [isLoaded, organization, onSelectPage, router])

  if (onSelectPage) return <>{children}</>
  if (!isLoaded || !organization) return <PageLoader label="Loading your restaurant…" />

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)]">
      <AdminNavbar />
      <main>{children}</main>
    </div>
  )
}
