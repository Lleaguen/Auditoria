'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import type { DailyStats } from '@/lib/types';

interface DailyChartProps {
  data: DailyStats[];
}

export function DailyDeviationChart({ data }: DailyChartProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-700 mb-3">
        HUs auditados vs HUs con desvío por día
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="totalHusAudited" name="HUs auditados" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          <Bar dataKey="husWithDeviation" name="HUs con desvío" fill="#ef4444" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DeviationPercentChart({ data }: DailyChartProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-700 mb-3">
        % HUs con desvío por día
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis unit="%" tick={{ fontSize: 11 }} domain={[0, 100]} />
          <Tooltip formatter={(v: number) => `${v}%`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="percentHusWithDeviation"
            name="% con desvío"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ShipmentErrorChart({ data }: DailyChartProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-700 mb-3">
        Shipments faltantes, cruzados y sin manifestar por día
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="totalMissing"      name="Faltantes"       fill="#ef4444" radius={[3, 3, 0, 0]} />
          <Bar dataKey="totalCrossed"      name="Cruzados"        fill="#eab308" radius={[3, 3, 0, 0]} />
          <Bar dataKey="totalUnmanifested" name="Sin manifestar"  fill="#f97316" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ErrorRateChart({ data }: DailyChartProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-700 mb-3">
        % envíos con errores por día
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis unit="%" tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => `${v}%`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="percentWithErrors"
            name="% con errores"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
