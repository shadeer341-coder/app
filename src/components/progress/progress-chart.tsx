
"use client"

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartTooltipContent, ChartContainer, ChartConfig } from "@/components/ui/chart"

type ProgressChartProps = {
  data: {
    date: string;
    score: number;
  }[];
};

const chartConfig = {
  score: {
    label: "Score",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function ProgressChart({ data }: ProgressChartProps) {
  return (
    <div className="h-80 w-full -ml-6">
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                    dataKey="date" 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 6)}
                />
                <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    domain={[0, 'dataMax + 10']}
                />
                <Tooltip 
                    cursor={{
                        stroke: "hsl(var(--muted))",
                        strokeWidth: 2,
                        strokeDasharray: "3 3",
                    }}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{
                        fill: "hsl(var(--primary))",
                        r: 5,
                    }}
                    activeDot={{
                        r: 7,
                    }}
                />
                </LineChart>
            </ResponsiveContainer>
       </ChartContainer>
    </div>
  );
}
