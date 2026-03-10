import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface Props {
  visitors: Array<{ entryTime: bigint }>;
}

export default function HourlyDensityChart({ visitors }: Props) {
  const data = Array.from({ length: 24 }, (_, hour) => {
    const count = visitors.filter((v) => {
      const d = new Date(Number(v.entryTime / 1000000n));
      return d.getHours() === hour;
    }).length;
    return { hour: String(hour).padStart(2, "0"), count };
  });

  const chartConfig = {
    count: {
      label: "Ziyaretçi",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div
      data-ocid="hourly_chart.section"
      className="bg-white border border-border rounded-2xl p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Saatlik Yoğunluk
      </h3>
      <ChartContainer config={chartConfig} className="h-44 w-full">
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="hour"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            interval={2}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="count"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
