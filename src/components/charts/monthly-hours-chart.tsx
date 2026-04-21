"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonthRow } from "@/lib/domain/progress";

type MonthlyHoursChartProps = {
  rows: MonthRow[];
};

export function MonthlyHoursChart({ rows }: MonthlyHoursChartProps) {
  const data = rows.map((row) => ({
    label: row.label,
    Actual: row.rawTotal,
    Expected: row.expectedRawHours,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8ddd0" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#587366", fontSize: 12 }} />
          <YAxis tick={{ fill: "#587366", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: 16,
              border: "1px solid #d7c9ba",
              backgroundColor: "#fffdf8",
            }}
          />
          <Legend />
          <Bar dataKey="Actual" fill="#145c4e" radius={[8, 8, 0, 0]} />
          <Line
            type="monotone"
            dataKey="Expected"
            stroke="#c45d3b"
            strokeWidth={3}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
