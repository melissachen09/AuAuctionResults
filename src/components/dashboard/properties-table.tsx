'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Auction } from '@/types/api';
import { format } from 'date-fns';

interface PropertiesTableProps {
  properties: Auction[];
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onSort: (field: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function PropertiesTable({
  properties,
  totalPages,
  currentPage,
  onPageChange,
  onSort,
  sortBy,
  sortOrder,
}: PropertiesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  const getResultBadge = (result: string) => {
    const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
    
    switch (result) {
      case 'sold':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'passed_in':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      case 'withdrawn':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
    }
  };

  const getResultText = (result: string) => {
    switch (result) {
      case 'sold': return 'Sold';
      case 'passed_in': return 'Passed In';
      case 'withdrawn': return 'Withdrawn';
      default: return result;
    }
  };

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-blue-600 font-medium"
    >
      {children}
      {sortBy === field && (
        sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
      )}
    </button>
  );

  const Pagination = () => {
    const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
      const start = Math.max(1, currentPage - 2);
      return start + i;
    }).filter(page => page <= totalPages);

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {pages.map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 text-sm border rounded-md hover:bg-gray-50 ${
                page === currentPage ? 'bg-blue-500 text-white border-blue-500' : ''
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="text-left p-4">
                <SortButton field="address">Address</SortButton>
              </th>
              <th className="text-center p-4">
                <SortButton field="suburb">Suburb</SortButton>
              </th>
              <th className="text-center p-4">
                <SortButton field="propertyType">Type</SortButton>
              </th>
              <th className="text-center p-4">
                <SortButton field="result">Result</SortButton>
              </th>
              <th className="text-right p-4">
                <SortButton field="price">Price</SortButton>
              </th>
              <th className="text-center p-4">
                <SortButton field="auctionDate">Date</SortButton>
              </th>
              <th className="text-center p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <>
                <tr key={property.id} className="border-b hover:bg-muted/30">
                  <td className="p-4">
                    <div className="font-medium">{property.address}</div>
                    <div className="text-sm text-muted-foreground">
                      {property.postcode}
                    </div>
                  </td>
                  <td className="text-center p-4">
                    <div>{property.suburb}</div>
                    <div className="text-sm text-muted-foreground">{property.state}</div>
                  </td>
                  <td className="text-center p-4">
                    <div>{property.propertyType}</div>
                    {(property.bedrooms || property.bathrooms || property.carSpaces) && (
                      <div className="text-xs text-muted-foreground">
                        {property.bedrooms && `${property.bedrooms}bd`}
                        {property.bathrooms && ` ${property.bathrooms}ba`}
                        {property.carSpaces && ` ${property.carSpaces}car`}
                      </div>
                    )}
                  </td>
                  <td className="text-center p-4">
                    <span className={getResultBadge(property.result)}>
                      {getResultText(property.result)}
                    </span>
                  </td>
                  <td className="text-right p-4 font-medium">
                    {formatPrice(property.price)}
                  </td>
                  <td className="text-center p-4">
                    {formatDate(property.auctionDate)}
                  </td>
                  <td className="text-center p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => toggleRowExpansion(property.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Toggle details"
                      >
                        {expandedRows.has(property.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      {property.propertyUrl && (
                        <a
                          href={property.propertyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-gray-100 rounded"
                          title="View original listing"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedRows.has(property.id) && (
                  <tr className="bg-gray-50">
                    <td colSpan={7} className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-gray-600">Source</div>
                          <div className="capitalize">{property.source}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-600">Agent</div>
                          <div>{property.agentName || '-'}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-600">Agency</div>
                          <div>{property.agencyName || '-'}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-600">Created</div>
                          <div>{formatDate(property.createdAt)}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && <Pagination />}
    </div>
  );
}