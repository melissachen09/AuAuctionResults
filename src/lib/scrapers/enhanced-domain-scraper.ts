import { chromium, Browser } from 'playwright';
import { load } from 'cheerio';
import { RawAuctionData, ScraperConfig, ScraperResult } from './types';

export class EnhancedDomainScraper {
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

  async scrapeUrl(url: string): Promise<ScraperResult> {
    try {
      await this.initialize();
      const results: RawAuctionData[] = [];
      
      console.log(`Scraping URL: ${url}`);
      const page = await this.browser!.newPage();
      
      // Navigate to the specific URL
      await this.safeOperation(
        () => page.goto(url, {
          waitUntil: 'networkidle',
          timeout: this.config.timeout,
        }),
        'Navigate to URL'
      );

      // Wait for content to load
      await this.safeOperation(
        () => page.waitForSelector('main, .results, [class*="result"], [class*="auction"], [class*="property"]', { timeout: 10000 }),
        'Wait for content'
      );

      // Take a screenshot for debugging
      await page.screenshot({ path: 'debug-domain-page.png', fullPage: true });
      
      const html = await page.content();
      const $ = load(html);

      console.log('Page loaded, analyzing structure...');
      
      // Auto-detect auction result containers
      const potentialContainers = this.findAuctionContainers($);
      console.log(`Found ${potentialContainers.length} potential auction containers`);

      potentialContainers.forEach((container, index) => {
        try {
          const auctionData = this.extractAuctionData($, container, url);
          if (auctionData) {
            results.push(auctionData);
            console.log(`Extracted auction ${index + 1}: ${auctionData.address}`);
          }
        } catch (error) {
          console.error(`Error extracting auction ${index + 1}:`, error);
        }
      });

      await this.close();

      console.log(`Successfully extracted ${results.length} auction results`);
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

  private findAuctionContainers($: cheerio.Root): cheerio.Cheerio<cheerio.Element> {
    // Multiple strategies to find auction containers
    const strategies = [
      // Common Domain patterns
      '[data-testid*="auction"]',
      '[data-testid*="result"]',
      '[data-testid*="property"]',
      '.auction-result',
      '.property-result',
      '.result-card',
      '.auction-card',
      '.property-card',
      // Generic patterns for auction listings
      'article',
      '.listing',
      '.item',
      // Look for containers with auction-related content
      '*:contains("sold"):parent',
      '*:contains("passed in"):parent',
      '*:contains("$"):parent'
    ];

    let bestContainers: cheerio.Cheerio<cheerio.Element> = $();
    let maxScore = 0;

    for (const strategy of strategies) {
      try {
        const containers = $(strategy);
        if (containers.length > 0) {
          const score = this.scoreContainers($, containers);
          console.log(`Strategy "${strategy}": found ${containers.length} containers, score: ${score}`);
          
          if (score > maxScore) {
            maxScore = score;
            bestContainers = containers;
          }
        }
      } catch (e) {
        // Continue with next strategy
      }
    }

    // If no good containers found, try a more generic approach
    if (bestContainers.length === 0) {
      console.log('No containers found with specific strategies, trying generic approach...');
      const genericContainers = $('div, article, section, li').filter((_, element) => {
        const text = $(element).text();
        return this.looksLikeAuctionResult(text) && text.length > 50 && text.length < 1000;
      });
      
      bestContainers = genericContainers;
    }

    return bestContainers;
  }

  private scoreContainers($: cheerio.Root, containers: cheerio.Cheerio<cheerio.Element>): number {
    let score = 0;
    
    containers.each((_, container) => {
      const $container = $(container);
      const text = $container.text();
      
      // Score based on auction-related content
      if (text.match(/\$[\d,]+/)) score += 10; // Contains price
      if (text.match(/\b(sold|passed|withdrawn)\b/i)) score += 10; // Contains result
      if (text.match(/\d+\s*(bed|bath|car)/i)) score += 5; // Contains property features
      if (text.match(/\b\d{4}\b/)) score += 5; // Contains postcode
      if (text.match(/\d+.*\b(street|st|road|rd|avenue|ave)\b/i)) score += 8; // Contains address
      
      // Penalty for too long or too short text
      if (text.length < 20 || text.length > 2000) score -= 5;
    });

    return score;
  }

  private extractAuctionData($: cheerio.Root, container: cheerio.Element, sourceUrl: string): RawAuctionData | null {
    const $container = $(container);
    const allText = $container.text();
    
    // Skip if doesn't look like auction data
    if (!this.looksLikeAuctionResult(allText)) {
      return null;
    }

    const address = this.extractAddress($container, allText);
    if (!address) {
      return null; // Skip if no address found
    }

    // Extract location info from URL or content
    const locationInfo = this.extractLocationFromUrl(sourceUrl) || this.extractLocationFromContent(allText);
    
    return {
      address,
      suburb: locationInfo.suburb || this.extractSuburb(allText) || 'Unknown',
      state: locationInfo.state || this.extractState(allText) || 'NSW',
      postcode: this.extractPostcode(allText) || locationInfo.postcode || '',
      price: this.extractPriceNumber(allText),
      result: this.mapResult(this.extractResult(allText)),
      auctionDate: new Date(),
      source: 'domain',
      propertyType: this.extractPropertyType(allText) || 'House',
      bedrooms: this.extractBedrooms(allText),
      bathrooms: this.extractBathrooms(allText),
      carSpaces: this.extractCarSpaces(allText),
      agentName: this.extractAgentName($container, allText),
      agencyName: this.extractAgencyName($container, allText),
    };
  }

  private extractAddress($container: cheerio.Cheerio<cheerio.Element>, allText: string): string | null {
    // Try to find address in specific elements first
    const addressSelectors = [
      '.address',
      '.property-address',
      '[data-testid*="address"]',
      'h1', 'h2', 'h3',
      'a[href*="/property/"]'
    ];

    for (const selector of addressSelectors) {
      const element = $container.find(selector).first();
      if (element.length) {
        const text = element.text().trim();
        if (text && this.looksLikeAddress(text)) {
          return text;
        }
      }
    }

    // Fallback to text analysis
    const lines = allText.split(/\n|,/).map(line => line.trim());
    for (const line of lines) {
      if (this.looksLikeAddress(line)) {
        return line;
      }
    }

    return null;
  }

  private looksLikeAddress(text: string): boolean {
    return Boolean(
      text.match(/^\d+/) && // Starts with number
      text.match(/\b(street|st|road|rd|avenue|ave|drive|dr|lane|ln|court|ct|place|pl|way|crescent|cres)\b/i) &&
      text.length > 10 && text.length < 100
    );
  }

  private extractLocationFromUrl(url: string): { suburb?: string; state?: string; postcode?: string } {
    const urlParts = url.split('/');
    
    // For Domain URLs like /auction-results/sydney/ or /auction-results/melbourne/
    if (urlParts.includes('auction-results')) {
      const cityIndex = urlParts.indexOf('auction-results') + 1;
      if (cityIndex < urlParts.length) {
        const city = urlParts[cityIndex].replace(/-/g, ' ');
        const state = this.cityToState(city);
        return { suburb: city, state };
      }
    }

    return {};
  }

  private cityToState(city: string): string {
    const cityStateMap: { [key: string]: string } = {
      'sydney': 'NSW',
      'melbourne': 'VIC',
      'brisbane': 'QLD',
      'perth': 'WA',
      'adelaide': 'SA',
      'canberra': 'ACT',
      'hobart': 'TAS',
      'darwin': 'NT'
    };
    
    return cityStateMap[city.toLowerCase()] || 'NSW';
  }

  private extractLocationFromContent(text: string): { suburb?: string; state?: string; postcode?: string } {
    const stateMatch = text.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/);
    const postcodeMatch = text.match(/\b\d{4}\b/);
    
    return {
      state: stateMatch?.[1],
      postcode: postcodeMatch?.[0]
    };
  }

  private extractPriceNumber(text: string): number | undefined {
    const priceMatch = text.match(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
    if (priceMatch) {
      return parseInt(priceMatch[1].replace(/,/g, ''));
    }
    return undefined;
  }

  private mapResult(result: string): 'sold' | 'passed_in' | 'withdrawn' {
    const lower = result.toLowerCase();
    if (lower.includes('sold')) return 'sold';
    if (lower.includes('withdrawn') || lower.includes('cancelled')) return 'withdrawn';
    return 'passed_in';
  }

  private extractAgentName($container: cheerio.Cheerio<cheerio.Element>, allText: string): string | undefined {
    // Try to find agent in specific elements
    const agentSelectors = [
      '.agent',
      '.agent-name',
      '[data-testid*="agent"]'
    ];

    for (const selector of agentSelectors) {
      const element = $container.find(selector).first();
      if (element.length) {
        const text = element.text().trim();
        if (text && this.looksLikePersonName(text)) {
          return text;
        }
      }
    }

    // Fallback to text analysis
    const lines = allText.split(/\n/).map(line => line.trim());
    for (const line of lines) {
      if (this.looksLikePersonName(line)) {
        return line;
      }
    }

    return undefined;
  }

  private extractAgencyName($container: cheerio.Cheerio<cheerio.Element>, allText: string): string | undefined {
    // Try to find agency in specific elements
    const agencySelectors = [
      '.agency',
      '.agency-name',
      '[data-testid*="agency"]'
    ];

    for (const selector of agencySelectors) {
      const element = $container.find(selector).first();
      if (element.length) {
        const text = element.text().trim();
        if (text && this.looksLikeAgencyName(text)) {
          return text;
        }
      }
    }

    // Fallback to text analysis
    const lines = allText.split(/\n/).map(line => line.trim());
    for (const line of lines) {
      if (this.looksLikeAgencyName(line)) {
        return line;
      }
    }

    return undefined;
  }

  private looksLikePersonName(text: string): boolean {
    return Boolean(
      text.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/) &&
      text.length > 5 && text.length < 50 &&
      !text.match(/\b(real estate|realty|properties|property|group|ltd|pty)\b/i)
    );
  }

  private looksLikeAgencyName(text: string): boolean {
    return Boolean(
      text.match(/\b(real estate|realty|properties|property|group|ltd|pty)\b/i) &&
      text.length > 5 && text.length < 100
    );
  }

  // Reuse existing helper methods from the original scraper
  private looksLikeAuctionResult(text: string): boolean {
    const indicators = [
      /\$[\d,]+/,  // Contains price
      /\b\d{4}\b/,  // Contains postcode
      /\b(sold|passed|withdrawn)\b/i,  // Contains result
      /\b(bed|bath|car)\b/i,  // Contains property features
    ];
    
    return indicators.filter(pattern => pattern.test(text)).length >= 2;
  }

  private extractSuburb(text: string): string | undefined {
    // Look for suburb patterns in text
    const lines = text.split(/\n|,/).map(line => line.trim());
    for (const line of lines) {
      // Look for capitalized words that might be suburbs
      if (line.match(/^[A-Z][a-z]+(?: [A-Z][a-z]+)*$/)) {
        return line;
      }
    }
    return undefined;
  }

  private extractState(text: string): string | undefined {
    const stateMatch = text.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/);
    return stateMatch?.[1];
  }

  private extractPostcode(text: string): string {
    const postcodeMatch = text.match(/\b\d{4}\b/);
    return postcodeMatch ? postcodeMatch[0] : '';
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
}