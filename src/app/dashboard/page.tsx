'use client';

import { useState } from 'react';
import { PropertiesTable } from '@/components/dashboard/properties-table';
import { PropertyFilters } from '@/components/dashboard/property-filters';
import { StatsCard } from '@/components/shared/stats-card';
import { useProperties } from '@/hooks/use-properties';
import { Home, TrendingUp, MapPin, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const [filters, setFilters] = useState({
    search: '',
    suburb: '',
    state: '',
    result: '',
    propertyType: '',
    dateFrom: '',
    dateTo: '',
    priceMin: '',
    priceMax: '',
    sortBy: 'auctionDate',
    sortOrder: 'desc' as 'asc' | 'desc',
    page: 1,
    limit: 20,
  });

  const { data, loading, error } = useProperties(filters);

  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  // Calculate summary statistics
  const summaryStats = data?.data ? {
    totalProperties: data.data.length,
    totalSold: data.data.filter(p => p.result === 'sold').length,
    clearanceRate: data.data.length > 0 
      ? (data.data.filter(p => p.result === 'sold').length / data.data.length) * 100
      : 0,
    avgPrice: data.data.filter(p => p.result === 'sold' && p.price).length > 0
      ? data.data
          .filter(p => p.result === 'sold' && p.price)
          .reduce((sum, p) => sum + (p.price || 0), 0) / 
          data.data.filter(p => p.result === 'sold' && p.price).length
      : 0,
  } : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Property Dashboard</h1>
        <p className="text-muted-foreground">
          Search and view individual auction properties
        </p>
      </div>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Properties"
            value={summaryStats.totalProperties.toLocaleString()}
            icon={<Home className="h-5 w-5" />}
          />
          <StatsCard
            title="Sold Properties"
            value={summaryStats.totalSold.toLocaleString()}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatsCard
            title="Clearance Rate"
            value={`${summaryStats.clearanceRate.toFixed(1)}%`}
            icon={<MapPin className="h-5 w-5" />}
          />
          <StatsCard
            title="Average Price"
            value={new Intl.NumberFormat('en-AU', {
              style: 'currency',
              currency: 'AUD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(summaryStats.avgPrice)}
            icon={<DollarSign className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <PropertyFilters
          filters={filters}
          onFiltersChange={(newFilters) => setFilters({ ...newFilters, page: 1 })}
        />
      </div>

      {/* Table */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-destructive">Error loading data: {error}</p>
        </div>
      )}

      {data && !loading && !error && (
        <div>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              Found {data.pagination.total} properties, page {data.pagination.page} of {data.pagination.totalPages}
            </p>
          </div>
          
          <PropertiesTable
            properties={data.data || []}
            totalPages={data.pagination.totalPages}
            currentPage={data.pagination.page}
            onPageChange={(page) => setFilters({ ...filters, page })}
            onSort={handleSort}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
          />
        </div>
      )}

      {data && !loading && !error && (!data.data || data.data.length === 0) && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No properties found</p>
        </div>
      )}

      {/* Debug information in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">Debug Information</h3>
          <p>Loading: {loading ? 'true' : 'false'}</p>
          <p>Error: {error || 'none'}</p>
          <p>Data: {data ? `${data.data?.length || 0} items` : 'null'}</p>
          <p>Current filters: {JSON.stringify(filters)}</p>
        </div>
      )}
    </div>
  );
}