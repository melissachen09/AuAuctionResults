# API Endpoints: Update for Individual Property Search

## Overview
Update API endpoints to support individual property search, filtering, and pagination instead of aggregated suburb statistics.

## Current Endpoints to Update
- `GET /api/suburbs` - Convert to property search
- `GET /api/suburbs/[suburb]` - Update for individual properties
- `GET /api/trends` - Add property-level trends

## New Endpoint Requirements

### `GET /api/properties`
- [ ] Search by suburb, address, agent, agency
- [ ] Filter by propertyType, result, dateRange, priceRange
- [ ] Sort by date, price, suburb, result
- [ ] Pagination with page/limit parameters
- [ ] Return individual property records

### `GET /api/properties/[id]`
- [ ] Get individual property details
- [ ] Include all fields including propertyUrl

### `GET /api/search/suggestions`
- [ ] Autocomplete for suburbs
- [ ] Agent name suggestions
- [ ] Agency name suggestions

## Response Format
```json
{
  "properties": [
    {
      "id": "string",
      "address": "string",
      "suburb": "string",
      "state": "string",
      "price": "number",
      "result": "string",
      "auctionDate": "string",
      "propertyType": "string",
      "bedrooms": "number",
      "agentName": "string",
      "agencyName": "string",
      "propertyUrl": "string",
      "source": "string"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "totalPages": "number"
  },
  "filters": {
    "applied": "object",
    "available": "object"
  }
}
```

## Acceptance Criteria
- All endpoints return individual property data
- Search and filtering work efficiently
- Pagination handles large datasets
- Response format is consistent
- API documentation updated
- Backward compatibility maintained where possible

## Labels
- api
- backend
- enhancement