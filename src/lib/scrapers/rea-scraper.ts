import { chromium, Browser } from 'playwright';
import { load } from 'cheerio';
import PQueue from 'p-queue';
import { RawAuctionData, ScraperConfig, ScraperResult } from './types';

export class REAScraper {
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
      await page.goto('https://www.realestate.com.au/auction-results/', {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      // Wait for content to load using semantic approach
      await this.safeOperation(
        () => page.waitForSelector('main, [role="main"], .auction-results', { timeout: 10000 }),
        'Wait for main content'
      );

      // Get all state links using semantic selectors
      const stateLinks = await this.safeOperation(
        () => page.$$eval('a[href*="auction-results"]', (links) =>
          links.map((link) => ({
            href: link.getAttribute('href'),
            state: link.textContent?.trim(),
          })).filter((item) => item.href && item.state && item.href.includes('auction-results'))
        ),
        'Extract state links'
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

      // Wait for suburb list using semantic selectors
      await this.safeOperation(
        () => page.waitForSelector('main, [role="main"], .suburb-list, ul, nav', { timeout: 10000 }),
        'Wait for suburb list'
      );

      // Get suburb links using intelligent content-based selection
      const suburbData = await this.safeOperation(
        () => page.$$eval('a[href*="auction-results"]', (links) => {
          return links.map((link) => {
            const href = link.getAttribute('href');
            const text = link.textContent?.trim();
            
            // Extract suburb and postcode from text or URL
            const postcodeMatch = text?.match(/\b\d{4}\b/) || href?.match(/\b\d{4}\b/);
            const suburb = text?.replace(/\b\d{4}\b/, '').trim();
            
            return {
              href,
              suburb,
              postcode: postcodeMatch?.[0],
            };
          }).filter((item) => item.href && item.suburb && item.href.split('/').length > 4);
        }),
        'Extract suburb data'
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

      // Wait for auction results using semantic selectors
      await this.safeOperation(
        () => page.waitForSelector('main, [role="main"], .auction-results-list, article, .property', { timeout: 10000 }),
        'Wait for auction results'
      );

      const html = await page.content();
      const $ = load(html);

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
          const resultBadge = this.extractResult(allText);
          const propertyType = this.extractPropertyType(allText);
          
          // Extract property features using intelligent parsing
          const bedrooms = this.extractBedrooms(allText);
          const bathrooms = this.extractBathrooms(allText);
          const carSpaces = this.extractCarSpaces(allText);
          
          const agentName = this.extractAgentName(allText);
          const agencyName = this.extractAgencyName(allText);
          const propertyUrl = this.extractPropertyUrl($el);

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

          if (address) {
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
              propertyUrl: propertyUrl || undefined,
            });
          }
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
        return `https://www.realestate.com.au${href}`;
      } else if (href && href.startsWith('https://www.realestate.com.au')) {
        return href;
      }
    }
    
    // Alternative: look for any link that might be a property URL
    const anyLink = $element.find('a[href*="realestate.com.au"]').first();
    if (anyLink.length > 0) {
      const href = anyLink.attr('href');
      if (href && (href.includes('/property/') || href.includes('/buy/') || href.includes('/rent/'))) {
        return href.startsWith('http') ? href : `https://www.realestate.com.au${href}`;
      }
    }
    
    return undefined;
  }
}