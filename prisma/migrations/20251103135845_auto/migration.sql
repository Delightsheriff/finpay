/*
  Warnings:

  - You are about to drop the column `middle_name` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "VirtualAccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CLOSED');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "middle_name";

-- CreateTable
CREATE TABLE "virtual_accounts" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "balance_id" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'NGN',
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "provider_reference" TEXT NOT NULL,
    "status" "VirtualAccountStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "virtual_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "virtual_accounts_balance_id_key" ON "virtual_accounts"("balance_id");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_accounts_account_number_key" ON "virtual_accounts"("account_number");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_accounts_provider_account_id_key" ON "virtual_accounts"("provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_accounts_provider_reference_key" ON "virtual_accounts"("provider_reference");

-- CreateIndex
CREATE INDEX "virtual_accounts_balance_id_idx" ON "virtual_accounts"("balance_id");

-- AddForeignKey
ALTER TABLE "virtual_accounts" ADD CONSTRAINT "virtual_accounts_balance_id_fkey" FOREIGN KEY ("balance_id") REFERENCES "currency_balances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
