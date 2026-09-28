import Link from 'next/link'
import { SignedIn, SignedOut } from '@clerk/nextjs'
import {
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChefHat,
  Package,
  QrCode,
  ShoppingCart,
  Soup,
  Users,
} from 'lucide-react'
import { BRAND } from '@/lib/brand'

const features = [
  { icon: QrCode, title: 'QR table ordering', text: 'Every table gets its own QR code. Guests scan, browse your menu and order – no app, no waiting for a server.' },
  { icon: ShoppingCart, title: 'Live kitchen board', text: 'Orders appear instantly and move from pending to preparing, ready, served and paid with a single tap.' },
  { icon: Package, title: 'Inventory that updates itself', text: 'Each order deducts ingredients from stock, and sold-out dishes are hidden from guests automatically.' },
  { icon: Soup, title: 'Recipes & menu', text: 'Set exactly how much of each ingredient a serving uses and keep your menu, prices and photos up to date.' },
  { icon: Bell, title: 'Low-stock alerts', text: 'Get notified when an ingredient hits its minimum level, and alerts clear themselves once you restock.' },
  { icon: BarChart3, title: 'Sales analytics', text: 'Revenue trends, best sellers and your busiest hours, plus one-click Excel exports of your order history.' },
]

const steps = [
  { n: '1', title: 'Set up your restaurant', text: 'Create your menu, ingredients and recipes.' },
  { n: '2', title: 'Print your table QR codes', text: 'Add tables and print a code for each one.' },
  { n: '3', title: 'Take orders', text: 'Guests order from their phones; your team runs the live board.' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white shadow-sm"><ChefHat className="h-5 w-5" /></span>
            <span className="text-lg font-bold text-[var(--color-text-primary)]">{BRAND.name}</span>
          </Link>
          <div className="flex items-center gap-2">
            <SignedOut>
              <Link href="/sign-in" className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Sign in</Link>
              <Link href="/sign-up" className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--color-primary-hover)]">Get started</Link>
            </SignedOut>
            <SignedIn>
              <Link href="/admin" className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[var(--color-primary-hover)]">Open dashboard</Link>
            </SignedIn>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,var(--color-primary-100),transparent)] opacity-70" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-info-bg)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-primary)]"><QrCode className="h-4 w-4" /> Scan. Order. Serve.</span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-5xl">
              Run your whole restaurant from <span className="text-[var(--color-primary)]">one place</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-text-secondary)] lg:mx-0">
              QR table ordering, a live kitchen board, automatic inventory tracking and sales analytics – built for busy restaurants.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <SignedOut>
                <Link href="/sign-up" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-medium text-white shadow-sm hover:bg-[var(--color-primary-hover)]">Create your restaurant <ArrowRight className="h-4 w-4" /></Link>
                <Link href="/sign-in" className="inline-flex items-center justify-center rounded-lg border border-[var(--color-border-secondary)] bg-[var(--color-surface)] px-6 py-3 font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)]">Sign in</Link>
              </SignedOut>
              <SignedIn>
                <Link href="/admin" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3 font-medium text-white shadow-sm hover:bg-[var(--color-primary-hover)]">Go to your dashboard <ArrowRight className="h-4 w-4" /></Link>
              </SignedIn>
            </div>
          </div>

          <div aria-hidden className="relative mx-auto w-full max-w-md">
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div><p className="text-xs text-[var(--color-text-secondary)]">Live orders</p><p className="text-lg font-bold text-[var(--color-text-primary)]">3 in the kitchen</p></div>
                <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-success-bg)] px-2.5 py-1 text-xs font-medium text-[var(--color-success)]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-success)]" /> Live</span>
              </div>
              {[
                { t: 4, items: '2× Margherita, 1× Lemonade', s: 'Preparing', tone: 'info' },
                { t: 7, items: '1× Paneer Tikka, 2× Naan', s: 'Pending', tone: 'warning' },
                { t: 2, items: '3× Cold Coffee', s: 'Ready', tone: 'success' },
              ].map((o) => (
                <div key={o.t} className="mb-2.5 flex items-center gap-3 rounded-xl border border-[var(--color-border)] p-3 last:mb-0">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-background-tertiary)] text-sm font-bold">T{o.t}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-primary)]">{o.items}</span>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ background: `var(--color-${o.tone}-bg)`, color: `var(--color-${o.tone === 'info' ? 'info' : o.tone})` }}>{o.s}</span>
                </div>
              ))}
            </div>
            <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-xl sm:block">
              <div className="flex items-center gap-3"><QrCode className="h-10 w-10 text-[var(--color-primary)]" /><div><p className="text-xs text-[var(--color-text-secondary)]">Table 4</p><p className="text-sm font-semibold">Scan to order</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">Everything you need, nothing you don&apos;t</h2>
            <p className="mt-3 text-[var(--color-text-secondary)]">From the moment a guest sits down to the end-of-day numbers.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)] p-6 transition-shadow hover:shadow-md">
                <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-info-bg)] text-[var(--color-primary)]"><f.icon className="h-5 w-5" /></span>
                <h3 className="font-semibold text-[var(--color-text-primary)]">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="mb-10 text-center text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">Up and running in three steps</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="text-center">
                <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)] text-lg font-bold text-white">{s.n}</span>
                <h3 className="font-semibold text-[var(--color-text-primary)]">{s.title}</h3>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{s.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-2xl bg-[var(--color-primary)] p-8 text-center text-white shadow-lg sm:p-10">
            <h2 className="text-2xl font-bold">Ready to take your first QR order?</h2>
            <p className="mx-auto mt-2 max-w-md text-white/85">Create your restaurant, add a table and scan the code – it takes a few minutes.</p>
            <SignedOut><Link href="/sign-up" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-[var(--color-primary)] hover:bg-white/90">Get started <ArrowRight className="h-4 w-4" /></Link></SignedOut>
            <SignedIn><Link href="/admin" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-[var(--color-primary)] hover:bg-white/90">Open dashboard <ArrowRight className="h-4 w-4" /></Link></SignedIn>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-[var(--color-text-secondary)] sm:flex-row sm:px-6">
          <span className="flex items-center gap-2"><ChefHat className="h-4 w-4 text-[var(--color-primary)]" /> {BRAND.name}</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" /> {BRAND.tagline}</span>
        </div>
      </footer>
    </div>
  )
}
