# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking
```

### Database Operations
```bash
npx prisma generate     # Generate Prisma client
npx prisma migrate dev  # Run database migrations
npx prisma studio      # Open Prisma Studio
```

### Testing and Validation
Run both `npm run lint` and `npm run type-check` before committing changes.

## Architecture Overview

### Database Design
- **Auction**: Core entity with unique constraint on `address + auctionDate`
- **SuburbStats**: Aggregated statistics per suburb/date with clearance rates and price metrics
- **ScrapeLog**: Audit trail for scraping operations
- Uses PostgreSQL with Prisma ORM, strategic indexes for performance

### API Architecture
- **RESTful design** with structured error handling
- **Authentication**: Bearer token validation in production (API_KEY env var)
- **Pagination**: Standardized across endpoints with page/limit parameters
- **Time-based filtering**: Configurable periods (4weeks, 12weeks, 6months, 1year)

Key endpoints:
- `POST /api/scrape` - Trigger scraping (requires API key)
- `GET /api/suburbs` - Paginated suburb statistics with filtering
- `GET /api/suburbs/[suburb]` - Detailed suburb data and trends
- `GET /api/trends` - Trend analysis with time grouping

### Scraping System
- **ScraperService**: Orchestrates multiple scrapers with centralized processing
- **Queue-based**: Uses p-queue for controlled concurrency (3 concurrent operations)
- **Batch processing**: Handles data in batches of 100 records for efficiency
- **Automatic aggregation**: Calculates suburb statistics after data ingestion
- **Error handling**: Comprehensive logging with ScrapeLog tracking

### Component Architecture
- **shadcn/ui-inspired** design system with Tailwind CSS
- **Zustand** for theme state management
- **Recharts** for data visualization
- **Mobile-first responsive design**

Key patterns:
- Absolute imports using `@/` alias
- Component composition with reusable building blocks
- Theme provider with persistent dark/light mode
- Loading states and error boundaries

## Key Development Patterns

### Data Processing
- **Upsert operations** for data consistency (prevents duplicates)
- **Automatic aggregation** with median/average calculations
- **Time-based grouping** for trend analysis
- **Batch processing** for performance optimization

### Type Safety
- Comprehensive TypeScript interfaces in `src/types/`
- Prisma-generated types for database operations
- Strict TypeScript configuration enabled

### Environment Configuration
Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `API_KEY`: Authentication for scraping endpoints (production)
- `NODE_ENV`: Environment mode

### Deployment
- **Vercel deployment** with Sydney region optimization
- **Extended timeout** (300s) for scraping endpoints in vercel.json
- **GitHub Actions** for automated scraping (weekends at 8 PM Sydney time)
- **Pre-commit hooks** with Husky for code quality

## Code Organization

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes with structured error handling
│   ├── dashboard/         # Dashboard pages with suburb filtering
│   └── about/             # Static pages
├── components/            # UI components
│   ├── charts/           # Recharts visualizations
│   ├── dashboard/        # Dashboard-specific components
│   └── shared/           # Reusable components
├── lib/                   # Core utilities
│   ├── scrapers/         # Web scraping infrastructure
│   ├── db.ts            # Database connection
│   └── utils.ts         # Utility functions
├── hooks/                 # Custom React hooks
├── stores/               # Zustand state management
└── types/                # TypeScript type definitions
```

## Important Notes

- Always run database migrations after schema changes
- Scraping endpoints require API key authentication in production
- Component styling uses Tailwind with custom CSS variables for theming
- Database uses composite unique constraints to prevent duplicate auction records
- All API responses follow consistent error handling structure
- Playwright scrapers handle dynamic content loading with proper wait conditions