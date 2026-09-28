/*
  Warnings:

  - You are about to drop the column `prepTime` on the `MenuItem` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedTime` on the `Order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[menuItemId,inventoryItemId]` on the table `MenuItemIngredient` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "MenuItem" DROP COLUMN "prepTime";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "estimatedTime";

-- CreateTable
CREATE TABLE "InventoryChangeLog" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "changeAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemIngredient_menuItemId_inventoryItemId_key" ON "MenuItemIngredient"("menuItemId", "inventoryItemId");

-- AddForeignKey
ALTER TABLE "InventoryChangeLog" ADD CONSTRAINT "InventoryChangeLog_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
