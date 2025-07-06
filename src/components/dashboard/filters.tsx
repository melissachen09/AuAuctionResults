'use client';

import { Search, Calendar, MapPin } from 'lucide-react';

interface FiltersProps {
  onStateChange: (state: string) => void;
  onDateChange: (date: string) => void;
  onSearchChange: (search: string) => void;
  selectedState?: string;
  selectedDate?: string;
}

const states = [
  { value: '', label: '所有州' },
  { value: 'NSW', label: '新南威尔士州' },
  { value: 'VIC', label: '维多利亚州' },
  { value: 'QLD', label: '昆士兰州' },
  { value: 'WA', label: '西澳大利亚州' },
  { value: 'SA', label: '南澳大利亚州' },
  { value: 'TAS', label: '塔斯马尼亚州' },
  { value: 'ACT', label: '首都领地' },
  { value: 'NT', label: '北领地' },
];

export function Filters({
  onStateChange,
  onDateChange,
  onSearchChange,
  selectedState = '',
  selectedDate = '',
}: FiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索城区..."
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-3 py-2 rounded-lg border bg-background"
        />
      </div>

      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          value={selectedState}
          onChange={(e) => onStateChange(e.target.value)}
          className="w-full pl-10 pr-3 py-2 rounded-lg border bg-background appearance-none cursor-pointer"
        >
          {states.map((state) => (
            <option key={state.value} value={state.value}>
              {state.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full pl-10 pr-3 py-2 rounded-lg border bg-background"
        />
      </div>
    </div>
  );
}