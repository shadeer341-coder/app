
"use client"

import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChartTooltipContent, ChartContainer, ChartConfig } from "@/components/ui/chart"

type AnalyticsChartProps = {
  data: {
    date: string;
    Individual: number;
    Invited: number;
    Starter: number;
    Standard: number;
    Advanced: number;
  }[];
};

const chartConfig = {
  Individual: { label: "Individual", color: "hsl(var(--chart-1))" },
  Invited: { label: "Invited", color: "hsl(var(--chart-2))" },
  Starter: { label: "Starter", color: "hsl(var(--chart-3))" },
  Standard: { label: "Standard", color: "hsl(var(--chart-4))" },
  Advanced: { label: "Advanced", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;


export function AnalyticsChart({ data }: AnalyticsChartProps) {
  return (
    <ChartContainer config={chartConfig} className="w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                />
                <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    tickMargin={8}
                    domain={[0, 'dataMax + 5']}
                />
                <Tooltip
                    cursor={{
                        stroke: "hsl(var(--muted))",
                        strokeWidth: 2,
                        strokeDasharray: "3 3",
                    }}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Legend />
                <Line dataKey="Individual" stroke="var(--color-Individual)" strokeWidth={2} dot={false} />
                <Line dataKey="Invited" stroke="var(--color-Invited)" strokeWidth={2} dot={false} />
                <Line dataKey="Starter" stroke="var(--color-Starter)" strokeWidth={2} dot={false} />
                <Line dataKey="Standard" stroke="var(--color-Standard)" strokeWidth={2} dot={false} />
                <Line dataKey="Advanced" stroke="var(--color-Advanced)" strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    </ChartContainer>
  );
}
