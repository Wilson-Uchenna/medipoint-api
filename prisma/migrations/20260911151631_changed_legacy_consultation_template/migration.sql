/*
  Warnings:

  - You are about to drop the column `created_by` on the `consultation_notes` table. All the data in the column will be lost.
  - Added the required column `reported_by` to the `consultation_notes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "consultation_notes" DROP COLUMN "created_by",
ADD COLUMN     "documented_by" TEXT,
ADD COLUMN     "reported_by" TEXT NOT NULL;
