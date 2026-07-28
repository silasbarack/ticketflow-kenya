/*
  Warnings:

  - You are about to drop the column `effective_range` on the `tax_rules` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TaxAdjustmentCategory" AS ENUM ('INPUT_VAT', 'WITHHOLDING_VAT_CREDIT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'OTHER');

-- DropForeignKey
ALTER TABLE "organizer_tax_profiles" DROP CONSTRAINT "organizer_tax_profiles_organizerId_fkey";

-- DropForeignKey
ALTER TABLE "refund_tax_calculations" DROP CONSTRAINT "refund_tax_calculations_orderId_fkey";

-- DropForeignKey
ALTER TABLE "tax_calculations" DROP CONSTRAINT "tax_calculations_eventId_fkey";

-- DropForeignKey
ALTER TABLE "tax_calculations" DROP CONSTRAINT "tax_calculations_orderId_fkey";

-- DropForeignKey
ALTER TABLE "tax_calculations" DROP CONSTRAINT "tax_calculations_organizerId_fkey";

-- DropForeignKey
ALTER TABLE "tax_etims_documents" DROP CONSTRAINT "tax_etims_documents_orderId_fkey";

-- AlterTable
ALTER TABLE "tax_adjustments" ADD COLUMN     "category" "TaxAdjustmentCategory" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "tax_rules" DROP COLUMN "effective_range";
