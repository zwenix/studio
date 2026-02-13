'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Assignment } from '@/lib/types';
import { useMemo } from 'react';
import { format } from 'date-fns';

interface StudentPerformanceChartProps {
  assignments: Assignment[];
}

const chartConfig = {
  score: {
    label: 'Score',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig

export function StudentPerformanceChart({ assignments }: StudentPerformanceChartProps) {
  const chartData = useMemo(() => {
    return assignments
      .filter(a => a.status === 'graded' && a.gradeReceived && a.submittedAt)
      .map(a => {
        // Attempt to parse grade as a number, extract first number found
        const gradeMatch = a.gradeReceived!.match(/\d+/);
        const score = gradeMatch ? parseInt(gradeMatch[0], 10) : 0;
        return {
          name: a.contentTopic || 'Assignment',
          date: format(a.submittedAt!.toDate(), 'MMM d'),
          score: score,
        };
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [assignments]);
  
  if (chartData.length === 0) {
    return <div className="text-center text-muted-foreground py-8">No graded assignments with scores to display in a chart.</div>
  }

  return (
     <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
      <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis 
            domain={[0, 100]}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="score" fill="var(--color-score)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
