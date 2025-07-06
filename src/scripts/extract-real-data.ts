import { prisma } from '@/lib/db';
import { load } from 'cheerio';

async function extractRealAuctionData() {
  console.log('🔍 Extracting REAL auction data from Sydney page HTML...');
  
  try {
    // Read the saved HTML file
    const fs = await import('fs/promises');
    const html = await fs.readFile('debug-domain-html.html', 'utf-8');
    console.log(`Loaded ${(html.length / 1024 / 1024).toFixed(1)}MB of HTML data`);
    
    const $ = load(html);
    
    // Extract the main auction statistics from the embedded JSON
    const scriptTags = $('script').toArray();
    let auctionStats = null;
    
    for (const script of scriptTags) {
      const content = $(script).html();
      if (content && content.includes('auctionResults')) {
        try {
          // Look for the digitalData object
          const digitalDataMatch = content.match(/var digitalData = ({.*?});/s);
          if (digitalDataMatch) {
            const digitalData = JSON.parse(digitalDataMatch[1]);
            if (digitalData.page && digitalData.page.auctionResults) {
              auctionStats = digitalData.page.auctionResults;
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    if (auctionStats) {
      console.log('📊 Found real auction statistics:');
      console.log(`   Date: ${auctionStats.auctionedDate}`);
      console.log(`   Published: ${auctionStats.publishedDate}`);
      console.log(`   Clearance Rate: ${(auctionStats.clearanceRate * 100).toFixed(1)}%`);
      console.log(`   Last Year Rate: ${(auctionStats.lastYearClearanceRate * 100).toFixed(1)}%`);
      console.log(`   Scheduled: ${auctionStats.scheduled}`);
      console.log(`   Reported: ${auctionStats.reported}`);
      console.log(`   Sold: ${auctionStats.sold}`);
      console.log(`   Withdrawn: ${auctionStats.withdrawn}`);
      console.log(`   Passed In: ${auctionStats.passedIn}`);
      console.log(`   Total Sales: $${(auctionStats.totalSales / 1000000).toFixed(1)}M`);
      console.log(`   Median Price: $${auctionStats.median.toLocaleString()}`);
      console.log('');
      
      // Save the real statistics to the database
      const currentDate = new Date();
      
      await prisma.suburbStats.upsert({
        where: {
          suburb_state_date: {
            suburb: 'Sydney',
            state: 'NSW',
            date: currentDate
          }
        },
        update: {
          totalAuctions: auctionStats.reported,
          soldCount: auctionStats.sold,
          passedInCount: auctionStats.passedIn,
          withdrawnCount: auctionStats.withdrawn,
          clearanceRate: auctionStats.clearanceRate * 100,
          averagePrice: auctionStats.totalSales / auctionStats.sold,
          medianPrice: auctionStats.median,
          updatedAt: new Date()
        },
        create: {
          suburb: 'Sydney',
          state: 'NSW',
          date: currentDate,
          totalAuctions: auctionStats.reported,
          soldCount: auctionStats.sold,
          passedInCount: auctionStats.passedIn,
          withdrawnCount: auctionStats.withdrawn,
          clearanceRate: auctionStats.clearanceRate * 100,
          averagePrice: auctionStats.totalSales / auctionStats.sold,
          medianPrice: auctionStats.median
        }
      });
      
      console.log('✅ Real auction statistics saved to database');
    }
    
    // Now extract individual property listings from the HTML
    console.log('🏠 Extracting individual property listings...');
    
    // Look for property data in various formats
    const propertyData: any[] = [];
    
    // Strategy 1: Look for structured property data in script tags
    for (const script of scriptTags) {
      const content = $(script).html();
      if (content && content.includes('property') && content.includes('address')) {
        try {
          // Look for Next.js page props
          const propsMatch = content.match(/"props":\s*({.*?})/s);
          if (propsMatch) {
            const props = JSON.parse(propsMatch[1]);
            if (props.pageProps && props.pageProps.auctionResults) {
              propertyData.push(...props.pageProps.auctionResults);
            }
          }
          
          // Look for other property data structures
          const buildIdMatch = content.match(/"buildId".*?"pageProps":\s*({.*?})/s);
          if (buildIdMatch) {
            const pageProps = JSON.parse(buildIdMatch[1]);
            if (pageProps.results) {
              propertyData.push(...pageProps.results);
            }
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // Strategy 2: Extract from visible text content
    const visibleListings: any[] = [];
    
    // Look for elements that contain property information
    $('*').each((_, element) => {
      const $element = $(element);
      const text = $element.text();
      
      // Skip if too short or too long
      if (text.length < 30 || text.length > 500) return;
      
      // Look for patterns that indicate property listings
      if (text.match(/\$[\d,.]+[kmb]?/i) && 
          text.match(/\d+\s+bed/i) && 
          (text.toLowerCase().includes('sold') || 
           text.toLowerCase().includes('passed') ||
           text.toLowerCase().includes('withdrawn'))) {
        
        // Extract data from the text
        const addressMatch = text.match(/^([^0-9]*\d+[^$]*?)(?:House|Unit|Townhouse|Apartment)/i);
        const priceMatch = text.match(/\$(\d+(?:\.\d+)?)[kmb]?/i);
        const bedroomsMatch = text.match(/(\d+)\s+bed/i);
        const resultMatch = text.match(/\b(sold|passed|withdrawn)/i);
        
        if (addressMatch && priceMatch) {
          let price = parseFloat(priceMatch[1]);
          const unit = priceMatch[0].toLowerCase();
          if (unit.includes('k')) price *= 1000;
          if (unit.includes('m')) price *= 1000000;
          if (unit.includes('b')) price *= 1000000000;
          
          visibleListings.push({
            address: addressMatch[1].trim(),
            price: Math.round(price),
            bedrooms: bedroomsMatch ? parseInt(bedroomsMatch[1]) : null,
            result: resultMatch ? resultMatch[1].toLowerCase() : 'unknown',
            source: 'text-extraction'
          });
        }
      }
    });
    
    console.log(`📋 Found ${propertyData.length} properties in structured data`);
    console.log(`📋 Found ${visibleListings.length} properties from text extraction`);
    
    // Combine and process all property data
    const allProperties = [...propertyData, ...visibleListings];
    const uniqueProperties = allProperties.filter((prop, index, arr) => 
      arr.findIndex(p => p.address === prop.address) === index
    );
    
    console.log(`📋 Total unique properties: ${uniqueProperties.length}`);
    
    if (uniqueProperties.length > 0) {
      console.log('\n🏠 Sample property listings:');
      uniqueProperties.slice(0, 10).forEach((prop, index) => {
        console.log(`${index + 1}. ${prop.address || 'Address not found'}`);
        console.log(`   Price: $${prop.price?.toLocaleString() || 'N/A'}`);
        console.log(`   Bedrooms: ${prop.bedrooms || 'N/A'}`);
        console.log(`   Result: ${prop.result || 'unknown'}`);
        console.log('');
      });
      
      // Insert property data into database
      let insertCount = 0;
      for (const prop of uniqueProperties) {
        if (!prop.address) continue;
        
        try {
          await prisma.auction.create({
            data: {
              address: prop.address,
              suburb: 'Sydney',
              state: 'NSW',
              postcode: prop.postcode || '',
              price: prop.price || undefined,
              result: prop.result === 'sold' ? 'sold' : 
                      prop.result === 'withdrawn' ? 'withdrawn' : 'passed_in',
              auctionDate: new Date(),
              source: 'domain-real',
              propertyType: prop.propertyType || 'House',
              bedrooms: prop.bedrooms || undefined,
              bathrooms: prop.bathrooms || undefined,
              carSpaces: prop.carSpaces || undefined,
              agentName: prop.agentName || undefined,
              agencyName: prop.agencyName || undefined
            }
          });
          insertCount++;
        } catch (error) {
          // Likely a duplicate, continue
        }
      }
      
      console.log(`✅ Inserted ${insertCount} new property records`);
    }
    
    // Log the successful operation
    await prisma.scrapeLog.create({
      data: {
        source: 'domain-real-extract',
        status: 'success',
        startTime: new Date(),
        endTime: new Date(),
        recordCount: uniqueProperties.length
      }
    });
    
    console.log('');
    console.log('🎉 Real data extraction completed successfully!');
    console.log('📊 Key Statistics from Real Sydney Auction Data:');
    if (auctionStats) {
      console.log(`   📈 Clearance Rate: ${(auctionStats.clearanceRate * 100).toFixed(1)}% (vs ${(auctionStats.lastYearClearanceRate * 100).toFixed(1)}% last year)`);
      console.log(`   🏡 Total Reported: ${auctionStats.reported} auctions`);
      console.log(`   ✅ Sold: ${auctionStats.sold} properties`);
      console.log(`   ❌ Passed In: ${auctionStats.passedIn} properties`);
      console.log(`   🚫 Withdrawn: ${auctionStats.withdrawn} properties`);
      console.log(`   💰 Median Price: $${auctionStats.median.toLocaleString()}`);
      console.log(`   💵 Total Sales Value: $${(auctionStats.totalSales / 1000000).toFixed(1)} million`);
    }
    
  } catch (error) {
    console.error('❌ Error extracting real data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractRealAuctionData();