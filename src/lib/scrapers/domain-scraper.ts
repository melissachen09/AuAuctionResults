import { chromium, Browser, Page } from 'playwright';
import { load } from 'cheerio';
import PQueue from 'p-queue';
import { RawAuctionData, ScraperConfig, ScraperResult } from './types';

export class DomainScraper {
  private config: ScraperConfig;
  private browser: Browser | null = null;

  constructor(config: ScraperConfig) {
    this.config = config;
  }

  async initialize() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async scrape(date?: Date): Promise<ScraperResult> {
    try {
      await this.initialize();
      const results: RawAuctionData[] = [];
      
      // Get the auction results page
      const page = await this.browser!.newPage();
      await page.goto('https://www.domain.com.au/auction-results/', {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      // Wait for content to load
      await page.waitForSelector('.css-1u9z1zr', { timeout: 10000 });

      // Get all state links
      const stateLinks = await page.$$eval('a[href*="/auction-results/"]', (links) =>
        links
          .map((link) => link.getAttribute('href'))
          .filter((href) => href && href.includes('/auction-results/') && href.split('/').length > 3)
      );

      const queue = new PQueue({ concurrency: this.config.maxConcurrency });

      // Process each state
      for (const stateLink of stateLinks) {
        queue.add(async () => {
          const stateResults = await this.scrapeState(stateLink!);
          results.push(...stateResults);
        });
      }

      await queue.onIdle();
      await this.close();

      return {
        success: true,
        data: results,
        recordCount: results.length,
      };
    } catch (error) {
      await this.close();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recordCount: 0,
      };
    }
  }

  private async scrapeState(stateUrl: string): Promise<RawAuctionData[]> {
    const results: RawAuctionData[] = [];
    const page = await this.browser!.newPage();

    try {
      await page.goto(`https://www.domain.com.au${stateUrl}`, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      // Get suburb links
      const suburbLinks = await page.$$eval('a[href*="/auction-results/"]', (links) =>
        links
          .map((link) => link.getAttribute('href'))
          .filter((href) => href && href.split('/').length > 4)
      );

      // Process each suburb
      for (const suburbLink of suburbLinks) {
        const suburbResults = await this.scrapeSuburb(suburbLink!);
        results.push(...suburbResults);
      }
    } catch (error) {
      console.error(`Error scraping state ${stateUrl}:`, error);
    } finally {
      await page.close();
    }

    return results;
  }

  private async scrapeSuburb(suburbUrl: string): Promise<RawAuctionData[]> {
    const results: RawAuctionData[] = [];
    const page = await this.browser!.newPage();

    try {
      await page.goto(`https://www.domain.com.au${suburbUrl}`, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      // Wait for auction results to load
      await page.waitForSelector('[data-testid="auction-results-list"]', { timeout: 10000 });

      const html = await page.content();
      const $ = load(html);

      // Extract suburb info from URL
      const urlParts = suburbUrl.split('/');
      const suburb = urlParts[urlParts.length - 3];
      const state = urlParts[urlParts.length - 2];
      const postcode = urlParts[urlParts.length - 1];

      // Parse auction results
      $('[data-testid="auction-result-card"]').each((_, element) => {
        try {
          const $el = $(element);
          
          const address = $el.find('[data-testid="address"]').text().trim();
          const priceText = $el.find('[data-testid="price"]').text().trim();
          const resultText = $el.find('[data-testid="result"]').text().trim().toLowerCase();
          const propertyType = $el.find('[data-testid="property-type"]').text().trim();
          const bedroomsText = $el.find('[data-testid="bedrooms"]').text().trim();
          const bathroomsText = $el.find('[data-testid="bathrooms"]').text().trim();
          const carSpacesText = $el.find('[data-testid="car-spaces"]').text().trim();
          const agentName = $el.find('[data-testid="agent-name"]').text().trim();
          const agencyName = $el.find('[data-testid="agency-name"]').text().trim();

          // Parse price
          let price: number | undefined;
          if (priceText && priceText !== 'Undisclosed') {
            price = parseInt(priceText.replace(/[^0-9]/g, ''));
          }

          // Determine result
          let result: 'sold' | 'passed_in' | 'withdrawn' = 'passed_in';
          if (resultText.includes('sold')) {
            result = 'sold';
          } else if (resultText.includes('withdrawn')) {
            result = 'withdrawn';
          }

          // Parse property details
          const bedrooms = bedroomsText ? parseInt(bedroomsText) : undefined;
          const bathrooms = bathroomsText ? parseInt(bathroomsText) : undefined;
          const carSpaces = carSpacesText ? parseInt(carSpacesText) : undefined;

          results.push({
            address,
            suburb: suburb.replace(/-/g, ' '),
            state: state.toUpperCase(),
            postcode,
            price,
            result,
            auctionDate: new Date(),
            source: 'domain',
            propertyType: propertyType || 'House',
            bedrooms,
            bathrooms,
            carSpaces,
            agentName: agentName || undefined,
            agencyName: agencyName || undefined,
          });
        } catch (error) {
          console.error('Error parsing auction result:', error);
        }
      });
    } catch (error) {
      console.error(`Error scraping suburb ${suburbUrl}:`, error);
    } finally {
      await page.close();
    }

    return results;
  }
}