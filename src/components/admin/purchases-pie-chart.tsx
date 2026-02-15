
"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartTooltipContent, ChartContainer } from "@/components/ui/chart"

type PieChartData = {
    name: string;
    value: number;
    fill: string;
}[];

type PurchasesPieChartProps = {
  data: PieChartData;
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export function PurchasesPieChart({ data }: PurchasesPieChartProps) {
  const hasData = data.some(item => item.value > 0);

  return (
      <ChartContainer config={{}} className="w-full h-full min-h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
              {hasData ? (
                  <PieChart>
                      <Tooltip
                          cursor={false}
                          content={<ChartTooltipContent
                              formatter={(value) => formatCurrency(Number(value))}
                              hideLabel
                          />}
                      />
                      <Pie
                          data={data}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          strokeWidth={2}
                      >
                          {data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                      </Pie>
                      <Legend />
                  </PieChart>
              ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                      No purchase data for this period.
                  </div>
              )}
          </ResponsiveContainer>
      </ChartContainer>
  );
}
