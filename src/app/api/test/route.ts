import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Test database connection
    const suburbCount = await prisma.suburbStats.count();
    const auctionCount = await prisma.auction.count();
    
    // Get sample data
    const sampleSuburbs = await prisma.suburbStats.findMany({
      take: 3,
      orderBy: { totalAuctions: 'desc' }
    });
    
    return NextResponse.json({
      status: 'success',
      database: {
        connected: true,
        suburbStatsCount: suburbCount,
        auctionsCount: auctionCount
      },
      sampleData: sampleSuburbs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test API Error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}