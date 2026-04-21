"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonthRow } from "@/lib/domain/progress";

type MixChartProps = {
  rows: MonthRow[];
};

export function MixChart({ rows }: MixChartProps) {
  const data = rows.map((row) => ({
    label: row.label,
    Restricted: row.restrictedHours,
    Unrestricted: row.unrestrictedHours,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
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
          <Bar dataKey="Restricted" stackId="mix" fill="#d79b5d" radius={[8, 8, 0, 0]} />
          <Bar dataKey="Unrestricted" stackId="mix" fill="#307a6b" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
