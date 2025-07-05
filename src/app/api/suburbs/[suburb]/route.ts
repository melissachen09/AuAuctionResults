import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ suburb: string }> }
) {
  const params = await context.params;
  try {
    const suburb = decodeURIComponent(params.suburb);
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state');

    // Get suburb statistics
    const stats = await prisma.suburbStats.findFirst({
      where: {
        suburb,
        ...(state && { state }),
      },
      orderBy: {
        date: 'desc',
      },
    });

    if (!stats) {
      return NextResponse.json(
        { error: 'Suburb not found' },
        { status: 404 }
      );
    }

    // Get recent auctions for this suburb
    const recentAuctions = await prisma.auction.findMany({
      where: {
        suburb,
        ...(state && { state }),
      },
      orderBy: {
        auctionDate: 'desc',
      },
      take: 20,
    });

    // Get historical stats
    const historicalStats = await prisma.suburbStats.findMany({
      where: {
        suburb,
        ...(state && { state }),
      },
      orderBy: {
        date: 'desc',
      },
      take: 12, // Last 12 weeks
    });

    return NextResponse.json({
      currentStats: stats,
      recentAuctions,
      historicalStats,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suburb details' },
      { status: 500 }
    );
  }
}