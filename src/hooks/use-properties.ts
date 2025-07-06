import { useState, useEffect } from 'react';
import { Auction, PaginatedResponse } from '@/types/api';

interface PropertyFilters {
  search?: string;
  suburb?: string;
  state?: string;
  result?: string;
  propertyType?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: string;
  priceMax?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export function useProperties(filters: PropertyFilters) {
  const [data, setData] = useState<PaginatedResponse<Auction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        
        Object.entries(filters).forEach(([key, value]) => {
          if (value && value !== '') {
            params.append(key, value.toString());
          }
        });

        const response = await fetch(`/api/suburbs?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [filters]);

  return { data, loading, error };
}