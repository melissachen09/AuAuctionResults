import { load } from 'cheerio';
import { RawAuctionData, ScraperResult } from './types';

export class HttpDomainScraper {
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

  async scrapeUrl(url: string): Promise<ScraperResult> {
    try {
      console.log(`Fetching URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log(`Received ${html.length} characters of HTML`);
      
      // Save HTML for debugging
      const fs = await import('fs/promises');
      await fs.writeFile('debug-domain-html.html', html);
      console.log('Saved HTML to debug-domain-html.html for analysis');

      const $ = load(html);
      const results: RawAuctionData[] = [];

      // Look for auction result patterns in the HTML
      console.log('Analyzing HTML structure for auction results...');
      
      // Multiple strategies to find auction data
      const strategies = [
        // Strategy 1: Look for script tags with JSON data
        this.extractFromScriptTags($),
        // Strategy 2: Look for structured data elements
        this.extractFromStructuredElements($, url),
        // Strategy 3: Look for common auction result patterns
        this.extractFromContentPatterns($, url)
      ];

      for (const strategy of strategies) {
        if (strategy.length > 0) {
          results.push(...strategy);
          console.log(`Found ${strategy.length} results using current strategy`);
        }
      }

      // Remove duplicates based on address
      const uniqueResults = this.removeDuplicates(results);
      
      console.log(`Total unique results found: ${uniqueResults.length}`);

      return {
        success: true,
        data: uniqueResults,
        recordCount: uniqueResults.length,
      };

    } catch (error) {
      console.error('HTTP scraping failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        recordCount: 0,
      };
    }
  }

  private extractFromScriptTags($: cheerio.Root): RawAuctionData[] {
    const results: RawAuctionData[] = [];
    
    $('script').each((_, script) => {
      const content = $(script).html();
      if (content && (content.includes('auction') || content.includes('property'))) {
        // Look for JSON data in script tags
        try {
          // Common patterns for embedded data
          const jsonMatches = content.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/);
          if (jsonMatches) {
            const data = JSON.parse(jsonMatches[1]);
            // Parse the data structure to extract auction results
            const extracted = this.parseJsonData(data);
            results.push(...extracted);
          }
        } catch (e) {
          // Continue if JSON parsing fails
        }
      }
    });
    
    return results;
  }

  private extractFromStructuredElements($: cheerio.Root, url: string): RawAuctionData[] {
    const results: RawAuctionData[] = [];
    
    // Look for common Domain patterns
    const selectors = [
      '[data-testid*="property"]',
      '[data-testid*="listing"]',
      '[data-testid*="result"]',
      '.property-card',
      '.listing-card',
      '.auction-result',
      'article[data-testid]',
      '[class*="PropertyCard"]',
      '[class*="ListingCard"]'
    ];

    for (const selector of selectors) {
      $(selector).each((_, element) => {
        const auction = this.extractAuctionFromElement($, $(element), url);
        if (auction) {
          results.push(auction);
        }
      });
    }

    return results;
  }

  private extractFromContentPatterns($: cheerio.Root, url: string): RawAuctionData[] {
    const results: RawAuctionData[] = [];
    
    // Look for text patterns that indicate auction results
    $('*').each((_, element) => {
      const $element = $(element);
      const text = $element.text();
      
      // Skip if element is too large (likely container) or too small
      if (text.length < 50 || text.length > 1000) return;
      
      // Check if text looks like an auction result
      if (this.looksLikeAuctionResult(text)) {
        const auction = this.extractAuctionFromText(text, url);
        if (auction) {
          results.push(auction);
        }
      }
    });

    return results;
  }

  private parseJsonData(data: any): RawAuctionData[] {
    const results: RawAuctionData[] = [];
    
    // Recursive function to find auction data in nested JSON
    const findAuctionData = (obj: any, path: string = '') => {
      if (typeof obj !== 'object' || obj === null) return;
      
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'object' && this.looksLikeAuctionData(item)) {
              const auction = this.convertToAuctionData(item);
              if (auction) results.push(auction);
            } else {
              findAuctionData(item, `${currentPath}[${index}]`);
            }
          });
        } else if (typeof value === 'object') {
          if (this.looksLikeAuctionData(value)) {
            const auction = this.convertToAuctionData(value);
            if (auction) results.push(auction);
          } else {
            findAuctionData(value, currentPath);
          }
        }
      }
    };
    
    findAuctionData(data);
    return results;
  }

  private looksLikeAuctionData(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null) return false;
    
    const keys = Object.keys(obj);
    const auctionIndicators = ['address', 'price', 'result', 'suburb', 'sold', 'property'];
    
    return auctionIndicators.some(indicator => 
      keys.some(key => key.toLowerCase().includes(indicator))
    );
  }

  private convertToAuctionData(obj: any): RawAuctionData | null {
    try {
      // Extract data from JSON object structure
      const address = this.findValueByKeyPattern(obj, ['address', 'street', 'displayAddress']);
      const suburb = this.findValueByKeyPattern(obj, ['suburb', 'location', 'area']);
      const state = this.findValueByKeyPattern(obj, ['state', 'region']);
      const postcode = this.findValueByKeyPattern(obj, ['postcode', 'zip']);
      const price = this.findValueByKeyPattern(obj, ['price', 'soldPrice', 'amount']);
      const result = this.findValueByKeyPattern(obj, ['result', 'status', 'outcome']);
      
      if (!address) return null;
      
      return {
        address: String(address),
        suburb: String(suburb || 'Unknown'),
        state: String(state || 'NSW'),
        postcode: String(postcode || ''),
        price: typeof price === 'number' ? price : parseInt(String(price).replace(/[^0-9]/g, '')) || undefined,
        result: this.mapResult(String(result || 'unknown')),
        auctionDate: new Date(),
        source: 'domain',
        propertyType: this.findValueByKeyPattern(obj, ['propertyType', 'type']) || 'House',
        bedrooms: this.findValueByKeyPattern(obj, ['bedrooms', 'beds']) || undefined,
        bathrooms: this.findValueByKeyPattern(obj, ['bathrooms', 'baths']) || undefined,
        carSpaces: this.findValueByKeyPattern(obj, ['carSpaces', 'parking', 'garage']) || undefined,
        agentName: this.findValueByKeyPattern(obj, ['agent', 'agentName']) || undefined,
        agencyName: this.findValueByKeyPattern(obj, ['agency', 'agencyName']) || undefined,
      };
    } catch (error) {
      console.error('Error converting JSON to auction data:', error);
      return null;
    }
  }

  private findValueByKeyPattern(obj: any, patterns: string[]): any {
    for (const pattern of patterns) {
      for (const [key, value] of Object.entries(obj)) {
        if (key.toLowerCase().includes(pattern.toLowerCase())) {
          return value;
        }
      }
    }
    return null;
  }

  private extractAuctionFromElement($: cheerio.Root, $element: cheerio.Cheerio<cheerio.Element>, url: string): RawAuctionData | null {
    const text = $element.text();
    return this.extractAuctionFromText(text, url);
  }

  private extractAuctionFromText(text: string, url: string): RawAuctionData | null {
    const address = this.extractAddress(text);
    if (!address) return null;

    const locationInfo = this.extractLocationFromUrl(url);
    
    return {
      address,
      suburb: locationInfo.suburb || this.extractSuburb(text) || 'Unknown',
      state: locationInfo.state || this.extractState(text) || 'NSW',
      postcode: this.extractPostcode(text) || locationInfo.postcode || '',
      price: this.extractPriceNumber(text),
      result: this.mapResult(this.extractResult(text)),
      auctionDate: new Date(),
      source: 'domain',
      propertyType: this.extractPropertyType(text) || 'House',
      bedrooms: this.extractBedrooms(text),
      bathrooms: this.extractBathrooms(text),
      carSpaces: this.extractCarSpaces(text),
      agentName: this.extractAgentName(text),
      agencyName: this.extractAgencyName(text),
    };
  }

  private looksLikeAuctionResult(text: string): boolean {
    const indicators = [
      /\$[\d,]+/,  // Contains price
      /\b\d{4}\b/,  // Contains postcode
      /\b(sold|passed|withdrawn)\b/i,  // Contains result
      /\d+\s*(bed|bath|car)/i,  // Contains property features
    ];
    
    return indicators.filter(pattern => pattern.test(text)).length >= 2;
  }

  private extractLocationFromUrl(url: string): { suburb?: string; state?: string; postcode?: string } {
    const urlParts = url.split('/');
    
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

  private removeDuplicates(results: RawAuctionData[]): RawAuctionData[] {
    const seen = new Set<string>();
    return results.filter(auction => {
      const key = `${auction.address}-${auction.suburb}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Reuse extraction methods from enhanced scraper
  private extractAddress(text: string): string | null {
    const lines = text.split(/\n|,/).map(line => line.trim());
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

  private extractSuburb(text: string): string | undefined {
    const lines = text.split(/\n|,/).map(line => line.trim());
    for (const line of lines) {
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

  private extractPriceNumber(text: string): number | undefined {
    const priceMatch = text.match(/\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
    if (priceMatch) {
      return parseInt(priceMatch[1].replace(/,/g, ''));
    }
    return undefined;
  }

  private extractResult(text: string): string {
    const resultMatch = text.match(/\b(sold|passed|withdrawn|cancelled)\b/i);
    return resultMatch ? resultMatch[1].toLowerCase() : '';
  }

  private mapResult(result: string): 'sold' | 'passed_in' | 'withdrawn' {
    const lower = result.toLowerCase();
    if (lower.includes('sold')) return 'sold';
    if (lower.includes('withdrawn') || lower.includes('cancelled')) return 'withdrawn';
    return 'passed_in';
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
    const lines = text.split(/\n/).map(line => line.trim());
    for (const line of lines) {
      if (this.looksLikePersonName(line)) {
        return line;
      }
    }
    return undefined;
  }

  private extractAgencyName(text: string): string | undefined {
    const lines = text.split(/\n/).map(line => line.trim());
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
}