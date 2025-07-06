import { EnhancedDomainScraper } from '@/lib/scrapers/enhanced-domain-scraper';
import { prisma } from '@/lib/db';

async function scrapeRealData() {
  console.log('🌐 Attempting to scrape REAL data from Domain Sydney auction results...');
  console.log('URL: https://www.domain.com.au/auction-results/sydney/');
  console.log('');

  const scraper = new EnhancedDomainScraper({
    timeout: 60000, // Increased timeout
    maxConcurrency: 1,
    retryAttempts: 3,
  });

  const sydneyUrl = 'https://www.domain.com.au/auction-results/sydney/';
  
  try {
    console.log('🚀 Starting real data scraper...');
    const result = await scraper.scrapeUrl(sydneyUrl);
    
    console.log('📊 Scraping Result:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Record Count: ${result.recordCount}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');

    if (result.success && result.data && result.data.length > 0) {
      console.log('🎉 SUCCESS! Real data extracted:');
      console.log(`Found ${result.data.length} auction results`);
      console.log('');
      
      // Show first few results
      console.log('📋 Sample extracted data:');
      result.data.slice(0, 5).forEach((auction, index) => {
        console.log(`${index + 1}. ${auction.address}`);
        console.log(`   ${auction.suburb}, ${auction.state} ${auction.postcode}`);
        console.log(`   ${auction.result.toUpperCase()} - $${auction.price?.toLocaleString() || 'N/A'}`);
        console.log(`   ${auction.propertyType} - ${auction.bedrooms || 'N/A'} bed, ${auction.bathrooms || 'N/A'} bath, ${auction.carSpaces || 'N/A'} car`);
        if (auction.agentName) console.log(`   Agent: ${auction.agentName}`);
        if (auction.agencyName) console.log(`   Agency: ${auction.agencyName}`);
        console.log('');
      });

      // Insert real data into database
      console.log('💾 Inserting real data into Supabase database...');
      let insertedCount = 0;
      let updatedCount = 0;
      
      for (const auction of result.data) {
        try {
          const existingAuction = await prisma.auction.findUnique({
            where: {
              address_auctionDate: {
                address: auction.address,
                auctionDate: auction.auctionDate
              }
            }
          });

          if (existingAuction) {
            await prisma.auction.update({
              where: {
                address_auctionDate: {
                  address: auction.address,
                  auctionDate: auction.auctionDate
                }
              },
              data: {
                price: auction.price,
                result: auction.result,
                propertyType: auction.propertyType,
                bedrooms: auction.bedrooms,
                bathrooms: auction.bathrooms,
                carSpaces: auction.carSpaces,
                agentName: auction.agentName,
                agencyName: auction.agencyName,
                updatedAt: new Date()
              }
            });
            updatedCount++;
          } else {
            await prisma.auction.create({
              data: {
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
          }
        } catch (error) {
          console.error(`❌ Error saving auction ${auction.address}:`, error);
        }
      }

      console.log(`✅ Database operations completed:`);
      console.log(`   New records inserted: ${insertedCount}`);
      console.log(`   Existing records updated: ${updatedCount}`);
      console.log(`   Total processed: ${insertedCount + updatedCount}`);
      console.log('');

      // Calculate and save suburb statistics for real data
      console.log('📈 Calculating real suburb statistics...');
      
      const suburbGroups = new Map();
      result.data.forEach(auction => {
        const key = `${auction.suburb}-${auction.state}`;
        if (!suburbGroups.has(key)) {
          suburbGroups.set(key, []);
        }
        suburbGroups.get(key).push(auction);
      });

      let statsCreated = 0;
      for (const [key, auctions] of suburbGroups) {
        const [suburb, state] = key.split('-');
        
        const totalAuctions = auctions.length;
        const soldCount = auctions.filter((a: any) => a.result === 'sold').length;
        const passedInCount = auctions.filter((a: any) => a.result === 'passed_in').length;
        const withdrawnCount = auctions.filter((a: any) => a.result === 'withdrawn').length;
        const clearanceRate = totalAuctions > 0 ? (soldCount / totalAuctions) * 100 : 0;
        
        const soldPrices = auctions.filter((a: any) => a.result === 'sold' && a.price).map((a: any) => a.price);
        const averagePrice = soldPrices.length > 0 ? soldPrices.reduce((a: number, b: number) => a + b, 0) / soldPrices.length : null;
        const medianPrice = soldPrices.length > 0 ? soldPrices.sort((a: number, b: number) => a - b)[Math.floor(soldPrices.length / 2)] : null;

        try {
          await prisma.suburbStats.upsert({
            where: {
              suburb_state_date: {
                suburb,
                state,
                date: new Date()
              }
            },
            update: {
              totalAuctions,
              soldCount,
              passedInCount,
              withdrawnCount,
              clearanceRate,
              averagePrice,
              medianPrice,
              updatedAt: new Date()
            },
            create: {
              suburb,
              state,
              date: new Date(),
              totalAuctions,
              soldCount,
              passedInCount,
              withdrawnCount,
              clearanceRate,
              averagePrice,
              medianPrice
            }
          });
          
          console.log(`   ${suburb}, ${state}: ${totalAuctions} auctions, ${soldCount} sold (${clearanceRate.toFixed(1)}%)`);
          statsCreated++;
        } catch (error) {
          console.error(`❌ Error saving stats for ${suburb}, ${state}:`, error);
        }
      }
      
      console.log(`✅ Created/updated statistics for ${statsCreated} suburbs`);

      // Log successful operation
      await prisma.scrapeLog.create({
        data: {
          source: 'enhanced-domain-real',
          status: 'success',
          startTime: new Date(),
          endTime: new Date(),
          recordCount: result.recordCount
        }
      });

      console.log('');
      console.log('🎉 Real data scraping completed successfully!');
      console.log(`📊 Summary: ${result.recordCount} auction results from Sydney saved to database`);

    } else {
      console.log('❌ No data extracted or scraping failed');
      
      if (result.error) {
        console.log('Error details:', result.error);
        
        // Log failed operation
        await prisma.scrapeLog.create({
          data: {
            source: 'enhanced-domain-real',
            status: 'failed',
            startTime: new Date(),
            endTime: new Date(),
            recordCount: 0,
            errorLog: result.error
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ Scraping operation failed:', error);
    
    // Log failed operation
    try {
      await prisma.scrapeLog.create({
        data: {
          source: 'enhanced-domain-real',
          status: 'failed',
          startTime: new Date(),
          endTime: new Date(),
          recordCount: 0,
          errorLog: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  } finally {
    await prisma.$disconnect();
  }
}

scrapeRealData();