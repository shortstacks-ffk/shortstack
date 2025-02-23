-- CreateEnum
CREATE TYPE "BillStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "schoolName" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Bill" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "status" "BillStatus" NOT NULL DEFAULT 'PENDING',
    "classId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentBill" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentBill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bill_classId_idx" ON "Bill"("classId");

-- CreateIndex
CREATE INDEX "StudentBill_billId_idx" ON "StudentBill"("billId");

-- CreateIndex
CREATE INDEX "StudentBill_studentId_idx" ON "StudentBill"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentBill_billId_studentId_key" ON "StudentBill"("billId", "studentId");

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBill" ADD CONSTRAINT "StudentBill_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBill" ADD CONSTRAINT "StudentBill_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
