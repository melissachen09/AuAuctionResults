export interface SuburbStats {
  id: string;
  suburb: string;
  state: string;
  date: string;
  totalAuctions: number;
  soldCount: number;
  passedInCount: number;
  withdrawnCount: number;
  clearanceRate: number;
  averagePrice: number | null;
  medianPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Auction {
  id: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  price: number | null;
  result: 'sold' | 'passed_in' | 'withdrawn';
  auctionDate: string;
  source: 'domain' | 'rea';
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  carSpaces: number | null;
  agentName: string | null;
  agencyName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SuburbDetailResponse {
  currentStats: SuburbStats;
  recentAuctions: Auction[];
  historicalStats: SuburbStats[];
}

export interface TrendData {
  week: string;
  date: string;
  totalAuctions: number;
  soldCount: number;
  clearanceRate: number;
  averagePrice: number | null;
}

export interface TrendsResponse {
  trends: TrendData[];
  overallStats: {
    totalAuctions: number;
    totalSold: number;
    overallClearanceRate: number;
    averagePrice: number | null;
  };
  period: string;
}