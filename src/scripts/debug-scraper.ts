import { DomainScraper } from '@/lib/scrapers/domain-scraper';
import { REAScraper } from '@/lib/scrapers/rea-scraper';

async function debugScraper() {
  console.log('Running debug scraper...');
  
  // Test Domain scraper directly
  const domainScraper = new DomainScraper({
    timeout: 30000,
    maxConcurrency: 1,
    retryAttempts: 3,
  });
  
  try {
    console.log('Testing Domain scraper directly...');
    const domainResult = await domainScraper.scrape();
    console.log('Domain result:', {
      success: domainResult.success,
      recordCount: domainResult.recordCount,
      error: domainResult.error,
      sampleData: domainResult.data?.slice(0, 2) // Show first 2 records
    });
  } catch (error) {
    console.error('Domain scraper error:', error);
  }
  
  // Test REA scraper directly
  const reaScraper = new REAScraper({
    timeout: 30000,
    maxConcurrency: 1,
    retryAttempts: 3,
  });
  
  try {
    console.log('\nTesting REA scraper directly...');
    const reaResult = await reaScraper.scrape();
    console.log('REA result:', {
      success: reaResult.success,
      recordCount: reaResult.recordCount,
      error: reaResult.error,
      sampleData: reaResult.data?.slice(0, 2) // Show first 2 records
    });
  } catch (error) {
    console.error('REA scraper error:', error);
  }
}

debugScraper();