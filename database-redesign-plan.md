# Database Redesign Plan for Individual Property Tracking

## Current State Analysis
The current schema already has an `Auction` model with most required fields:
- ✅ address, suburb, state, postcode
- ✅ price, result, auctionDate
- ✅ propertyType, bedrooms, bathrooms, carSpaces
- ✅ agentName, agencyName
- ✅ source (domain/rea)
- ❌ Missing: propertyUrl (link to original listing)

## Enhanced Schema Design

### Primary Changes
1. **Add propertyUrl field** to Auction model
2. **Enhance unique constraint** to prevent duplicates across sources
3. **Add indexes** for better search performance
4. **Update scrapers** to extract property URLs
5. **Redesign dashboard** to show individual properties with search/filter

### Updated Auction Model
```prisma
model Auction {
  id            String   @id @default(cuid())
  address       String
  suburb        String
  state         String
  postcode      String
  price         Int?
  result        String   // sold, passed_in, withdrawn
  auctionDate   DateTime
  source        String   // domain, rea
  propertyType  String
  bedrooms      Int?
  bathrooms     Int?
  carSpaces     Int?
  agentName     String?
  agencyName    String?
  propertyUrl   String?  // NEW: Link to original property listing
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([address, auctionDate, source]) // Enhanced to prevent cross-source duplicates
  @@index([suburb, state])
  @@index([auctionDate])
  @@index([result])
  @@index([propertyType])
}
```

### Dashboard Enhancement
- Replace suburb-aggregated view with individual property listing
- Add search by suburb, address, agent
- Add filters for result, property type, date range
- Show property details with link to original listing
- Maintain pagination for performance

## Implementation Tasks
1. Database migration for new schema
2. Update scrapers to extract property URLs
3. Enhance deduplication logic
4. Redesign dashboard UI for individual properties
5. Update API endpoints for property search
6. Add comprehensive filtering and sorting