import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const suburb = searchParams.get('suburb');
    const state = searchParams.get('state');
    const period = searchParams.get('period') || '12weeks';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '4weeks':
        startDate.setDate(endDate.getDate() - 28);
        break;
      case '12weeks':
        startDate.setDate(endDate.getDate() - 84);
        break;
      case '6months':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }

    // Build query conditions
    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (suburb) {
      where.suburb = suburb;
    }
    if (state) {
      where.state = state;
    }

    // Get trend data
    const trends = await prisma.suburbStats.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
      select: {
        suburb: true,
        state: true,
        date: true,
        totalAuctions: true,
        soldCount: true,
        clearanceRate: true,
        averagePrice: true,
        medianPrice: true,
      },
    });

    // Group by week if needed
    const groupedTrends = groupTrendsByWeek(trends);

    // Calculate overall statistics
    const overallStats = calculateOverallStats(trends);

    return NextResponse.json({
      trends: groupedTrends,
      overallStats,
      period,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trends' },
      { status: 500 }
    );
  }
}

function groupTrendsByWeek(trends: any[]) {
  const grouped = new Map<string, any>();

  trends.forEach((trend) => {
    const weekKey = getWeekKey(trend.date);
    
    if (!grouped.has(weekKey)) {
      grouped.set(weekKey, {
        week: weekKey,
        date: trend.date,
        totalAuctions: 0,
        soldCount: 0,
        totalValue: 0,
        count: 0,
      });
    }

    const week = grouped.get(weekKey);
    week.totalAuctions += trend.totalAuctions;
    week.soldCount += trend.soldCount;
    if (trend.averagePrice) {
      week.totalValue += trend.averagePrice * trend.soldCount;
    }
    week.count += 1;
  });

  // Calculate weekly averages
  return Array.from(grouped.values()).map((week) => ({
    week: week.week,
    date: week.date,
    totalAuctions: week.totalAuctions,
    soldCount: week.soldCount,
    clearanceRate: week.totalAuctions > 0 ? (week.soldCount / week.totalAuctions) * 100 : 0,
    averagePrice: week.soldCount > 0 ? week.totalValue / week.soldCount : null,
  }));
}

function getWeekKey(date: Date) {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function calculateOverallStats(trends: any[]) {
  const totalAuctions = trends.reduce((sum, t) => sum + t.totalAuctions, 0);
  const totalSold = trends.reduce((sum, t) => sum + t.soldCount, 0);
  
  const soldWithPrice = trends.filter((t) => t.averagePrice && t.soldCount > 0);
  const totalValue = soldWithPrice.reduce(
    (sum, t) => sum + t.averagePrice * t.soldCount,
    0
  );
  const totalSoldWithPrice = soldWithPrice.reduce((sum, t) => sum + t.soldCount, 0);

  return {
    totalAuctions,
    totalSold,
    overallClearanceRate: totalAuctions > 0 ? (totalSold / totalAuctions) * 100 : 0,
    averagePrice: totalSoldWithPrice > 0 ? totalValue / totalSoldWithPrice : null,
  };
}