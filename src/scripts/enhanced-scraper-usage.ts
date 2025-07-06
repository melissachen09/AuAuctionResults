import { EnhancedDomainScraper } from '@/lib/scrapers/enhanced-domain-scraper';
import { prisma } from '@/lib/db';

/**
 * Enhanced Domain Scraper Usage Guide
 * 
 * This script demonstrates how to use the Enhanced Domain Scraper
 * with specific URLs to scrape auction results from Domain.com.au
 */

async function enhancedScraperUsage() {
  console.log('🚀 Enhanced Domain Scraper - Usage Guide');
  console.log('==========================================');
  console.log('');

  const scraper = new EnhancedDomainScraper({
    timeout: 30000,
    maxConcurrency: 1,
    retryAttempts: 3,
  });

  // Example URLs that can be scraped
  const exampleUrls = [
    'https://www.domain.com.au/auction-results/sydney/',
    'https://www.domain.com.au/auction-results/melbourne/',
    'https://www.domain.com.au/auction-results/brisbane/',
    'https://www.domain.com.au/auction-results/perth/',
    'https://www.domain.com.au/auction-results/adelaide/',
  ];

  console.log('📋 Supported URL Patterns:');
  exampleUrls.forEach((url, index) => {
    console.log(`${index + 1}. ${url}`);
  });
  console.log('');

  console.log('🔧 Key Features:');
  console.log('✅ URL-based input - scrape specific city auction results');
  console.log('✅ Auto element detection - uses multiple strategies to find auction containers');
  console.log('✅ Smart content parsing - extracts data using intelligent patterns');
  console.log('✅ Location inference - automatically determines suburb/state from URL');
  console.log('✅ Fallback mechanisms - handles missing or malformed data gracefully');
  console.log('✅ Database integration - automatically saves to Supabase PostgreSQL');
  console.log('✅ Statistics calculation - generates suburb-level metrics');
  console.log('');

  console.log('💻 Usage Example:');
  console.log('```typescript');
  console.log('import { EnhancedDomainScraper } from "@/lib/scrapers/enhanced-domain-scraper";');
  console.log('');
  console.log('const scraper = new EnhancedDomainScraper({');
  console.log('  timeout: 30000,');
  console.log('  maxConcurrency: 1,');
  console.log('  retryAttempts: 3,');
  console.log('});');
  console.log('');
  console.log('// Scrape Sydney auction results');
  console.log('const result = await scraper.scrapeUrl("https://www.domain.com.au/auction-results/sydney/");');
  console.log('');
  console.log('if (result.success) {');
  console.log('  console.log(`Found ${result.recordCount} auction results`);');
  console.log('  // Data automatically inserted into database');
  console.log('} else {');
  console.log('  console.error("Scraping failed:", result.error);');
  console.log('}');
  console.log('```');
  console.log('');

  console.log('🔍 Element Detection Strategies:');
  console.log('1. Domain-specific selectors ([data-testid*="auction"], .auction-result, etc.)');
  console.log('2. Generic auction patterns (article, .listing, .item)');
  console.log('3. Content-based detection (elements containing prices, results, addresses)');
  console.log('4. Text analysis with regex patterns for addresses, prices, property features');
  console.log('');

  console.log('📊 Data Extracted:');
  console.log('• Property address (with intelligent address detection)');
  console.log('• Suburb, state, postcode (inferred from URL and content)');
  console.log('• Sale price (parsed from various price formats)');
  console.log('• Auction result (sold/passed_in/withdrawn)');
  console.log('• Property type (house/apartment/townhouse/etc.)');
  console.log('• Bedrooms, bathrooms, car spaces');
  console.log('• Agent name and agency name');
  console.log('• Auction date');
  console.log('');

  console.log('🏠 Database Schema:');
  console.log('Tables:');
  console.log('• auctions - Individual auction records with unique constraint on address+date');
  console.log('• suburb_stats - Aggregated statistics per suburb/date');
  console.log('• scrape_logs - Audit trail of scraping operations');
  console.log('');

  console.log('⚡ Performance Features:');
  console.log('• Retry logic with exponential backoff');
  console.log('• Safe operation wrappers with error handling');
  console.log('• Screenshot capture for debugging (debug-domain-page.png)');
  console.log('• Multiple scoring strategies for container detection');
  console.log('• Upsert operations to prevent duplicate records');
  console.log('');

  console.log('🚨 System Requirements:');
  console.log('To run with real browser automation, install system dependencies:');
  console.log('```bash');
  console.log('sudo apt-get install libnspr4 libnss3 libasound2t64');
  console.log('# or');
  console.log('sudo npx playwright install-deps');
  console.log('```');
  console.log('');

  console.log('📈 Current Database Status:');
  
  try {
    const totalAuctions = await prisma.auction.count();
    const domainAuctions = await prisma.auction.count({ where: { source: 'domain' } });
    const suburbStats = await prisma.suburbStats.count();
    
    console.log(`• Total auctions: ${totalAuctions}`);
    console.log(`• Domain auctions: ${domainAuctions}`);
    console.log(`• Suburb statistics: ${suburbStats}`);
    
    const recentLog = await prisma.scrapeLog.findFirst({
      where: { source: 'enhanced-domain-demo' },
      orderBy: { createdAt: 'desc' }
    });
    
    if (recentLog) {
      console.log(`• Last successful scrape: ${recentLog.recordCount} records at ${recentLog.createdAt.toISOString()}`);
    }
    
  } catch (error) {
    console.error('Error checking database status:', error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('');
  console.log('🎯 Ready to scrape Domain auction results with URL input!');
}

enhancedScraperUsage();