# 🏠 Restructure Dashboard to Display Individual Properties with Multi-Source Scraping

## 📋 Overview

The current dashboard displays aggregated suburb statistics, but we need to display individual property auction results instead. We also need to implement comprehensive scraping from both Domain and REA with proper deduplication.

## 🎯 Current State vs. Target State

### Current State ❌
- Dashboard shows suburb-level aggregated statistics (clearance rates, median prices)
- Limited data sources (primarily Domain)
- No individual property details visible to users

### Target State ✅
- Dashboard displays individual property listings
- Each property shows: suburb, address, agency, agent, property type, bedrooms, sold price, property link
- Data sourced from both Domain and REA
- Automatic deduplication of properties across sources
- City/state-based filtering and pagination

## 🚀 Epic Breakdown

### Epic 1: Database Schema Updates
**Estimated Time: 2-3 hours**

#### Task 1.1: Update Auction Model Schema
- [ ] Add `propertyLink` field to store property URL
- [ ] Ensure all required fields are properly indexed
- [ ] Add composite unique constraint on `address + suburb + auctionDate` for deduplication
- [ ] Add `sourcePropertyId` field to track original listing IDs from each platform

#### Task 1.2: Create Database Migration
- [ ] Write Prisma migration for schema updates
- [ ] Test migration on local database
- [ ] Prepare production migration script

### Epic 2: Enhanced Scraping Infrastructure  
**Estimated Time: 5-7 hours**

#### Task 2.1: Enhance Domain Scraper
- [ ] Extract property links from Domain listings
- [ ] Capture agent/agency information more reliably
- [ ] Add support for city/state-specific scraping
- [ ] Implement proper error handling and rate limiting

#### Task 2.2: Build Comprehensive REA Scraper
- [ ] Create REA auction results scraper
- [ ] Extract all required fields (suburb, address, agency, agent, property type, bedrooms, price, link)
- [ ] Implement city/state filtering
- [ ] Add proper error handling and retry logic

#### Task 2.3: Create Unified Scraper Service
- [ ] Build orchestration service to run both scrapers
- [ ] Implement data normalization across sources
- [ ] Add deduplication logic based on address + suburb
- [ ] Create scraping scheduler for regular updates

#### Task 2.4: Deduplication System
- [ ] Implement fuzzy address matching algorithm
- [ ] Create property matching based on location + date
- [ ] Handle different address formats between platforms
- [ ] Prioritize data sources (e.g., prefer Domain over REA for price accuracy)

### Epic 3: API Restructuring
**Estimated Time: 3-4 hours**

#### Task 3.1: Create Individual Properties API
- [ ] Build `/api/properties` endpoint with filtering
- [ ] Add pagination, sorting, and search functionality
- [ ] Implement filtering by city, state, property type, date range
- [ ] Add property detail endpoint `/api/properties/[id]`

#### Task 3.2: Update Existing APIs
- [ ] Maintain backward compatibility for suburb stats
- [ ] Update response schemas
- [ ] Add proper error handling and validation

### Epic 4: Frontend Dashboard Redesign
**Estimated Time: 4-6 hours**

#### Task 4.1: Create Property Listing Components
- [ ] Build `PropertyCard` component for individual listings
- [ ] Create `PropertyTable` component with sorting/filtering
- [ ] Add property detail modal/page
- [ ] Implement responsive design for mobile

#### Task 4.2: Update Dashboard Page
- [ ] Replace suburb statistics with property listings
- [ ] Add advanced filtering UI (city, state, property type, price range, date)
- [ ] Implement search functionality
- [ ] Add export functionality (CSV/Excel)

#### Task 4.3: Property Detail View
- [ ] Create individual property detail page
- [ ] Show property images (if available)
- [ ] Display auction history and comparable sales
- [ ] Add external links to original listings

### Epic 5: Data Quality & Performance
**Estimated Time: 2-3 hours**

#### Task 5.1: Data Validation & Cleanup
- [ ] Implement data quality checks
- [ ] Add address standardization
- [ ] Create data cleanup scripts for existing records
- [ ] Add data validation rules

#### Task 5.2: Performance Optimization
- [ ] Add database indexes for common queries
- [ ] Implement caching for frequently accessed data
- [ ] Optimize API response sizes
- [ ] Add pagination optimization

### Epic 6: Testing & Documentation
**Estimated Time: 2-3 hours**

#### Task 6.1: Testing
- [ ] Write unit tests for scraping functions
- [ ] Add integration tests for API endpoints
- [ ] Test deduplication logic with real data
- [ ] Performance testing with large datasets

#### Task 6.2: Documentation
- [ ] Update API documentation
- [ ] Create scraping configuration guide
- [ ] Document deduplication algorithm
- [ ] Add deployment instructions

## 📋 Detailed Requirements

### Data Fields Required for Each Property

```typescript
interface PropertyListing {
  id: string;
  suburb: string;
  address: string;
  agency: string;
  agent: string;
  propertyType: 'House' | 'Apartment' | 'Townhouse' | 'Unit' | 'Villa';
  bedrooms: number | null;
  bathrooms: number | null;
  carSpaces: number | null;
  soldPrice: number | null;
  result: 'sold' | 'passed_in' | 'withdrawn';
  auctionDate: Date;
  propertyLink: string; // Link to original listing
  source: 'domain' | 'rea';
  sourcePropertyId?: string; // Original platform ID
  createdAt: Date;
  updatedAt: Date;
}
```

### Dashboard Filtering Options
- **Location**: City, State, Suburb
- **Property Type**: House, Apartment, Townhouse, etc.
- **Bedrooms**: 1, 2, 3, 4, 5+
- **Price Range**: Custom min/max
- **Date Range**: Last week, month, quarter, custom
- **Auction Result**: Sold, Passed In, Withdrawn
- **Source**: Domain, REA, Both

### Scraping Targets

#### Domain Sources
- `https://www.domain.com.au/auction-results/sydney/`
- `https://www.domain.com.au/auction-results/melbourne/`
- `https://www.domain.com.au/auction-results/brisbane/`
- `https://www.domain.com.au/auction-results/perth/`
- `https://www.domain.com.au/auction-results/adelaide/`

#### REA Sources  
- `https://www.realestate.com.au/auction-results/`
- State-specific pages
- Suburb-specific results

## ⚙️ Technical Implementation Notes

### Deduplication Strategy
1. **Primary Key**: `address + suburb + auctionDate`
2. **Fuzzy Matching**: Handle address variations (St vs Street, Rd vs Road)
3. **Conflict Resolution**: 
   - Prefer Domain for price accuracy
   - Prefer REA for agent/agency details
   - Merge complementary data

### Database Schema Updates
```sql
-- Add new fields to Auction table
ALTER TABLE "Auction" ADD COLUMN "propertyLink" TEXT;
ALTER TABLE "Auction" ADD COLUMN "sourcePropertyId" TEXT;

-- Add composite unique constraint for deduplication
CREATE UNIQUE INDEX "auction_unique_property" ON "Auction"("address", "suburb", "auctionDate");
```

### API Endpoints Structure
```
GET /api/properties?city=sydney&page=1&limit=20&sortBy=soldPrice&sortOrder=desc
GET /api/properties/[id]
GET /api/properties/search?q=address&city=sydney
GET /api/properties/export?format=csv&filters=...
```

## 🎯 Success Criteria

1. **Data Coverage**: 
   - ✅ Scraping from both Domain and REA
   - ✅ 95%+ accuracy in property details
   - ✅ Less than 5% duplicate records after deduplication

2. **User Experience**:
   - ✅ Dashboard loads individual properties in <2 seconds
   - ✅ Search and filtering works smoothly
   - ✅ Mobile-responsive design

3. **Data Quality**:
   - ✅ All required fields populated for 90%+ of properties
   - ✅ Property links work and direct to correct listings
   - ✅ Accurate agent/agency information

## 🚀 Deployment Plan

### Phase 1: Backend Infrastructure (Week 1)
- Database schema updates
- Enhanced scraping infrastructure
- API endpoints

### Phase 2: Frontend Redesign (Week 2)  
- New dashboard components
- Property listing UI
- Advanced filtering

### Phase 3: Testing & Optimization (Week 3)
- Data quality validation
- Performance optimization
- Bug fixes and polish

## 📊 Priority

**Priority**: High
**Estimated Total Time**: 18-26 hours
**Target Completion**: 3 weeks

## 🏷️ Labels
- `enhancement`
- `dashboard`
- `scraping`
- `database`
- `api`
- `frontend`
- `high-priority`

---

### 📝 Additional Notes

This restructuring will transform the application from a suburb statistics dashboard into a comprehensive property auction results platform, providing much more value to users looking for specific property information and market insights.