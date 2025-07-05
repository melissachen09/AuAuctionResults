'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface DistributionChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--destructive))',
  'hsl(var(--muted))',
];

export function DistributionChart({ data }: DistributionChartProps) {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-sm">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            数量: {payload[0].value}
          </p>
          <p className="text-sm text-muted-foreground">
            占比: {payload[0].payload.percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  const dataWithPercentage = data.map((item) => {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    return {
      ...item,
      percentage: ((item.value / total) * 100).toFixed(1),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={dataWithPercentage}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ percentage }) => `${percentage}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {dataWithPercentage.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          wrapperStyle={{ fontSize: '14px' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}