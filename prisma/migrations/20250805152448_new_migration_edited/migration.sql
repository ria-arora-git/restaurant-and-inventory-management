/*
  Warnings:

  - You are about to drop the column `userId` on the `InventoryChangeLog` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_restaurantId_fkey";

-- AlterTable
ALTER TABLE "InventoryChangeLog" DROP COLUMN "userId";

-- DropTable
DROP TABLE "User";
