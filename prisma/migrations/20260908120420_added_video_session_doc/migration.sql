/*
  Warnings:

  - You are about to drop the column `reason_for_consultation` on the `consultations` table. All the data in the column will be lost.
  - Added the required column `reason_for_consultation` to the `consultation_notes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VideoSessionStatus" AS ENUM ('CREATED', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "consultation_notes" ADD COLUMN     "reason_for_consultation" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "consultations" DROP COLUMN "reason_for_consultation";

-- CreateTable
CREATE TABLE "video_sessions" (
    "id" TEXT NOT NULL,
    "consultation_id" TEXT NOT NULL,
    "room_sid" TEXT NOT NULL,
    "room_name" TEXT NOT NULL,
    "status" "VideoSessionStatus" NOT NULL DEFAULT 'CREATED',
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "recording_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "video_sessions_consultation_id_key" ON "video_sessions"("consultation_id");

-- CreateIndex
CREATE UNIQUE INDEX "video_sessions_room_sid_key" ON "video_sessions"("room_sid");

-- AddForeignKey
ALTER TABLE "video_sessions" ADD CONSTRAINT "video_sessions_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
