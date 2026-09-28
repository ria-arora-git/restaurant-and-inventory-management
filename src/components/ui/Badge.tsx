import React from 'react'

export type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'

const tones: Record<Tone, string> = {
  success: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]',
  warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]',
  error: 'bg-[var(--color-error-bg)] text-[var(--color-error)] border-[var(--color-error-border)]',
  info: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info-border)]',
  primary: 'bg-[var(--color-info-bg)] text-[var(--color-primary)] border-[var(--color-info-border)]',
  neutral: 'bg-[var(--color-background-tertiary)] text-[var(--color-text-secondary)] border-[var(--color-border)]',
}

export function Badge({
  tone = 'neutral',
  className = '',
  children,
}: {
  tone?: Tone
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
