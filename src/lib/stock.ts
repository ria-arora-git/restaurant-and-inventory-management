import type { Prisma } from '@prisma/client'

/**
 * Keeps LOW_STOCK alerts in sync with an inventory item's current level:
 *  - at/below the minimum  -> make sure exactly one open alert exists
 *  - back above the minimum -> resolve any open alerts
 */
export async function syncStockAlert(
  tx: Prisma.TransactionClient,
  item: { id: string; name: string; unit: string; quantity: number; minStock: number }
) {
  const open = await tx.stockAlert.findFirst({
    where: { inventoryItemId: item.id, alertType: 'LOW_STOCK', acknowledged: false },
  })
  const message = `${item.name} running low (${item.quantity} ${item.unit})`

  if (item.quantity <= item.minStock) {
    if (open) {
      if (open.message !== message) {
        await tx.stockAlert.update({ where: { id: open.id }, data: { message, threshold: item.minStock } })
      }
    } else {
      await tx.stockAlert.create({
        data: { inventoryItemId: item.id, alertType: 'LOW_STOCK', threshold: item.minStock, message },
      })
    }
  } else if (open) {
    await tx.stockAlert.updateMany({
      where: { inventoryItemId: item.id, alertType: 'LOW_STOCK', acknowledged: false },
      data: { acknowledged: true },
    })
  }
}
