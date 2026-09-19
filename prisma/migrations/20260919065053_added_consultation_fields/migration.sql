/*
  Warnings:

  - Added the required column `requested_professional_type` to the `consultations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ConsultationStatus" ADD VALUE 'PENDING_ACCEPTANCE';

-- DropForeignKey
ALTER TABLE "consultations" DROP CONSTRAINT "consultations_professional_id_fkey";

-- AlterTable
ALTER TABLE "consultations" ADD COLUMN     "assigned_at" TIMESTAMP(3),
ADD COLUMN     "assigned_by" TEXT,
ADD COLUMN     "requested_professional_type" "ProfessionalType" NOT NULL,
ADD COLUMN     "requested_specialty" TEXT,
ALTER COLUMN "professional_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "healthcare_professionals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
