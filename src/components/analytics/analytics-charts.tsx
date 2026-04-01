"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BRAND = "#6366f1";

type Point = { label: string; completed: number };
type BarPoint = { name: string; progress: number };
type PiePoint = { name: string; value: number };
type ThroughputPoint = { name: string; count: number };

/** Todo, In progress, Done — aligned with app status semantics (blue / amber / green) */
const STATUS_PIE_COLORS = ["#2563eb", "#d97706", "#16a34a"];

export function CompletionTrend({ data }: { data: Point[] }) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="fbFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={BRAND} stopOpacity={0.35} />
              <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--popover))",
            }}
          />
          <Area
            type="monotone"
            dataKey="completed"
            stroke={BRAND}
            fill="url(#fbFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProjectProgress({ data }: { data: BarPoint[] }) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--popover))",
            }}
            formatter={(value) => [`${Number(value ?? 0)}%`, "Progress"]}
          />
          <Bar dataKey="progress" fill={BRAND} radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const tooltipBoxStyle = {
  borderRadius: 12,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
} as const;

export function StatusDistribution({ data }: { data: PiePoint[] }) {
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Tooltip
            contentStyle={tooltipBoxStyle}
            formatter={(value, name) => {
              const n = Number(value ?? 0);
              return [
                `${n} task${n === 1 ? "" : "s"}${
                  total > 0 ? ` (${Math.round((n / total) * 100)}%)` : ""
                }`,
                String(name ?? ""),
              ];
            }}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="45%"
            outerRadius={100}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${entry.name}`} fill={STATUS_PIE_COLORS[index % STATUS_PIE_COLORS.length]} />
            ))}
          </Pie>
          <Legend
            verticalAlign="bottom"
            layout="horizontal"
            wrapperStyle={{ paddingTop: 8 }}
            formatter={(value: string) => {
              const row = data.find((d) => d.name === value);
              const v = row?.value ?? 0;
              const pct = total > 0 ? Math.round((v / total) * 100) : 0;
              return `${value}: ${v} (${pct}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MemberThroughput({ data }: { data: ThroughputPoint[] }) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--popover))",
            }}
            formatter={(value) => [String(value), "Transitions"]}
          />
          <Bar dataKey="count" fill="#22c55e" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
