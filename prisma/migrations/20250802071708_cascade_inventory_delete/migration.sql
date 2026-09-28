/*
  Warnings:

  - You are about to drop the column `maxStock` on the `InventoryItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "MenuItemIngredient" DROP CONSTRAINT "MenuItemIngredient_inventoryItemId_fkey";

-- AlterTable
ALTER TABLE "InventoryItem" DROP COLUMN "maxStock";

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
