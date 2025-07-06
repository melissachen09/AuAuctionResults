import { HeroSection } from '@/components/home/hero-section';
import { StatsCard } from '@/components/shared/stats-card';
import { Home, TrendingUp, MapPin } from 'lucide-react';

export default async function HomePage() {
  // In production, these would be fetched from the API
  const stats = {
    totalAuctions: 1234,
    clearanceRate: 68.5,
    topSuburb: 'Mosman',
    weeklyChange: 2.3,
  };

  return (
    <>
      <HeroSection />
      
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">本周概况</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <StatsCard
              title="总拍卖数"
              value={stats.totalAuctions.toLocaleString()}
              icon={<Home className="h-5 w-5 text-muted-foreground" />}
              trend={{
                value: 5.2,
                label: '比上周',
              }}
            />
            
            <StatsCard
              title="整体清空率"
              value={`${stats.clearanceRate}%`}
              icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
              trend={{
                value: stats.weeklyChange,
                label: '比上周',
              }}
            />
            
            <StatsCard
              title="最高清空率城区"
              value={stats.topSuburb}
              icon={<MapPin className="h-5 w-5 text-muted-foreground" />}
            />
          </div>
        </div>
      </section>
    </>
  );
}