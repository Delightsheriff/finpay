/*
  Warnings:

  - You are about to drop the column `account_name` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `account_number` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `balance` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `wallets` table. All the data in the column will be lost.
  - You are about to drop the column `wallet_status` on the `wallets` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `wallets` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."wallets" DROP CONSTRAINT "wallets_user_id_fkey";

-- DropIndex
DROP INDEX "public"."wallets_account_number_idx";

-- DropIndex
DROP INDEX "public"."wallets_account_number_key";

-- DropIndex
DROP INDEX "public"."wallets_user_id_currency_key";

-- AlterTable
ALTER TABLE "wallets" DROP COLUMN "account_name",
DROP COLUMN "account_number",
DROP COLUMN "balance",
DROP COLUMN "currency",
DROP COLUMN "wallet_status";

-- DropEnum
DROP TYPE "public"."WalletStatus";

-- CreateTable
CREATE TABLE "currency_balances" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "balance" DECIMAL(19,4) NOT NULL DEFAULT 0.00,

    CONSTRAINT "currency_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "currency_balances_wallet_id_idx" ON "currency_balances"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "currency_balances_wallet_id_currency_key" ON "currency_balances"("wallet_id", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- AddForeignKey
ALTER TABLE "currency_balances" ADD CONSTRAINT "currency_balances_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
