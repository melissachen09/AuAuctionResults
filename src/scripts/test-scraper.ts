import { ScraperService } from '@/lib/scrapers/scraper-service';

async function testScraper() {
  console.log('Testing Domain scraper...');
  
  const scraperService = new ScraperService();
  
  try {
    await scraperService.runDomainScraper();
    console.log('Scraper test completed successfully');
  } catch (error) {
    console.error('Scraper test failed:', error);
    process.exit(1);
  }
}

// Run the test
testScraper();