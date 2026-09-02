/*
  Warnings:

  - The values [PHYSICAL] on the enum `ConsultationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ConsultationType_new" AS ENUM ('VIRTUAL');
ALTER TABLE "consultations" ALTER COLUMN "consultation_type" TYPE "ConsultationType_new" USING ("consultation_type"::text::"ConsultationType_new");
ALTER TYPE "ConsultationType" RENAME TO "ConsultationType_old";
ALTER TYPE "ConsultationType_new" RENAME TO "ConsultationType";
DROP TYPE "public"."ConsultationType_old";
COMMIT;
