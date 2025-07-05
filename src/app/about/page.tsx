export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">关于 AU Auction Results</h1>
        
        <div className="prose prose-lg dark:prose-invert">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">项目介绍</h2>
            <p className="text-muted-foreground mb-4">
              AU Auction Results 是一个专注于澳大利亚房产拍卖数据的分析平台。
              我们通过自动化技术，每周从 Domain.com.au 和 realestate.com.au 
              收集最新的拍卖结果，为您提供准确、及时的市场洞察。
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">数据来源</h2>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <strong>Domain.com.au</strong> - 澳大利亚领先的房产平台之一
              </li>
              <li>
                <strong>REA (realestate.com.au)</strong> - 澳大利亚最大的房产网站
              </li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              数据每周末自动更新，确保信息的时效性和准确性。
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">主要功能</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeatureItem
                title="实时数据追踪"
                description="每周自动收集和更新拍卖结果数据"
              />
              <FeatureItem
                title="智能去重"
                description="自动识别和合并重复的房产信息"
              />
              <FeatureItem
                title="区域分析"
                description="按suburb细分的清空率统计"
              />
              <FeatureItem
                title="趋势图表"
                description="可视化展示历史数据和市场趋势"
              />
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">技术栈</h2>
            <p className="text-muted-foreground mb-4">
              本项目采用现代化的技术栈构建：
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                'Next.js 14',
                'TypeScript',
                'Tailwind CSS',
                'Prisma',
                'PostgreSQL',
                'Playwright',
                'Vercel',
              ].map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1 bg-muted rounded-md text-sm"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}