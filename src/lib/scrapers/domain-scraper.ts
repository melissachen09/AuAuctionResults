import { chromium, Browser } from 'playwright';
import { load } from 'cheerio';
import PQueue from 'p-queue';
import { RawAuctionData, ScraperConfig, ScraperResult } from './types';

export class DomainScraper {
  private config: ScraperConfig;
  private browser: Browser | null = null;

  constructor(config: ScraperConfig) {
    this.config = config;
  }

  private async safeOperation<T>(operation: () => Promise<T>, operationName: string, maxRetries = 3): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        console.warn(`${operationName} failed, attempt ${i + 1}/${maxRetries}`, error);
        
        if (this.isRecoverableError(error)) {
          await this.delay(2000 * (i + 1));
          continue;
        }
        
        throw error;
      }
    }
    throw new Error(`${operationName} failed after ${maxRetries} attempts`);
  }

  private isRecoverableError(error: unknown): boolean {
    const recoverablePatterns = [
      'timeout',
      'network',
      'navigation',
      'element not found'
    ];
    
    return recoverablePatterns.some(pattern => 
      (error as Error).message?.toLowerCase().includes(pattern)
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  async scrape(): Promise<ScraperResult> {
    try {
      await this.initialize();
      const results: RawAuctionData[] = [];
      
      // Get the auction results page
      const page = await this.browser!.newPage();
      await page.goto('https://www.domain.com.au/auction-results/', {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      // Wait for content to load using semantic approach
      await this.safeOperation(
        () => page.waitForSelector('main, [role="main"], nav, .css-1u9z1zr', { timeout: 10000 }),
        'Wait for main content'
      );

      // Get all state links using semantic selectors
      const stateLinks = await this.safeOperation(
        () => page.$$eval('a[href*="/auction-results/"]', (links) =>
          links
            .map((link) => link.getAttribute('href'))
            .filter((href) => href && href.includes('/auction-results/') && href.split('/').length > 3)
        ),
        'Extract state links'
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

      // Get suburb links using semantic selectors
      const suburbLinks = await this.safeOperation(
        () => page.$$eval('a[href*="/auction-results/"]', (links) =>
          links
            .map((link) => link.getAttribute('href'))
            .filter((href) => href && href.split('/').length > 4)
        ),
        'Extract suburb links'
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

      // Wait for auction results using semantic selectors
      await this.safeOperation(
        () => page.waitForSelector('main, [role="main"], [data-testid="auction-results-list"], article, .property', { timeout: 10000 }),
        'Wait for auction results'
      );

      const html = await page.content();
      const $ = load(html);

      // Extract suburb info from URL
      const urlParts = suburbUrl.split('/');
      const suburb = urlParts[urlParts.length - 3];
      const state = urlParts[urlParts.length - 2];
      const postcode = urlParts[urlParts.length - 1];

      // Parse auction results using intelligent content detection
      const potentialContainers = $('div, article, section, li').filter((_, element) => {
        const text = $(element).text();
        return this.looksLikeAuctionResult(text);
      });

      potentialContainers.each((_, element) => {
        try {
          const $el = $(element);
          
          const allText = $el.text();
          const address = this.extractAddress(allText);
          const priceText = this.extractPrice(allText);
          const resultText = this.extractResult(allText);
          const propertyType = this.extractPropertyType(allText);
          const bedroomsText = this.extractBedrooms(allText);
          const bathroomsText = this.extractBathrooms(allText);
          const carSpacesText = this.extractCarSpaces(allText);
          const agentName = this.extractAgentName(allText);
          const agencyName = this.extractAgencyName(allText);
          const propertyUrl = this.extractPropertyUrl($el);

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

          if (address) {
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
              bedrooms: bedroomsText,
              bathrooms: bathroomsText,
              carSpaces: carSpacesText,
              agentName: agentName || undefined,
              agencyName: agencyName || undefined,
              propertyUrl: propertyUrl || undefined,
            });
          }
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

  private looksLikeAuctionResult(text: string): boolean {
    const indicators = [
      /\$[\d,]+/,  // Contains price
      /\b\d{4}\b/,  // Contains postcode
      /\b(sold|passed|withdrawn)\b/i,  // Contains result
      /\b(bed|bath|car)\b/i,  // Contains property features
    ];
    
    return indicators.filter(pattern => pattern.test(text)).length >= 2;
  }

  private extractAddress(text: string): string | null {
    const lines = text.split('\n').map(line => line.trim());
    // Look for line that contains address-like patterns
    for (const line of lines) {
      if (line.match(/\d+.*\b(street|st|road|rd|avenue|ave|drive|dr|lane|ln|court|ct|place|pl)\b/i)) {
        return line;
      }
    }
    return lines[0] || null;
  }

  private extractPrice(text: string): string {
    const priceMatch = text.match(/\$([\d,]+(?:\.\d{2})?)/i);
    return priceMatch ? priceMatch[0] : '';
  }

  private extractResult(text: string): string {
    const resultMatch = text.match(/\b(sold|passed|withdrawn|cancelled)\b/i);
    return resultMatch ? resultMatch[1].toLowerCase() : '';
  }

  private extractPropertyType(text: string): string {
    const typeMatch = text.match(/\b(house|apartment|unit|townhouse|villa|duplex)\b/i);
    return typeMatch ? typeMatch[1] : 'House';
  }

  private extractBedrooms(text: string): number | undefined {
    const match = text.match(/(\d+)\s*bed/i);
    return match ? parseInt(match[1]) : undefined;
  }

  private extractBathrooms(text: string): number | undefined {
    const match = text.match(/(\d+)\s*bath/i);
    return match ? parseInt(match[1]) : undefined;
  }

  private extractCarSpaces(text: string): number | undefined {
    const match = text.match(/(\d+)\s*car/i);
    return match ? parseInt(match[1]) : undefined;
  }

  private extractAgentName(text: string): string | undefined {
    const lines = text.split('\n').map(line => line.trim());
    // Look for agent name patterns
    for (const line of lines) {
      if (line.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/)) {
        return line;
      }
    }
    return undefined;
  }

  private extractAgencyName(text: string): string | undefined {
    const lines = text.split('\n').map(line => line.trim());
    // Look for agency name patterns (typically contains "Real Estate" or "Realty")
    for (const line of lines) {
      if (line.match(/\b(real estate|realty|properties|property|group)\b/i)) {
        return line;
      }
    }
    return undefined;
  }

  private extractPropertyUrl($element: any): string | undefined {
    // Look for property links within the element
    const propertyLink = $element.find('a[href*="/property/"]').first();
    if (propertyLink.length > 0) {
      const href = propertyLink.attr('href');
      if (href && href.startsWith('/')) {
        return `https://www.domain.com.au${href}`;
      } else if (href && href.startsWith('https://www.domain.com.au')) {
        return href;
      }
    }
    
    // Alternative: look for any link that might be a property URL
    const anyLink = $element.find('a[href*="domain.com.au"]').first();
    if (anyLink.length > 0) {
      const href = anyLink.attr('href');
      if (href && (href.includes('/property/') || href.includes('/sale/') || href.includes('/rent/'))) {
        return href.startsWith('http') ? href : `https://www.domain.com.au${href}`;
      }
    }
    
    return undefined;
  }
}