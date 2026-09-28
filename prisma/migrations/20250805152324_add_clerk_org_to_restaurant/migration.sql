/*
  Warnings:

  - You are about to drop the column `userId` on the `InventoryChangeLog` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[clerkOrgId]` on the table `Restaurant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[number,restaurantId]` on the table `Table` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clerkOrgId` to the `Restaurant` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add clerkOrgId column as nullable
ALTER TABLE "Restaurant" ADD COLUMN "clerkOrgId" TEXT;

-- Step 2: Populate clerkOrgId for existing restaurant rows with unique temporary values
UPDATE "Restaurant" SET "clerkOrgId" = 'temp_' || id WHERE "clerkOrgId" IS NULL;

-- Step 3: Alter clerkOrgId column to be NOT NULL
ALTER TABLE "Restaurant" ALTER COLUMN "clerkOrgId" SET NOT NULL;

-- Step 4: Add unique constraint on clerkOrgId
CREATE UNIQUE INDEX "Restaurant_clerkOrgId_key" ON "Restaurant"("clerkOrgId");

-- Step 5: Fix unique index for Table: drop old unique index and add composite unique index (table number + restaurant)
DROP INDEX IF EXISTS "Table_number_key";
CREATE UNIQUE INDEX "Table_number_restaurantId_key" ON "Table"("number", "restaurantId");

