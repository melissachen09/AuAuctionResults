import { EnhancedDomainScraper } from '@/lib/scrapers/enhanced-domain-scraper';
import { prisma } from '@/lib/db';

async function testEnhancedScraper() {
  console.log('Testing Enhanced Domain Scraper with Sydney URL...');
  
  const scraper = new EnhancedDomainScraper({
    timeout: 30000,
    maxConcurrency: 1,
    retryAttempts: 3,
  });

  const sydneyUrl = 'https://www.domain.com.au/auction-results/sydney/';
  
  try {
    console.log(`Scraping: ${sydneyUrl}`);
    const result = await scraper.scrapeUrl(sydneyUrl);
    
    console.log('Scraping Result:', {
      success: result.success,
      recordCount: result.recordCount,
      error: result.error
    });

    if (result.success && result.data && result.data.length > 0) {
      console.log('\nSample extracted data:');
      result.data.slice(0, 3).forEach((auction, index) => {
        console.log(`${index + 1}. ${auction.address}`);
        console.log(`   ${auction.suburb}, ${auction.state} ${auction.postcode}`);
        console.log(`   ${auction.result} - $${auction.price || 'N/A'}`);
        console.log(`   ${auction.bedrooms || 'N/A'} bed, ${auction.bathrooms || 'N/A'} bath, ${auction.carSpaces || 'N/A'} car`);
        console.log(`   Agent: ${auction.agentName || 'N/A'}, Agency: ${auction.agencyName || 'N/A'}`);
        console.log('');
      });

      // Insert data into database
      console.log('Inserting data into database...');
      let insertedCount = 0;
      
      for (const auction of result.data) {
        try {
          await prisma.auction.upsert({
            where: {
              address_auctionDate: {
                address: auction.address,
                auctionDate: auction.auctionDate
              }
            },
            update: {
              price: auction.price,
              result: auction.result,
              propertyType: auction.propertyType,
              bedrooms: auction.bedrooms,
              bathrooms: auction.bathrooms,
              carSpaces: auction.carSpaces,
              agentName: auction.agentName,
              agencyName: auction.agencyName,
              updatedAt: new Date()
            },
            create: {
              address: auction.address,
              suburb: auction.suburb,
              state: auction.state,
              postcode: auction.postcode,
              price: auction.price,
              result: auction.result,
              auctionDate: auction.auctionDate,
              source: auction.source,
              propertyType: auction.propertyType,
              bedrooms: auction.bedrooms,
              bathrooms: auction.bathrooms,
              carSpaces: auction.carSpaces,
              agentName: auction.agentName,
              agencyName: auction.agencyName
            }
          });
          insertedCount++;
        } catch (error) {
          console.error(`Error inserting auction ${auction.address}:`, error);
        }
      }

      console.log(`Successfully inserted/updated ${insertedCount} auction records`);

      // Log the scrape operation
      await prisma.scrapeLog.create({
        data: {
          source: 'enhanced-domain',
          status: 'success',
          startTime: new Date(),
          endTime: new Date(),
          recordCount: result.recordCount
        }
      });

    } else if (result.error) {
      console.error('Scraping failed:', result.error);
      
      // Log the failed operation
      await prisma.scrapeLog.create({
        data: {
          source: 'enhanced-domain',
          status: 'failed',
          startTime: new Date(),
          endTime: new Date(),
          recordCount: 0,
          errorLog: result.error
        }
      });
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEnhancedScraper();