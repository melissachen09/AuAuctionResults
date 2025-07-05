import { chromium, Browser, Page } from 'playwright';
import { load } from 'cheerio';
import PQueue from 'p-queue';
import { RawAuctionData, ScraperConfig, ScraperResult } from './types';

export class REAScraper {
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
      await page.goto('https://www.realestate.com.au/auction-results/', {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      // Wait for content to load
      await page.waitForSelector('.auction-results', { timeout: 10000 });

      // Get all state links
      const stateLinks = await page.$$eval('.state-links a', (links) =>
        links.map((link) => ({
          href: link.getAttribute('href'),
          state: link.textContent?.trim(),
        })).filter((item) => item.href && item.state)
      );

      const queue = new PQueue({ concurrency: this.config.maxConcurrency });

      // Process each state
      for (const stateLink of stateLinks) {
        queue.add(async () => {
          const stateResults = await this.scrapeState(stateLink.href!, stateLink.state!);
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

  private async scrapeState(stateUrl: string, stateName: string): Promise<RawAuctionData[]> {
    const results: RawAuctionData[] = [];
    const page = await this.browser!.newPage();

    try {
      await page.goto(stateUrl, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      // Wait for suburb list to load
      await page.waitForSelector('.suburb-list', { timeout: 10000 });

      // Get suburb links
      const suburbData = await page.$$eval('.suburb-list a', (links) =>
        links.map((link) => ({
          href: link.getAttribute('href'),
          suburb: link.querySelector('.suburb-name')?.textContent?.trim(),
          postcode: link.querySelector('.postcode')?.textContent?.trim(),
        })).filter((item) => item.href && item.suburb)
      );

      // Process each suburb
      for (const suburb of suburbData) {
        const suburbResults = await this.scrapeSuburb(
          suburb.href!,
          suburb.suburb!,
          stateName,
          suburb.postcode || ''
        );
        results.push(...suburbResults);
      }
    } catch (error) {
      console.error(`Error scraping state ${stateName}:`, error);
    } finally {
      await page.close();
    }

    return results;
  }

  private async scrapeSuburb(
    suburbUrl: string,
    suburbName: string,
    stateName: string,
    postcode: string
  ): Promise<RawAuctionData[]> {
    const results: RawAuctionData[] = [];
    const page = await this.browser!.newPage();

    try {
      await page.goto(suburbUrl, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      // Wait for auction results to load
      await page.waitForSelector('.auction-results-list', { timeout: 10000 });

      const html = await page.content();
      const $ = load(html);

      // Parse auction results
      $('.auction-result-item').each((_, element) => {
        try {
          const $el = $(element);
          
          const address = $el.find('.property-address').text().trim();
          const priceText = $el.find('.property-price').text().trim();
          const resultBadge = $el.find('.result-badge').text().trim().toLowerCase();
          const propertyType = $el.find('.property-type').text().trim();
          
          // Extract property features
          const features = $el.find('.property-features span');
          const bedroomsText = features.filter(':contains("bed")').text();
          const bathroomsText = features.filter(':contains("bath")').text();
          const carSpacesText = features.filter(':contains("car")').text();
          
          const agentInfo = $el.find('.agent-info');
          const agentName = agentInfo.find('.agent-name').text().trim();
          const agencyName = agentInfo.find('.agency-name').text().trim();

          // Parse price
          let price: number | undefined;
          if (priceText && !priceText.includes('Undisclosed')) {
            const priceMatch = priceText.match(/\$?([\d,]+)/);
            if (priceMatch) {
              price = parseInt(priceMatch[1].replace(/,/g, ''));
            }
          }

          // Determine result
          let result: 'sold' | 'passed_in' | 'withdrawn' = 'passed_in';
          if (resultBadge.includes('sold')) {
            result = 'sold';
          } else if (resultBadge.includes('withdrawn') || resultBadge.includes('cancelled')) {
            result = 'withdrawn';
          }

          // Parse property details
          const bedrooms = bedroomsText ? parseInt(bedroomsText.match(/\d+/)?.[0] || '0') : undefined;
          const bathrooms = bathroomsText ? parseInt(bathroomsText.match(/\d+/)?.[0] || '0') : undefined;
          const carSpaces = carSpacesText ? parseInt(carSpacesText.match(/\d+/)?.[0] || '0') : undefined;

          results.push({
            address,
            suburb: suburbName,
            state: this.getStateCode(stateName),
            postcode: postcode || this.extractPostcode(address),
            price,
            result,
            auctionDate: new Date(),
            source: 'rea',
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
      console.error(`Error scraping suburb ${suburbName}:`, error);
    } finally {
      await page.close();
    }

    return results;
  }

  private getStateCode(stateName: string): string {
    const stateMap: { [key: string]: string } = {
      'New South Wales': 'NSW',
      'Victoria': 'VIC',
      'Queensland': 'QLD',
      'Western Australia': 'WA',
      'South Australia': 'SA',
      'Tasmania': 'TAS',
      'Australian Capital Territory': 'ACT',
      'Northern Territory': 'NT',
    };
    return stateMap[stateName] || stateName.toUpperCase();
  }

  private extractPostcode(address: string): string {
    const postcodeMatch = address.match(/\b\d{4}\b/);
    return postcodeMatch ? postcodeMatch[0] : '';
  }
}