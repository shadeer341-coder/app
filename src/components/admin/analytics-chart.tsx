
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChartTooltipContent, ChartContainer, ChartConfig } from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AnalyticsChartProps = {
  data: {
    name: string;
    count: number;
    fill: string;
  }[];
};

const chartConfig = {
  count: {
    label: "Users",
  },
} satisfies ChartConfig;


export function AnalyticsChart({ data }: AnalyticsChartProps) {
  return (
    <Card>
        <CardHeader>
          <CardTitle>User Distribution</CardTitle>
          <CardDescription>
            A visual breakdown of all user types in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="h-96 w-full">
                <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="name"
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
                            />
                            <Tooltip
                                cursor={{
                                    fill: "hsl(var(--muted))",
                                    radius: 4,
                                }}
                                content={<ChartTooltipContent />}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {data.map((entry) => (
                                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
        </CardContent>
    </Card>
  );
}
