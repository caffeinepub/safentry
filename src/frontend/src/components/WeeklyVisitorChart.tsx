import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

interface Props {
  visitors: Array<{ entryTime: bigint }>;
}

const DAY_NAMES = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export default function WeeklyVisitorChart({ visitors }: Props) {
  const now = new Date();

  const data = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const dateStr = d.toDateString();
    const count = visitors.filter((v) => {
      const vd = new Date(Number(v.entryTime / 1000000n));
      return vd.toDateString() === dateStr;
    }).length;
    return { day: DAY_NAMES[d.getDay()], count };
  });

  const chartConfig = {
    count: {
      label: "Ziyaretçi",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div
      data-ocid="weekly_chart.section"
      className="bg-white border border-border rounded-2xl p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">
        Son 7 Günlük Ziyaretçi
      </h3>
      <ChartContainer config={chartConfig} className="h-40 w-full">
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
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
