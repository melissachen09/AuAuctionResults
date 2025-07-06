import { prisma } from '@/lib/db';
import { DomainScraper } from './domain-scraper';
import { REAScraper } from './rea-scraper';
import { RawAuctionData, ScraperConfig } from './types';

export class ScraperService {
  private config: ScraperConfig = {
    maxConcurrency: 3,
    retryAttempts: 3,
    retryDelay: 5000,
    timeout: 30000,
  };

  async runDomainScraper(date?: Date): Promise<void> {
    const scraper = new DomainScraper(this.config);
    const startTime = new Date();

    try {
      console.log('Starting Domain scraper...');
      const result = await scraper.scrape();

      if (result.success && result.data) {
        console.log(`Scraped ${result.recordCount} records from Domain`);
        await this.saveAuctionData(result.data);
        
        // Log successful scrape
        await prisma.scrapeLog.create({
          data: {
            source: 'domain',
            status: 'success',
            startTime,
            endTime: new Date(),
            recordCount: result.recordCount,
          },
        });
      } else {
        // Log failed scrape
        await prisma.scrapeLog.create({
          data: {
            source: 'domain',
            status: 'failed',
            startTime,
            endTime: new Date(),
            errorLog: result.error,
          },
        });
      }
    } catch (error) {
      console.error('Domain scraper error:', error);
      await prisma.scrapeLog.create({
        data: {
          source: 'domain',
          status: 'failed',
          startTime,
          endTime: new Date(),
          errorLog: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  async runREAScraper(date?: Date): Promise<void> {
    const scraper = new REAScraper(this.config);
    const startTime = new Date();

    try {
      console.log('Starting REA scraper...');
      const result = await scraper.scrape();

      if (result.success && result.data) {
        console.log(`Scraped ${result.recordCount} records from REA`);
        await this.saveAuctionData(result.data);
        
        // Log successful scrape
        await prisma.scrapeLog.create({
          data: {
            source: 'rea',
            status: 'success',
            startTime,
            endTime: new Date(),
            recordCount: result.recordCount,
          },
        });
      } else {
        // Log failed scrape
        await prisma.scrapeLog.create({
          data: {
            source: 'rea',
            status: 'failed',
            startTime,
            endTime: new Date(),
            errorLog: result.error,
          },
        });
      }
    } catch (error) {
      console.error('REA scraper error:', error);
      await prisma.scrapeLog.create({
        data: {
          source: 'rea',
          status: 'failed',
          startTime,
          endTime: new Date(),
          errorLog: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  async runAllScrapers(date?: Date): Promise<void> {
    console.log('Running all scrapers...');
    
    // Run scrapers in parallel
    await Promise.all([
      this.runDomainScraper(date),
      this.runREAScraper(date),
    ]);
    
    console.log('All scrapers completed');
  }

  private async saveAuctionData(data: RawAuctionData[]): Promise<void> {
    const batchSize = 100;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (auction) => {
          try {
            await prisma.auction.upsert({
              where: {
                address_auctionDate: {
                  address: auction.address,
                  auctionDate: auction.auctionDate,
                },
              },
              update: {
                price: auction.price,
                result: auction.result,
                source: auction.source,
                updatedAt: new Date(),
              },
              create: {
                ...auction,
              },
            });
          } catch (error) {
            console.error('Error saving auction:', error, auction);
          }
        })
      );
    }

    // Update suburb statistics
    await this.updateSuburbStats(data);
  }

  private async updateSuburbStats(data: RawAuctionData[]): Promise<void> {
    // Group by suburb and date
    const suburbGroups = new Map<string, RawAuctionData[]>();
    
    data.forEach((auction) => {
      const key = `${auction.suburb}-${auction.state}-${auction.auctionDate.toDateString()}`;
      if (!suburbGroups.has(key)) {
        suburbGroups.set(key, []);
      }
      suburbGroups.get(key)!.push(auction);
    });

    // Calculate and save stats for each suburb
    for (const [key, auctions] of suburbGroups) {
      const [suburb, state] = key.split('-');
      const date = auctions[0].auctionDate;
      
      const totalAuctions = auctions.length;
      const soldCount = auctions.filter((a) => a.result === 'sold').length;
      const passedInCount = auctions.filter((a) => a.result === 'passed_in').length;
      const withdrawnCount = auctions.filter((a) => a.result === 'withdrawn').length;
      const clearanceRate = totalAuctions > 0 ? (soldCount / totalAuctions) * 100 : 0;
      
      const soldPrices = auctions
        .filter((a) => a.result === 'sold' && a.price)
        .map((a) => a.price!);
      
      const averagePrice = soldPrices.length > 0
        ? soldPrices.reduce((sum, price) => sum + price, 0) / soldPrices.length
        : null;
      
      const medianPrice = soldPrices.length > 0
        ? this.calculateMedian(soldPrices)
        : null;

      await prisma.suburbStats.upsert({
        where: {
          suburb_state_date: {
            suburb,
            state,
            date,
          },
        },
        update: {
          totalAuctions,
          soldCount,
          passedInCount,
          withdrawnCount,
          clearanceRate,
          averagePrice,
          medianPrice,
          updatedAt: new Date(),
        },
        create: {
          suburb,
          state,
          date,
          totalAuctions,
          soldCount,
          passedInCount,
          withdrawnCount,
          clearanceRate,
          averagePrice,
          medianPrice,
        },
      });
    }
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = numbers.sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    
    return sorted[middle];
  }
}