/*
  Warnings:

  - The values [PENDING] on the enum `BillStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `classId` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `cadence` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `classId` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `classId` on the `LessonPlan` table. All the data in the column will be lost.
  - You are about to drop the column `classId` on the `StoreItem` table. All the data in the column will be lost.
  - You are about to drop the column `classId` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Todo` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `TeacherProfile` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `teacherId` to the `Assignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacherId` to the `Class` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacherId` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacherId` to the `LessonPlan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacherId` to the `StoreItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teacherId` to the `Todo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "BillStatus_new" AS ENUM ('ACTIVE', 'DUE', 'LATE', 'PAID', 'PARTIAL', 'CANCELLED');
ALTER TABLE "Bill" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Bill" ALTER COLUMN "status" TYPE "BillStatus_new" USING ("status"::text::"BillStatus_new");
ALTER TYPE "BillStatus" RENAME TO "BillStatus_old";
ALTER TYPE "BillStatus_new" RENAME TO "BillStatus";
DROP TYPE "BillStatus_old";
ALTER TABLE "Bill" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_classId_fkey";

-- DropForeignKey
ALTER TABLE "Bill" DROP CONSTRAINT "Bill_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "CalendarEvent" DROP CONSTRAINT "CalendarEvent_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Class" DROP CONSTRAINT "Class_userId_fkey";

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_classId_fkey";

-- DropForeignKey
ALTER TABLE "LessonPlan" DROP CONSTRAINT "LessonPlan_classId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_classId_fkey";

-- DropForeignKey
ALTER TABLE "TeacherProfile" DROP CONSTRAINT "TeacherProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "Todo" DROP CONSTRAINT "Todo_userId_fkey";

-- DropIndex
DROP INDEX "Class_userId_idx";

-- DropIndex
DROP INDEX "LessonPlan_classId_idx";

-- DropIndex
DROP INDEX "StoreItem_classId_idx";

-- DropIndex
DROP INDEX "Student_classId_idx";

-- DropIndex
DROP INDEX "Todo_userId_idx";

-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "classId",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "teacherId" TEXT NOT NULL,
ADD COLUMN     "textAssignment" TEXT,
ALTER COLUMN "size" DROP NOT NULL,
ALTER COLUMN "url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "monthlyDate" INTEGER,
ADD COLUMN     "recurrenceEnd" TIMESTAMP(3),
ADD COLUMN     "recurrenceInterval" INTEGER,
ADD COLUMN     "recurrenceType" TEXT,
ADD COLUMN     "yearlyDate" INTEGER,
ADD COLUMN     "yearlyMonth" INTEGER;

-- AlterTable
ALTER TABLE "Class" DROP COLUMN "cadence",
DROP COLUMN "userId",
ADD COLUMN     "teacherId" TEXT NOT NULL,
ADD COLUMN     "teacherName" TEXT;

-- AlterTable
ALTER TABLE "File" DROP COLUMN "classId",
ADD COLUMN     "teacherId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "LessonPlan" DROP COLUMN "classId",
ADD COLUMN     "teacherId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StoreItem" DROP COLUMN "classId",
ADD COLUMN     "teacherId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "classId",
ADD COLUMN     "teacherName" TEXT;

-- AlterTable
ALTER TABLE "Todo" DROP COLUMN "userId",
ADD COLUMN     "teacherId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "firstName",
DROP COLUMN "lastName";

-- DropTable
DROP TABLE "TeacherProfile";

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "profileImage" TEXT,
    "bio" TEXT,
    "institution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ClassFiles" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClassFiles_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ClassLessonPlans" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClassLessonPlans_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ClassAssignments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ClassAssignments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ExcludedFromBill" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ExcludedFromBill_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE INDEX "Teacher_userId_idx" ON "Teacher"("userId");

-- CreateIndex
CREATE INDEX "_ClassFiles_B_index" ON "_ClassFiles"("B");

-- CreateIndex
CREATE INDEX "_ClassLessonPlans_B_index" ON "_ClassLessonPlans"("B");

-- CreateIndex
CREATE INDEX "_ClassAssignments_B_index" ON "_ClassAssignments"("B");

-- CreateIndex
CREATE INDEX "_ExcludedFromBill_B_index" ON "_ExcludedFromBill"("B");

-- CreateIndex
CREATE INDEX "Assignment_teacherId_idx" ON "Assignment"("teacherId");

-- CreateIndex
CREATE INDEX "Class_teacherId_idx" ON "Class"("teacherId");

-- CreateIndex
CREATE INDEX "Enrollment_classId_idx" ON "Enrollment"("classId");

-- CreateIndex
CREATE INDEX "Enrollment_studentId_idx" ON "Enrollment"("studentId");

-- CreateIndex
CREATE INDEX "File_teacherId_idx" ON "File"("teacherId");

-- CreateIndex
CREATE INDEX "LessonPlan_teacherId_idx" ON "LessonPlan"("teacherId");

-- CreateIndex
CREATE INDEX "StoreItem_teacherId_idx" ON "StoreItem"("teacherId");

-- CreateIndex
CREATE INDEX "Student_teacherId_idx" ON "Student"("teacherId");

-- CreateIndex
CREATE INDEX "Todo_teacherId_idx" ON "Todo"("teacherId");

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlan" ADD CONSTRAINT "LessonPlan_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreItem" ADD CONSTRAINT "StoreItem_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassFiles" ADD CONSTRAINT "_ClassFiles_A_fkey" FOREIGN KEY ("A") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassFiles" ADD CONSTRAINT "_ClassFiles_B_fkey" FOREIGN KEY ("B") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassLessonPlans" ADD CONSTRAINT "_ClassLessonPlans_A_fkey" FOREIGN KEY ("A") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassLessonPlans" ADD CONSTRAINT "_ClassLessonPlans_B_fkey" FOREIGN KEY ("B") REFERENCES "LessonPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassAssignments" ADD CONSTRAINT "_ClassAssignments_A_fkey" FOREIGN KEY ("A") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassAssignments" ADD CONSTRAINT "_ClassAssignments_B_fkey" FOREIGN KEY ("B") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExcludedFromBill" ADD CONSTRAINT "_ExcludedFromBill_A_fkey" FOREIGN KEY ("A") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExcludedFromBill" ADD CONSTRAINT "_ExcludedFromBill_B_fkey" FOREIGN KEY ("B") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
