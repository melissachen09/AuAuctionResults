import { chromium, Browser } from 'playwright';
import { load } from 'cheerio';
import PQueue from 'p-queue';
import { RawAuctionData, ScraperConfig, ScraperResult } from './types';

interface REAScraperConfig extends ScraperConfig {
  maxSuburbsPerCity?: number;
  antiDetectionDelay?: number;
}

export class REAScraper {
  private config: REAScraperConfig;
  private browser: Browser | null = null;

  constructor(config: REAScraperConfig) {
    this.config = {
      ...config,
      maxSuburbsPerCity: config.maxSuburbsPerCity || 5,
      antiDetectionDelay: config.antiDetectionDelay || 3000
    };
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
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=site-per-process',
        '--disable-web-security'
      ],
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
      
      // Define state URLs directly
      const stateUrls = [
        { url: 'https://www.realestate.com.au/auction-results/vic', state: 'VIC' },
        { url: 'https://www.realestate.com.au/auction-results/nsw', state: 'NSW' },
        { url: 'https://www.realestate.com.au/auction-results/qld', state: 'QLD' },
        { url: 'https://www.realestate.com.au/auction-results/sa', state: 'SA' },
        { url: 'https://www.realestate.com.au/auction-results/wa', state: 'WA' },
        { url: 'https://www.realestate.com.au/auction-results/act', state: 'ACT' },
        { url: 'https://www.realestate.com.au/auction-results/tas', state: 'TAS' },
        { url: 'https://www.realestate.com.au/auction-results/nt', state: 'NT' }
      ];

      console.log(`Starting REA scraper with ${stateUrls.length} states`);
      
      // Process states sequentially to avoid detection
      for (const stateInfo of stateUrls.slice(0, 2)) { // Start with just 2 states
        try {
          console.log(`Processing state: ${stateInfo.state}`);
          const stateResults = await this.scrapeState(stateInfo);
          results.push(...stateResults);
          
          // Add delay between states
          await this.delay(this.config.antiDetectionDelay!);
        } catch (error) {
          console.error(`Error processing state ${stateInfo.state}:`, error);
        }
      }
      await this.close();

      console.log(`REA scraper completed: ${results.length} properties found`);
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

  private async scrapeState(stateInfo: { url: string; state: string }): Promise<RawAuctionData[]> {
    const results: RawAuctionData[] = [];
    const page = await this.browser!.newPage();

    try {
      // Set realistic viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Add extra headers to appear more legitimate
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Upgrade-Insecure-Requests': '1'
      });

      console.log(`Navigating to: ${stateInfo.url}`);
      await page.goto(stateInfo.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait for initial content and handle bot protection
      await this.delay(5000);
      
      // Check for bot protection
      const bodyText = await page.textContent('body');
      if (bodyText?.includes('checking your browser') || bodyText?.includes('Kasada')) {
        console.log('Bot protection detected, waiting longer...');
        await this.delay(10000);
      }

      // Try to find suburb links
      const suburbLinks = await this.extractSuburbLinks(page);
      console.log(`Found ${suburbLinks.length} suburbs in ${stateInfo.state}`);

      // Process limited suburbs to avoid detection
      const suburbsToProcess = suburbLinks.slice(0, this.config.maxSuburbsPerCity!);
      
      for (let i = 0; i < suburbsToProcess.length; i++) {
        console.log(`Processing suburb ${i + 1}/${suburbsToProcess.length}: ${suburbsToProcess[i].name}`);
        const suburbResults = await this.scrapeSuburb(suburbsToProcess[i], stateInfo.state);
        results.push(...suburbResults);
        
        // Random delay between suburbs
        await this.delay(2000 + Math.random() * 3000);
      }
    } catch (error) {
      console.error(`Error scraping state ${stateInfo.state}:`, error);
    } finally {
      await page.close();
    }

    return results;
  }

  private async extractSuburbLinks(page: any): Promise<Array<{ url: string; name: string }>> {
    try {
      // Wait for suburb links with multiple possible selectors
      await this.safeOperation(
        () => page.waitForSelector('a[href*="/auction-results/"], .suburb-link, [data-testid="suburb-link"]', { timeout: 15000 }),
        'Wait for suburb links'
      );

      // Extract links
      return await page.$$eval('a[href*="/auction-results/"]', (links: any[]) =>
        links
          .filter(link => {
            const href = link.getAttribute('href');
            // Filter for suburb-specific links
            return href && href.includes('/auction-results/') && 
                   (href.match(/\/auction-results\/[a-z]+\/[^/]+$/i) || 
                    href.includes('-') && href.split('/').length > 4);
          })
          .map(link => ({
            url: link.getAttribute('href'),
            name: link.textContent?.trim() || ''
          }))
          .slice(0, 20) // Limit to prevent too many suburbs
      );
    } catch (error) {
      console.error('Failed to extract suburb links:', error);
      return [];
    }
  }

  private async scrapeSuburb(suburbInfo: { url: string; name: string }, state: string): Promise<RawAuctionData[]> {
    const results: RawAuctionData[] = [];
    const page = await this.browser!.newPage();

    try {
      const fullUrl = suburbInfo.url.startsWith('http') ? suburbInfo.url : `https://www.realestate.com.au${suburbInfo.url}`;
      console.log(`Scraping suburb: ${fullUrl}`);
      
      // Set user agent for each page
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      await page.goto(fullUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait for content
      await this.delay(3000);

      // Extract suburb details from URL
      const urlMatch = fullUrl.match(/\/auction-results\/([^/]+)\/([^/]+)$/);
      const suburb = urlMatch ? urlMatch[2].replace(/-/g, ' ') : suburbInfo.name;
      
      // Try to extract postcode from page or URL
      const pageText = await page.textContent('body');
      const postcodeMatch = pageText?.match(/\b([0-9]{4})\b/);
      const postcode = postcodeMatch ? postcodeMatch[1] : '';

      // Wait for property listings
      await this.safeOperation(
        () => page.waitForSelector('article, .property-card, [data-testid="property"], .listing-card, .auction-result', { timeout: 15000 }),
        'Wait for property listings'
      );

      const html = await page.content();
      const $ = load(html);

      // Find property elements
      const propertySelectors = [
        'article.property-card',
        'div.property-card',
        'article[data-testid="property"]',
        'div.listing-card',
        'div.auction-result',
        'article[class*="Card"]',
        'div[class*="property"][class*="card"]'
      ];
      
      const $properties = $(propertySelectors.join(', '));
      console.log(`Found ${$properties.length} property elements in ${suburb}`);

      $properties.each((index, element) => {
        try {
          const $el = $(element);
          
          // Extract address
          const addressEl = $el.find('h2, h3, .property-address, [data-testid="address"], a[href*="/property-"]').first();
          const address = addressEl.text().trim();
          
          // Extract price
          const priceEl = $el.find('.property-price, [data-testid="price"], .price, span:contains("$")').first();
          const priceText = priceEl.text().trim();
          let price: number | undefined;
          if (priceText && priceText !== 'Undisclosed') {
            const priceMatch = priceText.match(/\$?([\d,]+)/);
            if (priceMatch) {
              price = parseInt(priceMatch[1].replace(/,/g, ''));
            }
          }
          
          // Extract result
          const statusEl = $el.find('.property-status, .status, [data-testid="status"], .tag').first();
          const statusText = statusEl.text().trim().toLowerCase();
          let result: 'sold' | 'passed_in' | 'withdrawn' = 'passed_in';
          if (statusText.includes('sold') || (price && price > 0)) {
            result = 'sold';
          } else if (statusText.includes('withdrawn')) {
            result = 'withdrawn';
          }
          
          // Extract property details
          const detailsEl = $el.find('.property-features, .features, [data-testid="property-features"]');
          const detailsText = detailsEl.text();
          
          const bedrooms = this.extractNumber(detailsText, /(\d+)\s*bed/i);
          const bathrooms = this.extractNumber(detailsText, /(\d+)\s*bath/i);
          const carSpaces = this.extractNumber(detailsText, /(\d+)\s*car/i);
          
          // Extract property type
          const typeMatch = $el.text().match(/\b(house|apartment|unit|townhouse|villa|duplex)\b/i);
          const propertyType = typeMatch ? typeMatch[1] : 'House';
          
          // Extract agent info
          const agentEl = $el.find('.agent-name, [data-testid="agent-name"]').first();
          const agentName = agentEl.text().trim() || undefined;
          
          const agencyEl = $el.find('.agency-name, [data-testid="agency-name"]').first();
          const agencyName = agencyEl.text().trim() || undefined;
          
          // Extract property URL
          const propertyLink = $el.find('a[href*="/property-"]').first();
          const propertyUrl = propertyLink.attr('href');
          const fullPropertyUrl = propertyUrl ? 
            (propertyUrl.startsWith('http') ? propertyUrl : `https://www.realestate.com.au${propertyUrl}`) : 
            undefined;

          if (address && address.length > 5 && address.length < 200) {
            const cleanSuburb = suburb.charAt(0).toUpperCase() + suburb.slice(1).toLowerCase();
            
            results.push({
              address,
              suburb: cleanSuburb,
              state,
              postcode,
              price,
              result,
              auctionDate: new Date(),
              source: 'rea',
              propertyType,
              bedrooms,
              bathrooms,
              carSpaces,
              agentName,
              agencyName,
              propertyUrl: fullPropertyUrl,
            });
            
            if (index < 3) {
              console.log(`Sample property ${index + 1}: ${address} - ${result} ${priceText}`);
            }
          }
        } catch (error) {
          console.error('Error parsing property:', error);
        }
      });
    } catch (error) {
      console.error(`Error scraping suburb ${suburbInfo.name}:`, error);
    } finally {
      await page.close();
    }

    return results;
  }

  private extractNumber(text: string, pattern: RegExp): number | undefined {
    const match = text.match(pattern);
    return match ? parseInt(match[1]) : undefined;
  }
}