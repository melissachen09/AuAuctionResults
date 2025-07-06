export interface RawAuctionData {
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  price?: number;
  result: 'sold' | 'passed_in' | 'withdrawn';
  auctionDate: Date;
  source: 'domain' | 'rea';
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  agentName?: string;
  agencyName?: string;
  propertyUrl?: string;
}

export interface ScraperConfig {
  maxConcurrency: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
}

export interface ScraperResult {
  success: boolean;
  data?: RawAuctionData[];
  error?: string;
  recordCount: number;
}