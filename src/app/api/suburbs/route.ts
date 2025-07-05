import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const state = searchParams.get('state');
    const date = searchParams.get('date');
    const sortBy = searchParams.get('sortBy') || 'suburb';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build filter conditions
    const where: any = {};
    if (state) {
      where.state = state;
    }
    if (date) {
      where.date = new Date(date);
    }

    // Get total count
    const totalCount = await prisma.suburbStats.count({ where });

    // Get paginated results
    const suburbs = await prisma.suburbStats.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      data: suburbs,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suburbs' },
      { status: 500 }
    );
  }
}