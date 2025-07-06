'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Home, DollarSign, Calendar, Building } from 'lucide-react';
import { SuburbDetailResponse } from '@/types/api';
import { StatsCard } from '@/components/shared/stats-card';
import { TrendChart } from '@/components/charts/trend-chart';
import { DistributionChart } from '@/components/charts/distribution-chart';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export default function SuburbDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const suburb = decodeURIComponent(params.suburb as string);
  const state = searchParams.get('state') || '';

  const [data, setData] = useState<SuburbDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSuburbDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `/api/suburbs/${encodeURIComponent(suburb)}${state ? `?state=${state}` : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch suburb details');
        const data = await response.json();
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSuburbDetail();
  }, [suburb, state]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
          <p className="text-destructive">加载数据时出错: {error}</p>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number | null) => {
    if (!price) return '-';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          返回仪表板
        </Link>
        <h1 className="text-3xl font-bold mb-2">
          {suburb}, {data.currentStats.state}
        </h1>
        <p className="text-muted-foreground">
          最后更新: {format(new Date(data.currentStats.date), 'yyyy年MM月dd日', { locale: zhCN })}
        </p>
      </div>

      {/* Current Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="拍卖总数"
          value={data.currentStats.totalAuctions}
          icon={<Home className="h-5 w-5" />}
        />
        <StatsCard
          title="清空率"
          value={`${data.currentStats.clearanceRate.toFixed(1)}%`}
          icon={<Building className="h-5 w-5" />}
        />
        <StatsCard
          title="中位价"
          value={formatPrice(data.currentStats.medianPrice)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatsCard
          title="售出数"
          value={`${data.currentStats.soldCount}/${data.currentStats.totalAuctions}`}
          icon={<Calendar className="h-5 w-5" />}
        />
      </div>

      {/* Historical Trends */}
      {data.historicalStats.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">历史趋势</h2>
          <div className="rounded-lg border p-6">
            <TrendChart
              data={data.historicalStats.map((stat) => ({
                date: stat.date,
                totalAuctions: stat.totalAuctions,
                soldCount: stat.soldCount,
                clearanceRate: stat.clearanceRate,
                averagePrice: stat.averagePrice,
              }))}
            />
          </div>
        </div>
      )}

      {/* Result Distribution */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">结果分布</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-medium mb-4">拍卖结果分布</h3>
            <DistributionChart
              data={[
                { name: '已售', value: data.currentStats.soldCount },
                { name: '流拍', value: data.currentStats.passedInCount },
                { name: '撤回', value: data.currentStats.withdrawnCount },
              ]}
            />
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="text-lg font-medium mb-4">关键指标</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-muted-foreground">清空率</span>
                <span className="font-medium">{data.currentStats.clearanceRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-muted-foreground">平均价格</span>
                <span className="font-medium">{formatPrice(data.currentStats.averagePrice)}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-muted-foreground">中位价</span>
                <span className="font-medium">{formatPrice(data.currentStats.medianPrice)}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-muted-foreground">成交率</span>
                <span className="font-medium">
                  {data.currentStats.totalAuctions > 0
                    ? ((data.currentStats.soldCount / data.currentStats.totalAuctions) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Auctions */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">最近拍卖结果</h2>
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="text-left p-4">地址</th>
                  <th className="text-center p-4">类型</th>
                  <th className="text-center p-4">结果</th>
                  <th className="text-right p-4">价格</th>
                  <th className="text-center p-4">代理</th>
                </tr>
              </thead>
              <tbody>
                {data.recentAuctions.map((auction) => (
                  <tr key={auction.id} className="border-b hover:bg-muted/30">
                    <td className="p-4 font-medium">{auction.address}</td>
                    <td className="text-center p-4">{auction.propertyType}</td>
                    <td className="text-center p-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          auction.result === 'sold'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : auction.result === 'passed_in'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {auction.result === 'sold' ? '已售' : auction.result === 'passed_in' ? '流拍' : '撤回'}
                      </span>
                    </td>
                    <td className="text-right p-4">{formatPrice(auction.price)}</td>
                    <td className="text-center p-4 text-sm text-muted-foreground">
                      {auction.agentName || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}