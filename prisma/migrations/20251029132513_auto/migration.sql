-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR', 'GBP', 'NGN');

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "balance" DECIMAL(19,4) NOT NULL DEFAULT 0.00,
    "currency" "Currency" NOT NULL DEFAULT 'NGN',
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "wallet_status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "user_id" TEXT NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_account_number_key" ON "wallets"("account_number");

-- CreateIndex
CREATE INDEX "wallets_account_number_idx" ON "wallets"("account_number");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_currency_key" ON "wallets"("user_id", "currency");

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
