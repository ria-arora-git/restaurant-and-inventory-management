export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'PAID' | 'CANCELLED'

export const STATUS_META: Record<OrderStatus, { label: string; tone: 'warning' | 'info' | 'success' | 'neutral' | 'error' }> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  PREPARING: { label: 'Preparing', tone: 'info' },
  READY: { label: 'Ready', tone: 'success' },
  SERVED: { label: 'Served', tone: 'neutral' },
  PAID: { label: 'Paid', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'error' },
}

export const NEXT_STATUS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  PENDING: { to: 'PREPARING', label: 'Start preparing' },
  PREPARING: { to: 'READY', label: 'Mark ready' },
  READY: { to: 'SERVED', label: 'Mark served' },
  SERVED: { to: 'PAID', label: 'Mark paid' },
}

export const ACTIVE_STATUSES: OrderStatus[] = ['PENDING', 'PREPARING', 'READY', 'SERVED']
