-- CreateIndex
CREATE INDEX "Auction_suburb_state_idx" ON "Auction"("suburb", "state");

-- CreateIndex
CREATE INDEX "Auction_result_idx" ON "Auction"("result");

-- CreateIndex
CREATE INDEX "Auction_propertyType_idx" ON "Auction"("propertyType");

-- AlterTable
ALTER TABLE "Auction" ADD COLUMN "propertyUrl" TEXT;

-- DropIndex
DROP INDEX "Auction_suburb_idx";

-- DropIndex
DROP INDEX "Auction_address_auctionDate_key";

-- CreateIndex
CREATE UNIQUE INDEX "Auction_address_auctionDate_source_key" ON "Auction"("address", "auctionDate", "source");