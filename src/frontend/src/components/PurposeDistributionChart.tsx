import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  data: Array<[string, bigint]>;
}

const COLORS = [
  "#059669",
  "#0d9488",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#65a30d",
];

export default function PurposeDistributionChart({ data }: Props) {
  const chartData = data
    .map(([purpose, count]) => ({
      purpose,
      count: Number(count),
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div
      data-ocid="company_dash.purpose_chart.section"
      className="bg-white border border-border rounded-2xl p-5"
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
          <span className="text-emerald-600 text-sm font-bold">#</span>
        </div>
        <h3 className="text-sm font-semibold text-foreground">
          Ziyaret Amacı Dağılımı
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={chartData.length * 44 + 16}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="purpose"
            width={110}
            tick={{ fontSize: 12, fill: "#475569" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            contentStyle={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              fontSize: "12px",
              color: "#1e293b",
            }}
            formatter={(value: number) => [value, "Ziyaret"]}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {chartData.map((entry, index) => (
              <Cell key={entry.purpose} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
