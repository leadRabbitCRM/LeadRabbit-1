"use client";
import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = {
  new: "hsl(217, 91%, 60%)",
  interested: "hsl(142, 76%, 36%)",
  notInterested: "hsl(0, 84%, 60%)",
  deal: "hsl(43, 96%, 56%)",
  assigned: "hsl(262, 83%, 58%)",
  unassigned: "hsl(330, 81%, 60%)",
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-white p-3 shadow-xl">
        <div className="grid gap-2">
          {label && <div className="font-semibold text-sm">{label}</div>}
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-gray-600">{entry.name}</span>
              </div>
              <span className="font-bold text-sm">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function LeadStatusPieChart({ data }) {
  const chartData = [
    { name: "New", value: parseInt(data.newLeads) || 0, fill: COLORS.new },
    { name: "Interested", value: parseInt(data.interestedLeads) || 0, fill: COLORS.interested },
    { name: "Not Interested", value: parseInt(data.notInterestedLeads) || 0, fill: COLORS.notInterested },
    { name: "Deal Closed", value: parseInt(data.dealClosedLeads) || 0, fill: COLORS.deal },
  ];

  const totalValue = chartData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="flex flex-col">
      {/* Card Header */}
      <div className="flex flex-col space-y-1.5 pb-4">
        <h3 className="font-semibold leading-none tracking-tight text-base sm:text-lg">
          Lead Status Distribution
        </h3>
        <p className="text-xs sm:text-sm text-gray-500">
          Overview of lead statuses
        </p>
      </div>

      {/* Chart Container */}
      <div className="flex-1 pb-0">
        <div className="mx-auto aspect-square w-full max-w-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="80%"
                strokeWidth={2}
                stroke="white"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {chartData.map((entry, index) => {
            const percentage = totalValue > 0 ? ((entry.value / totalValue) * 100).toFixed(0) : 0;
            return (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 p-2 hover:bg-gray-100 transition-colors"
              >
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: entry.fill }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{entry.name}</div>
                  <div className="text-xs text-gray-500">
                    {entry.value} ({percentage}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AssignmentBarChart({ data }) {
  const chartData = [
    {
      category: "Assigned",
      value: parseInt(data.assignedLeads) || 0,
      fill: COLORS.assigned,
    },
    {
      category: "Unassigned",
      value: parseInt(data.unassignedLeads) || 0,
      fill: COLORS.unassigned,
    },
  ];

  const totalLeads = chartData.reduce((sum, item) => sum + item.value, 0);
  const assignedPercentage = totalLeads > 0 ? ((chartData[0].value / totalLeads) * 100).toFixed(0) : 0;

  return (
    <div className="flex flex-col">
      {/* Card Header */}
      <div className="flex flex-col space-y-1.5 pb-4">
        <h3 className="font-semibold leading-none tracking-tight text-base sm:text-lg">
          Lead Assignment
        </h3>
        <p className="text-xs sm:text-sm text-gray-500">
          {assignedPercentage}% assigned to team members
        </p>
      </div>

      {/* Chart Container */}
      <div className="flex-1 pb-0">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(0, 0%, 90%)"
            />
            <XAxis
              dataKey="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tick={{ fill: 'hsl(0, 0%, 45%)' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              tick={{ fill: 'hsl(0, 0%, 45%)' }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(0, 0%, 96%)' }} />
            <Bar
              dataKey="value"
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {chartData.map((entry, index) => {
            const percentage = totalLeads > 0 ? ((entry.value / totalLeads) * 100).toFixed(0) : 0;
            return (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 p-2 hover:bg-gray-100 transition-colors"
              >
                <div
                  className="h-3 w-3 rounded-sm shrink-0"
                  style={{ backgroundColor: entry.fill }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{entry.category}</div>
                  <div className="text-xs text-gray-500">
                    {entry.value} ({percentage}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function TrendAreaChart({ historicalData }) {
  if (!historicalData || historicalData.length === 0) {
    return (
      <div className="flex flex-col">
        <div className="flex flex-col space-y-1.5 pb-4">
          <h3 className="font-semibold leading-none tracking-tight text-base sm:text-lg">
            Lead Trends
          </h3>
          <p className="text-xs sm:text-sm text-gray-500">
            Historical performance over time
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-gray-100 p-4 mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No data available</p>
          <p className="text-xs text-gray-500">Select a time range to view trends</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Card Header */}
      <div className="flex flex-col space-y-1.5 pb-4">
        <h3 className="font-semibold leading-none tracking-tight text-base sm:text-lg">
          Lead Trends Over Time
        </h3>
        <p className="text-xs sm:text-sm text-gray-500">
          Track total, new, and closed deals
        </p>
      </div>

      {/* Chart Container */}
      <div className="flex-1 pb-0">
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart
            data={historicalData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillDeal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="hsl(0, 0%, 90%)"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              tick={{ fill: 'hsl(0, 0%, 45%)' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              tick={{ fill: 'hsl(0, 0%, 45%)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="total"
              stroke="hsl(262, 83%, 58%)"
              strokeWidth={2}
              fill="url(#fillTotal)"
              name="Total Leads"
            />
            <Area
              type="monotone"
              dataKey="new"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2}
              fill="url(#fillNew)"
              name="New Leads"
            />
            <Area
              type="monotone"
              dataKey="deal"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              fill="url(#fillDeal)"
              name="Deals"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center sm:justify-start">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(262, 83%, 58%)' }} />
            <span className="text-xs text-gray-600">Total Leads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(217, 91%, 60%)' }} />
            <span className="text-xs text-gray-600">New Leads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} />
            <span className="text-xs text-gray-600">Deals</span>
          </div>
        </div>
      </div>
    </div>
  );
}
