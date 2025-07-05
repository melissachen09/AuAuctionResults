import Link from 'next/link';
import { ArrowRight, TrendingUp, MapPin, Calendar } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="container mx-auto px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            澳洲房产拍卖
            <span className="block text-primary mt-2">清空率数据平台</span>
          </h1>
          
          <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
            实时追踪Domain和REA的拍卖数据，提供准确的清空率分析，
            助您把握澳洲房产市场动态
          </p>

          <div className="mt-10 flex items-center justify-center gap-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              查看数据
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 rounded-lg border border-input bg-background px-6 py-3 text-sm font-semibold hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              了解更多
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <FeatureCard
            icon={<TrendingUp className="h-6 w-6" />}
            title="实时数据"
            description="每周末自动更新最新拍卖结果"
          />
          <FeatureCard
            icon={<MapPin className="h-6 w-6" />}
            title="按区域分析"
            description="细分到suburb的清空率统计"
          />
          <FeatureCard
            icon={<Calendar className="h-6 w-6" />}
            title="历史趋势"
            description="查看历史数据，分析市场走势"
          />
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-2xl border bg-card p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}