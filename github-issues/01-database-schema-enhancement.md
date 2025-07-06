# Database Schema: Add propertyUrl field to Auction model

## Overview
Add propertyUrl field to the Auction model to store links to original property listings from Domain and REA.

## Tasks
- [ ] Add propertyUrl field to Prisma schema
- [ ] Create database migration
- [ ] Update unique constraint to include source
- [ ] Add indexes for better search performance
- [ ] Test migration on development database

## Acceptance Criteria
- propertyUrl field is added as optional String
- Unique constraint updated to [address, auctionDate, source]
- Migration runs successfully without data loss
- Indexes added for suburb+state, result, and propertyType

## Labels
- database
- enhancement
- high-priority