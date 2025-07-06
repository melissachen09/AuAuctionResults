'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TrendChartProps {
  data: Array<{
    date: string;
    totalAuctions: number;
    soldCount: number;
    clearanceRate: number;
    averagePrice: number | null;
  }>;
  type?: 'line' | 'bar';
}

export function TrendChart({ data, type = 'line' }: TrendChartProps) {
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'MM/dd', { locale: zhCN });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <p className="font-medium mb-2">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {
                entry.dataKey === 'clearanceRate' 
                  ? formatPercentage(entry.value)
                  : entry.dataKey === 'averagePrice' && entry.value
                  ? formatCurrency(entry.value)
                  : entry.value
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatDate}
            className="text-xs"
          />
          <YAxis className="text-xs" />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
            iconType="rect"
          />
          <Bar 
            dataKey="totalAuctions" 
            fill="hsl(var(--primary))" 
            name="拍卖总数"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="soldCount" 
            fill="hsl(var(--accent))" 
            name="售出数"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          tickFormatter={formatDate}
          className="text-xs"
        />
        <YAxis 
          yAxisId="left"
          className="text-xs"
        />
        <YAxis 
          yAxisId="right" 
          orientation="right"
          className="text-xs"
          tickFormatter={formatPercentage}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ fontSize: '14px' }}
          iconType="line"
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="totalAuctions"
          stroke="hsl(var(--primary))"
          name="拍卖总数"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="clearanceRate"
          stroke="hsl(var(--destructive))"
          name="清空率"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}