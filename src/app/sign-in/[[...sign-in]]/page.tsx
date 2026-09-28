import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'
import { ChefHat } from 'lucide-react'
import { BRAND } from '@/lib/brand'

export const metadata = { title: 'Sign in' }

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-background-secondary)] px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-sm">
          <ChefHat className="h-5 w-5" />
        </span>
        <span className="text-xl font-bold text-[var(--color-text-primary)]">{BRAND.name}</span>
      </Link>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Welcome back</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Sign in to manage your restaurant</p>
      </div>
      <SignIn />
    </div>
  )
}
