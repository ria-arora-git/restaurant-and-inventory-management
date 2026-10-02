import type { OrderStatus } from '@/lib/status'

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  prepTime: number | null
  category: string
  image: string | null
  available?: boolean
  ingredients?: { id: string; quantity: number; removable: boolean; inventoryItem: InventoryItem }[]
  customizations?: { id: string; name: string }[]
}

export interface InventoryItem {
  id: string
  name: string
  quantity: number
  unit: string
  minStock: number
  alerts?: StockAlert[]
  ingredients?: { id: string; quantity: number; menuItem: { id: string; name: string } }[]
}

export interface StockAlert {
  id: string
  alertType: string
  threshold?: number
  message: string
  acknowledged: boolean
  createdAt: string
  inventoryItem?: InventoryItem
}

export interface TableRow {
  id: string
  number: number
  capacity: number
  status: 'AVAILABLE' | 'OCCUPIED'
  token: string
  orders?: { id: string; total: number; status: string; createdAt: string }[]
}

export interface OrderItemRow {
  id: string
  quantity: number
  price: number
  notes: string | null
  removedIngredients: string[]
  menuItem: { id: string; name: string }
}

export interface OrderRow {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string | null
  status: OrderStatus
  total: number
  notes: string | null
  createdAt: string
  updatedAt: string
  table: { id: string; number: number }
  items: OrderItemRow[]
}

export interface RecipeRow {
  id: string
  quantity: number
  removable: boolean
  menuItem: MenuItem
  inventoryItem: InventoryItem
}

export interface BillRow {
  id: string
  tableNumber: number
  customerName: string
  customerPhone: string | null
  subtotal: number
  total: number
  createdAt: string
  orders: OrderRow[]
}
