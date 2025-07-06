import { chromium, Browser } from 'playwright';
import * as cheerio from 'cheerio';
import PQueue from 'p-queue';
import { RawAuctionData, ScraperConfig, ScraperResult } from './types';

interface DomainScraperConfig extends ScraperConfig {
  maxSuburbsPerCity?: number;
}

export class DomainScraper {
  private config: DomainScraperConfig;
  private browser: Browser | null = null;

  constructor(config: DomainScraperConfig) {
    this.config = {
      ...config,
      maxSuburbsPerCity: config.maxSuburbsPerCity || 10
    };
  }

  private constructUrl(href: string): string {
    if (!href) return '';
    
    // If href already starts with http, return as is
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    }
    
    // If href starts with //, prepend https:
    if (href.startsWith('//')) {
      return 'https:' + href;
    }
    
    // If href starts with /, prepend domain
    if (href.startsWith('/')) {
      return 'https://www.domain.com.au' + href;
    }
    
    // Otherwise, assume it's a relative path
    return 'https://www.domain.com.au/' + href;
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
      
      // Define city URLs directly
      const cityUrls = [
        'https://www.domain.com.au/auction-results/sydney/',
        'https://www.domain.com.au/auction-results/melbourne/',
        'https://www.domain.com.au/auction-results/brisbane/',
        'https://www.domain.com.au/auction-results/adelaide/',
        'https://www.domain.com.au/auction-results/canberra/',
        'https://www.domain.com.au/auction-results/perth/'
      ];

      console.log(`Starting Domain scraper with ${cityUrls.length} cities`);
      const queue = new PQueue({ concurrency: this.config.maxConcurrency });

      // Process each city
      for (const cityUrl of cityUrls) {
        queue.add(async () => {
          const cityResults = await this.scrapeCity(cityUrl);
          results.push(...cityResults);
        });
      }

      await queue.onIdle();
      await this.close();

      console.log(`Domain scraper completed: ${results.length} properties found`);
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

  private async scrapeCity(cityUrl: string): Promise<RawAuctionData[]> {
    const results: RawAuctionData[] = [];
    const page = await this.browser!.newPage();

    try {
      console.log(`Scraping city: ${cityUrl}`);
      
      // Set user agent to avoid bot detection
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      await page.goto(cityUrl, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      // Add delay to ensure page fully loads
      await this.delay(2000);

      // Wait for suburb links to load
      await this.safeOperation(
        () => page.waitForSelector('.suburb-results__suburb-item a, a[href*="/auction-results/"][href*="-nsw-"], a[href*="-vic-"], a[href*="-qld-"], a[href*="-sa-"], a[href*="-wa-"], a[href*="-act-"]', { timeout: 15000 }),
        'Wait for suburb links'
      );

      // Get suburb links with better selectors
      const suburbData = await this.safeOperation(
        () => page.$$eval('.suburb-results__suburb-item a, a[href*="/auction-results/"][href*="-nsw-"], a[href*="-vic-"], a[href*="-qld-"], a[href*="-sa-"], a[href*="-wa-"], a[href*="-act-"]', (links) =>
          links
            .map((link) => ({
              href: link.getAttribute('href'),
              text: link.textContent?.trim(),
              parent: link.parentElement?.textContent?.trim()
            }))
            .filter((item) => {
              if (!item.href) return false;
              // Check if it's a suburb link with state code
              return item.href.includes('/auction-results/') && 
                     (item.href.includes('-nsw-') || 
                      item.href.includes('-vic-') || 
                      item.href.includes('-qld-') || 
                      item.href.includes('-sa-') || 
                      item.href.includes('-wa-') || 
                      item.href.includes('-act-') ||
                      item.href.includes('-tas-') ||
                      item.href.includes('-nt-'));
            })
            .map(item => ({
              url: item.href!,
              suburbName: item.text || ''
            }))
        ),
        'Extract suburb links'
      );

      console.log(`Found ${suburbData.length} suburbs in ${cityUrl}`);

      // Process suburbs with rate limiting
      const suburbsToProcess = suburbData.slice(0, this.config.maxSuburbsPerCity || 10);
      
      for (let i = 0; i < suburbsToProcess.length; i++) {
        console.log(`Processing suburb ${i + 1}/${suburbsToProcess.length}: ${suburbsToProcess[i].suburbName}`);
        const suburbResults = await this.scrapeSuburb(suburbsToProcess[i].url);
        results.push(...suburbResults);
        
        // Add delay between suburbs
        if (i < suburbsToProcess.length - 1) {
          await this.delay(1000);
        }
      }
    } catch (error) {
      console.error(`Error scraping city ${cityUrl}:`, error);
    } finally {
      await page.close();
    }

    return results;
  }

  private async scrapeSuburb(suburbUrl: string): Promise<RawAuctionData[]> {
    const results: RawAuctionData[] = [];
    const page = await this.browser!.newPage();

    try {
      const fullUrl = this.constructUrl(suburbUrl);
      console.log(`Scraping suburb: ${fullUrl}`);
      
      // Set user agent
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      await page.goto(fullUrl, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });

      // Add delay to ensure content loads
      await this.delay(2000);

      // Wait for auction results with better selectors
      await this.safeOperation(
        () => page.waitForSelector('.css-1b38kx6, .css-kz9pbu, article[data-testid="listing-card"], div[data-testid="property-card"], .auction-results__property, .property-listing', { timeout: 15000 }),
        'Wait for auction results'
      );

      // Extract suburb info from URL more reliably
      const urlMatch = suburbUrl.match(/\/auction-results\/([^/]+)\/([^-]+)-([a-z]{2,3})-([0-9]{4})/);
      let suburb = '';
      let state = '';
      let postcode = '';
      
      if (urlMatch) {
        suburb = urlMatch[2].replace(/-/g, ' ');
        state = urlMatch[3].toUpperCase();
        postcode = urlMatch[4];
      } else {
        // Fallback parsing
        const urlParts = suburbUrl.split('/').filter(p => p);
        const lastPart = urlParts[urlParts.length - 1];
        const match = lastPart.match(/(.+)-([a-z]{2,3})-([0-9]{4})/i);
        if (match) {
          suburb = match[1].replace(/-/g, ' ');
          state = match[2].toUpperCase();
          postcode = match[3];
        }
      }

      console.log(`Parsing properties for ${suburb}, ${state} ${postcode}`);

      // Get page content and initialize cheerio
      const html = await page.content();
      const $ = cheerio.load(html);

      // Parse auction results using specific selectors
      const propertySelectors = [
        '.css-1b38kx6',
        '.css-kz9pbu', 
        'article[data-testid="listing-card"]',
        'div[data-testid="property-card"]',
        '.auction-results__property',
        '.property-listing',
        'div[class*="property"][class*="card"]',
        'article[class*="listing"]'
      ];
      
      const $properties = $(propertySelectors.join(', '));
      console.log(`Found ${$properties.length} property elements`);

      $properties.each((index: number, element: any) => {
        try {
          const $el = $(element);
          
          // Extract text and structure
          const allText = $el.text();
          const htmlContent = $el.html();
          
          // Try to find address more precisely
          const addressEl = $el.find('h2, h3, [data-testid="address"], .property-address, .listing-address, a[href*="/sale/"], a[href*="/property/"]').first();
          const address = addressEl.length > 0 ? addressEl.text().trim() : this.extractAddress(allText);
          
          // Extract price with better selectors
          const priceEl = $el.find('.property-price, .listing-price, [data-testid="price"], .price, span:contains("$"), div:contains("$")').first();
          const priceText = priceEl.length > 0 ? priceEl.text().trim() : this.extractPrice(allText);
          
          // Extract result with better detection
          const resultEl = $el.find('.property-status, .listing-status, [data-testid="status"], .result, .tag').first();
          const resultText = resultEl.length > 0 ? resultEl.text().trim() : this.extractResult(allText);
          
          // Extract property details
          const detailsEl = $el.find('.property-features, .listing-features, [data-testid="property-features"], .features');
          const detailsText = detailsEl.length > 0 ? detailsEl.text() : allText;
          
          const propertyType = this.extractPropertyType(allText);
          const bedroomsText = this.extractBedrooms(detailsText);
          const bathroomsText = this.extractBathrooms(detailsText);
          const carSpacesText = this.extractCarSpaces(detailsText);
          
          // Extract agent info
          const agentEl = $el.find('.agent-name, .listing-agent, [data-testid="agent-name"]').first();
          const agentName = agentEl.length > 0 ? agentEl.text().trim() : this.extractAgentName(allText);
          
          const agencyEl = $el.find('.agency-name, .listing-agency, [data-testid="agency-name"]').first();
          const agencyName = agencyEl.length > 0 ? agencyEl.text().trim() : this.extractAgencyName(allText);
          
          const propertyUrl = this.extractPropertyUrl($el);

          // Parse price
          let price: number | undefined;
          if (priceText && priceText !== 'Undisclosed') {
            price = parseInt(priceText.replace(/[^0-9]/g, ''));
          }

          // Determine result with better logic
          let result: 'sold' | 'passed_in' | 'withdrawn' = 'passed_in';
          const lowerResult = resultText.toLowerCase();
          if (lowerResult.includes('sold') || (priceText && parseInt(priceText.replace(/[^0-9]/g, '')) > 0)) {
            result = 'sold';
          } else if (lowerResult.includes('withdrawn') || lowerResult.includes('cancelled')) {
            result = 'withdrawn';
          } else if (lowerResult.includes('passed') || lowerResult.includes('pass')) {
            result = 'passed_in';
          }

          if (address && address.length > 5 && address.length < 200) {
            // Clean up suburb name
            const cleanSuburb = suburb.charAt(0).toUpperCase() + suburb.slice(1).toLowerCase();
            
            results.push({
              address,
              suburb: cleanSuburb,
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
            
            if (index < 3) {
              console.log(`Sample property ${index + 1}: ${address} - ${result} ${priceText}`);
            }
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