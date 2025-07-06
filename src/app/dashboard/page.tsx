'use client';

import { useState } from 'react';
import { SuburbsTable } from '@/components/dashboard/suburbs-table';
import { Filters } from '@/components/dashboard/filters';
import { StatsCard } from '@/components/shared/stats-card';
import { useSuburbs } from '@/hooks/use-suburbs';
import { Home, TrendingUp, MapPin, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const [filters, setFilters] = useState({
    state: '',
    date: '',
    search: '',
    sortBy: 'clearanceRate',
    sortOrder: 'desc' as 'asc' | 'desc',
    page: 1,
    limit: 20,
  });

  const { data, loading, error } = useSuburbs(filters);

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
    totalAuctions: data.data.reduce((sum, s) => sum + s.totalAuctions, 0),
    totalSold: data.data.reduce((sum, s) => sum + s.soldCount, 0),
    avgClearanceRate: data.data.length > 0
      ? data.data.reduce((sum, s) => sum + s.clearanceRate, 0) / data.data.length
      : 0,
    avgMedianPrice: data.data.length > 0
      ? data.data
          .filter(s => s.medianPrice)
          .reduce((sum, s) => sum + (s.medianPrice || 0), 0) / 
          data.data.filter(s => s.medianPrice).length
      : 0,
  } : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">数据仪表板</h1>
        <p className="text-muted-foreground">
          查看各城区的拍卖清空率和市场表现
        </p>
      </div>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="总拍卖数"
            value={summaryStats.totalAuctions.toLocaleString()}
            icon={<Home className="h-5 w-5" />}
          />
          <StatsCard
            title="总售出数"
            value={summaryStats.totalSold.toLocaleString()}
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatsCard
            title="平均清空率"
            value={`${summaryStats.avgClearanceRate.toFixed(1)}%`}
            icon={<MapPin className="h-5 w-5" />}
          />
          <StatsCard
            title="平均中位价"
            value={new Intl.NumberFormat('en-AU', {
              style: 'currency',
              currency: 'AUD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(summaryStats.avgMedianPrice)}
            icon={<DollarSign className="h-5 w-5" />}
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6">
        <Filters
          onStateChange={(state) => setFilters({ ...filters, state, page: 1 })}
          onDateChange={(date) => setFilters({ ...filters, date, page: 1 })}
          onSearchChange={(search) => setFilters({ ...filters, search, page: 1 })}
          selectedState={filters.state}
          selectedDate={filters.date}
        />
      </div>

      {/* Table */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-destructive">加载数据时出错: {error}</p>
        </div>
      )}

      {data && !loading && !error && (
        <div>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              找到 {data.pagination.total} 条记录，第 {data.pagination.page} 页 / 共 {data.pagination.totalPages} 页
            </p>
          </div>
          
          <SuburbsTable
            suburbs={data.data || []}
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
          <p className="text-muted-foreground">暂无数据</p>
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