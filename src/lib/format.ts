const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'USD'
const LOCALE = process.env.NEXT_PUBLIC_LOCALE || 'en-US'

export function formatCurrency(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  try {
    return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(n)
  } catch {
    return `$${n.toFixed(2)}`
  }
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/\.?0+$/, '')
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString(LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  return `${Math.floor(hours / 24)} d ago`
}
