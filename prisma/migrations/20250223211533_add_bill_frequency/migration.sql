/*
  Warnings:

  - You are about to drop the column `classId` on the `Bill` table. All the data in the column will be lost.
  - Added the required column `frequency` to the `Bill` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BillFrequency" AS ENUM ('ONCE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- DropForeignKey
ALTER TABLE "Bill" DROP CONSTRAINT "Bill_classId_fkey";

-- DropIndex
DROP INDEX "Bill_classId_idx";

-- AlterTable
ALTER TABLE "Bill" DROP COLUMN "classId",
ADD COLUMN     "frequency" "BillFrequency" NOT NULL;

-- CreateTable
CREATE TABLE "_BillToClass" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BillToClass_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_BillToClass_B_index" ON "_BillToClass"("B");

-- AddForeignKey
ALTER TABLE "_BillToClass" ADD CONSTRAINT "_BillToClass_A_fkey" FOREIGN KEY ("A") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BillToClass" ADD CONSTRAINT "_BillToClass_B_fkey" FOREIGN KEY ("B") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
