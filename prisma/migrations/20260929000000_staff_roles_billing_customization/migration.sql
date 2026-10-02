-- Ingredient customization: a recipe ingredient can be marked as customer-removable.
ALTER TABLE "MenuItemIngredient" ADD COLUMN "removable" BOOLEAN NOT NULL DEFAULT false;

-- Track which removable ingredients a customer asked to leave out of an order line.
ALTER TABLE "OrderItem" ADD COLUMN "removedIngredients" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Consolidated bill generated when a table is closed out.
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "tableNumber" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Bill" ADD CONSTRAINT "Bill_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Link orders to the bill they were settled on.
ALTER TABLE "Order" ADD COLUMN "billId" TEXT;
ALTER TABLE "Order" ADD CONSTRAINT "Order_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;
