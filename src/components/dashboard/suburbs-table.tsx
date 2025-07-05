'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { SuburbStats } from '@/types/api';
import { cn } from '@/lib/utils';

interface SuburbsTableProps {
  suburbs: SuburbStats[];
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onSort: (field: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function SuburbsTable({
  suburbs,
  totalPages,
  currentPage,
  onPageChange,
  onSort,
  sortBy,
  sortOrder,
}: SuburbsTableProps) {
  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 font-medium hover:text-primary"
    >
      {children}
      <ArrowUpDown
        className={cn(
          'h-4 w-4',
          sortBy === field ? 'opacity-100' : 'opacity-30'
        )}
      />
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left p-4">
                  <SortHeader field="suburb">城区</SortHeader>
                </th>
                <th className="text-left p-4">
                  <SortHeader field="state">州</SortHeader>
                </th>
                <th className="text-center p-4">
                  <SortHeader field="totalAuctions">拍卖总数</SortHeader>
                </th>
                <th className="text-center p-4">
                  <SortHeader field="soldCount">售出数</SortHeader>
                </th>
                <th className="text-center p-4">
                  <SortHeader field="clearanceRate">清空率</SortHeader>
                </th>
                <th className="text-right p-4">
                  <SortHeader field="medianPrice">中位价</SortHeader>
                </th>
              </tr>
            </thead>
            <tbody>
              {suburbs.map((suburb) => (
                <tr key={suburb.id} className="border-b hover:bg-muted/30">
                  <td className="p-4">
                    <Link
                      href={`/dashboard/${encodeURIComponent(suburb.suburb)}?state=${suburb.state}`}
                      className="font-medium hover:text-primary"
                    >
                      {suburb.suburb}
                    </Link>
                  </td>
                  <td className="p-4">{suburb.state}</td>
                  <td className="text-center p-4">{suburb.totalAuctions}</td>
                  <td className="text-center p-4">{suburb.soldCount}</td>
                  <td className="text-center p-4">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        suburb.clearanceRate >= 70
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : suburb.clearanceRate >= 50
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      )}
                    >
                      {suburb.clearanceRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-right p-4">{formatPrice(suburb.medianPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          第 {currentPage} 页，共 {totalPages} 页
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="rounded-lg border p-2 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="rounded-lg border p-2 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}