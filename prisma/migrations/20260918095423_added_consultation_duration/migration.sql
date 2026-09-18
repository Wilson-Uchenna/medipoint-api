/*
  Warnings:

  - Added the required column `duration` to the `consultations` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ConsultationDuration" AS ENUM ('MIN_15', 'MIN_30', 'HOUR_1');

-- AlterTable
ALTER TABLE "consultations" ADD COLUMN     "duration" "ConsultationDuration" NOT NULL;
