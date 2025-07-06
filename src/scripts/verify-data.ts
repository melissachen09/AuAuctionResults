import { prisma } from '@/lib/db';

async function verifyData() {
  console.log('Verifying scraped data...');
  
  try {
    // Check auctions
    const auctionCount = await prisma.auction.count();
    console.log(`Total auctions in database: ${auctionCount}`);
    
    // Check by source
    const domainCount = await prisma.auction.count({
      where: { source: 'domain' }
    });
    const reaCount = await prisma.auction.count({
      where: { source: 'rea' }
    });
    
    console.log(`Domain auctions: ${domainCount}`);
    console.log(`REA auctions: ${reaCount}`);
    
    // Check recent auctions
    const recentAuctions = await prisma.auction.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        address: true,
        suburb: true,
        state: true,
        price: true,
        result: true,
        source: true,
        createdAt: true
      }
    });
    
    console.log('\nRecent auctions:');
    recentAuctions.forEach(auction => {
      console.log(`- ${auction.address}, ${auction.suburb}, ${auction.state} - ${auction.result} - $${auction.price || 'N/A'} (${auction.source})`);
    });
    
    // Check scrape logs
    const scrapeLogs = await prisma.scrapeLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log('\nRecent scrape logs:');
    scrapeLogs.forEach(log => {
      console.log(`- ${log.source}: ${log.status} - ${log.recordCount || 0} records`);
    });
    
    // Check suburb stats
    const suburbStatsCount = await prisma.suburbStats.count();
    console.log(`\nSuburb stats records: ${suburbStatsCount}`);
    
    if (suburbStatsCount > 0) {
      const recentStats = await prisma.suburbStats.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: {
          suburb: true,
          state: true,
          totalAuctions: true,
          soldCount: true,
          clearanceRate: true,
          medianPrice: true
        }
      });
      
      console.log('\nRecent suburb stats:');
      recentStats.forEach(stat => {
        console.log(`- ${stat.suburb}, ${stat.state}: ${stat.totalAuctions} auctions, ${stat.soldCount} sold, ${stat.clearanceRate}% clearance, median $${stat.medianPrice || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('Error verifying data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();