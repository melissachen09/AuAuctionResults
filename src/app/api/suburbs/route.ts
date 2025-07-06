import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const suburb = searchParams.get('suburb');
    const state = searchParams.get('state');
    const result = searchParams.get('result');
    const propertyType = searchParams.get('propertyType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const priceMin = searchParams.get('priceMin');
    const priceMax = searchParams.get('priceMax');
    const sortBy = searchParams.get('sortBy') || 'auctionDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build filter conditions
    const where: any = {};
    
    if (search) {
      where.OR = [
        { address: { contains: search, mode: 'insensitive' } },
        { suburb: { contains: search, mode: 'insensitive' } },
        { agentName: { contains: search, mode: 'insensitive' } },
        { agencyName: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (suburb) {
      where.suburb = { contains: suburb, mode: 'insensitive' };
    }
    
    if (state) {
      where.state = state;
    }
    
    if (result) {
      where.result = result;
    }
    
    if (propertyType) {
      where.propertyType = { contains: propertyType, mode: 'insensitive' };
    }
    
    if (dateFrom || dateTo) {
      where.auctionDate = {};
      if (dateFrom) {
        where.auctionDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.auctionDate.lte = new Date(dateTo);
      }
    }
    
    if (priceMin || priceMax) {
      where.price = {};
      if (priceMin) {
        where.price.gte = parseInt(priceMin);
      }
      if (priceMax) {
        where.price.lte = parseInt(priceMax);
      }
    }

    // Get total count
    const totalCount = await prisma.auction.count({ where });

    // Get paginated results
    const properties = await prisma.auction.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      data: properties,
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
      { error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}