'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

interface PropertyFiltersProps {
  filters: {
    search: string;
    suburb: string;
    state: string;
    result: string;
    propertyType: string;
    dateFrom: string;
    dateTo: string;
    priceMin: string;
    priceMax: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    page: number;
    limit: number;
  };
  onFiltersChange: (filters: any) => void;
}

export function PropertyFilters({ filters, onFiltersChange }: PropertyFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
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
      sortOrder: 'desc',
      page: 1,
      limit: 20,
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value && value !== '' && value !== 'auctionDate' && value !== 'desc' && value !== 1 && value !== 20
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <input
          type="text"
          placeholder="Search by address, suburb, agent, or agency..."
          value={filters.search}
          onChange={(e) => handleInputChange('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filters.state}
          onChange={(e) => handleInputChange('state', e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All States</option>
          <option value="NSW">NSW</option>
          <option value="VIC">VIC</option>
          <option value="QLD">QLD</option>
          <option value="SA">SA</option>
          <option value="WA">WA</option>
          <option value="ACT">ACT</option>
          <option value="NT">NT</option>
          <option value="TAS">TAS</option>
        </select>

        <select
          value={filters.result}
          onChange={(e) => handleInputChange('result', e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Results</option>
          <option value="sold">Sold</option>
          <option value="passed_in">Passed In</option>
          <option value="withdrawn">Withdrawn</option>
        </select>

        <select
          value={filters.propertyType}
          onChange={(e) => handleInputChange('propertyType', e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-md text-sm"
        >
          <option value="">All Types</option>
          <option value="house">House</option>
          <option value="apartment">Apartment</option>
          <option value="unit">Unit</option>
          <option value="townhouse">Townhouse</option>
          <option value="villa">Villa</option>
        </select>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <Filter className="h-4 w-4" />
          Advanced
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:text-red-800"
          >
            <X className="h-4 w-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Suburb
            </label>
            <input
              type="text"
              placeholder="Enter suburb"
              value={filters.suburb}
              onChange={(e) => handleInputChange('suburb', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleInputChange('dateFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleInputChange('dateTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Price
            </label>
            <input
              type="number"
              placeholder="Min price"
              value={filters.priceMin}
              onChange={(e) => handleInputChange('priceMin', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Price
            </label>
            <input
              type="number"
              placeholder="Max price"
              value={filters.priceMax}
              onChange={(e) => handleInputChange('priceMax', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}