import { prisma } from '@/lib/db';
import { RawAuctionData } from '@/lib/scrapers/types';

async function insertMockData() {
  console.log('Inserting mock auction data...');
  
  const mockAuctions: RawAuctionData[] = [
    {
      address: '123 Collins Street',
      suburb: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
      price: 850000,
      result: 'sold',
      auctionDate: new Date('2024-01-15'),
      source: 'domain',
      propertyType: 'Apartment',
      bedrooms: 2,
      bathrooms: 1,
      carSpaces: 1,
      agentName: 'John Smith',
      agencyName: 'Smith Real Estate'
    },
    {
      address: '456 Bourke Street',
      suburb: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
      price: 1200000,
      result: 'sold',
      auctionDate: new Date('2024-01-15'),
      source: 'rea',
      propertyType: 'Townhouse',
      bedrooms: 3,
      bathrooms: 2,
      carSpaces: 2,
      agentName: 'Jane Doe',
      agencyName: 'Doe Properties'
    },
    {
      address: '789 Swanston Street',
      suburb: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
      price: undefined,
      result: 'passed_in',
      auctionDate: new Date('2024-01-15'),
      source: 'domain',
      propertyType: 'House',
      bedrooms: 4,
      bathrooms: 2,
      carSpaces: 1,
      agentName: 'Bob Wilson',
      agencyName: 'Wilson Realty'
    },
    {
      address: '321 Chapel Street',
      suburb: 'South Yarra',
      state: 'VIC',
      postcode: '3141',
      price: 1800000,
      result: 'sold',
      auctionDate: new Date('2024-01-15'),
      source: 'rea',
      propertyType: 'House',
      bedrooms: 5,
      bathrooms: 3,
      carSpaces: 2,
      agentName: 'Alice Brown',
      agencyName: 'Brown & Associates'
    }
  ];

  try {
    console.log('Inserting auctions...');
    for (const auction of mockAuctions) {
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
    }
    
    console.log(`Successfully inserted ${mockAuctions.length} auctions`);
    
    // Create suburb statistics
    console.log('Calculating suburb statistics...');
    
    const suburbGroups = await prisma.auction.groupBy({
      by: ['suburb', 'state'],
      where: {
        auctionDate: {
          gte: new Date('2024-01-01'),
          lt: new Date('2024-02-01')
        }
      },
      _count: {
        id: true
      }
    });

    for (const group of suburbGroups) {
      const auctions = await prisma.auction.findMany({
        where: {
          suburb: group.suburb,
          state: group.state,
          auctionDate: {
            gte: new Date('2024-01-01'),
            lt: new Date('2024-02-01')
          }
        }
      });

      const totalAuctions = auctions.length;
      const soldCount = auctions.filter(a => a.result === 'sold').length;
      const passedInCount = auctions.filter(a => a.result === 'passed_in').length;
      const withdrawnCount = auctions.filter(a => a.result === 'withdrawn').length;
      const clearanceRate = totalAuctions > 0 ? (soldCount / totalAuctions) * 100 : 0;
      
      const soldPrices = auctions.filter(a => a.result === 'sold' && a.price).map(a => a.price!);
      const averagePrice = soldPrices.length > 0 ? soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length : null;
      const medianPrice = soldPrices.length > 0 ? soldPrices.sort((a, b) => a - b)[Math.floor(soldPrices.length / 2)] : null;

      await prisma.suburbStats.upsert({
        where: {
          suburb_state_date: {
            suburb: group.suburb,
            state: group.state,
            date: new Date('2024-01-15')
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
          suburb: group.suburb,
          state: group.state,
          date: new Date('2024-01-15'),
          totalAuctions,
          soldCount,
          passedInCount,
          withdrawnCount,
          clearanceRate,
          averagePrice,
          medianPrice
        }
      });
    }
    
    console.log(`Calculated statistics for ${suburbGroups.length} suburbs`);
    
    // Log successful operation
    await prisma.scrapeLog.create({
      data: {
        source: 'mock-data',
        status: 'success',
        startTime: new Date(),
        endTime: new Date(),
        recordCount: mockAuctions.length
      }
    });
    
    console.log('Mock data insertion completed successfully!');
    
  } catch (error) {
    console.error('Error inserting mock data:', error);
    
    // Log failed operation
    await prisma.scrapeLog.create({
      data: {
        source: 'mock-data',
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
        recordCount: 0,
        errorLog: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  } finally {
    await prisma.$disconnect();
  }
}

insertMockData();