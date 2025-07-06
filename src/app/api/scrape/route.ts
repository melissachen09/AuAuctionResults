import { NextRequest, NextResponse } from 'next/server';
import { ScraperService } from '@/lib/scrapers/scraper-service';
import { validateApiKey } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Validate API key in production
  if (process.env.NODE_ENV === 'production' && !validateApiKey(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { source, date } = await request.json();
    
    const scraperService = new ScraperService();
    const scrapeDate = date ? new Date(date) : undefined;

    if (source === 'domain') {
      await scraperService.runDomainScraper(scrapeDate);
    } else if (source === 'rea') {
      await scraperService.runREAScraper(scrapeDate);
    } else if (source === 'all') {
      await scraperService.runAllScrapers(scrapeDate);
    } else {
      return NextResponse.json(
        { error: 'Invalid source specified' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${source} scraper started successfully`,
    });
  } catch (error) {
    console.error('Scrape API Error:', error);
    return NextResponse.json(
      { error: 'Failed to start scraper' },
      { status: 500 }
    );
  }
}