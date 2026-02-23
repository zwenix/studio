'use client';

import { Bar, BarChart, YAxis, XAxis, Tooltip, CartesianGrid } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface ChartData {
  month: string;
  assignmentsCompleted: number;
  averageScore: number;
}

const chartConfig = {
  assignmentsCompleted: {
    label: 'Assignments Completed',
    color: 'hsl(var(--chart-1))',
  },
  averageScore: {
    label: 'Average Score (%)',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig

export function PerformanceChart({ data }: { data: ChartData[] }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground p-8">No performance data available yet. Graded assignments will appear here.</div>;
  }
  
  return (
     <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ top: 20, right: 20, bottom: 5, left: -10 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--chart-1))" />
        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--chart-2))" domain={[0, 100]} />
        <Tooltip content={<ChartTooltipContent />} />
        <Bar yAxisId="left" dataKey="assignmentsCompleted" fill="var(--color-assignmentsCompleted)" radius={4} />
        <Bar yAxisId="right" dataKey="averageScore" fill="var(--color-averageScore)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
