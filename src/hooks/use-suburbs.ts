'use client';

import { useState, useEffect } from 'react';
import { SuburbStats, PaginatedResponse } from '@/types/api';

interface UseSuburbsOptions {
  state?: string;
  date?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export function useSuburbs(options: UseSuburbsOptions = {}) {
  const [data, setData] = useState<PaginatedResponse<SuburbStats> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuburbs = async () => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.state) params.append('state', options.state);
      if (options.date) params.append('date', options.date);
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());

      try {
        const response = await fetch(`/api/suburbs?${params}`);
        if (!response.ok) throw new Error('Failed to fetch suburbs');
        const data = await response.json();
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSuburbs();
  }, [
    options.state,
    options.date,
    options.sortBy,
    options.sortOrder,
    options.page,
    options.limit,
  ]);

  return { data, loading, error };
}