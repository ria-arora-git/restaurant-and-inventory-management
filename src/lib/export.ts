import { formatCurrency } from '@/lib/format'
import type { OrderRow } from '@/types'

/** Client-side XLSX export (exceljs is loaded lazily so it stays out of the main bundle). */
export async function exportOrders(orders: OrderRow[], filename = 'orders') {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([import('exceljs'), import('file-saver')])

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Orders')
  sheet.columns = [
    { header: 'Order #', key: 'orderNumber', width: 18 },
    { header: 'Date', key: 'date', width: 22 },
    { header: 'Table', key: 'table', width: 8 },
    { header: 'Customer', key: 'customer', width: 22 },
    { header: 'Items', key: 'items', width: 48 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Total', key: 'total', width: 14 },
  ]
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
  })

  orders.forEach((o) =>
    sheet.addRow({
      orderNumber: o.orderNumber,
      date: new Date(o.createdAt).toLocaleString(),
      table: o.table.number,
      customer: o.customerName,
      items: o.items.map((i) => `${i.quantity}× ${i.menuItem.name}`).join(', '),
      status: o.status,
      total: formatCurrency(o.total),
    })
  )

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`
  )
}
