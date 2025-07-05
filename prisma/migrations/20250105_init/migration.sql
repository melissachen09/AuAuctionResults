-- CreateTable
CREATE TABLE "Auction" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "price" INTEGER,
    "result" TEXT NOT NULL,
    "auctionDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "carSpaces" INTEGER,
    "agentName" TEXT,
    "agencyName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Auction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuburbStats" (
    "id" TEXT NOT NULL,
    "suburb" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalAuctions" INTEGER NOT NULL,
    "soldCount" INTEGER NOT NULL,
    "passedInCount" INTEGER NOT NULL,
    "withdrawnCount" INTEGER NOT NULL,
    "clearanceRate" DOUBLE PRECISION NOT NULL,
    "averagePrice" DOUBLE PRECISION,
    "medianPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuburbStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapeLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "recordCount" INTEGER,
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Auction_address_auctionDate_key" ON "Auction"("address", "auctionDate");
CREATE INDEX "Auction_suburb_idx" ON "Auction"("suburb");
CREATE INDEX "Auction_auctionDate_idx" ON "Auction"("auctionDate");
CREATE UNIQUE INDEX "SuburbStats_suburb_state_date_key" ON "SuburbStats"("suburb", "state", "date");
CREATE INDEX "SuburbStats_date_idx" ON "SuburbStats"("date");
CREATE INDEX "ScrapeLog_source_startTime_idx" ON "ScrapeLog"("source", "startTime");
