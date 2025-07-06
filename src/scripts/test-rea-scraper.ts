import { ScraperService } from '@/lib/scrapers/scraper-service';

async function testREAScraper() {
  console.log('Testing REA scraper...');
  
  const scraperService = new ScraperService();
  
  try {
    await scraperService.runREAScraper();
    console.log('REA scraper test completed successfully');
  } catch (error) {
    console.error('REA scraper test failed:', error);
    process.exit(1);
  }
}

// Run the test
testREAScraper();