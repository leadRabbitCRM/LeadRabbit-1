"use client";
import React from "react";

/**
 * Clean Modern Analytics Widget
 * Inspired by professional dashboard designs
 * @param {React.Component} icon - Icon component
 * @param {string|number} count - Main metric value
 * @param {string} label - Metric label/description
 * @param {object} trend - Optional trend object {percentage: number, isPositive: boolean}
 * @param {string} color - Color theme: blue, green, purple, orange, pink
 */
export function ModernWidget({
  icon: Icon,
  count,
  label,
  trend = null,
  color = "blue",
}) {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const colorConfig = {
    blue: {
      chart: "#3B82F6",
      chartLight: "rgba(59, 130, 246, 0.15)",
    },
    green: {
      chart: "#10B981",
      chartLight: "rgba(16, 185, 129, 0.15)",
    },
    emerald: {
      chart: "#10B981",
      chartLight: "rgba(16, 185, 129, 0.15)",
    },
    purple: {
      chart: "#8B5CF6",
      chartLight: "rgba(139, 92, 246, 0.15)",
    },
    orange: {
      chart: "#F97316",
      chartLight: "rgba(249, 115, 22, 0.15)",
    },
    pink: {
      chart: "#EC4899",
      chartLight: "rgba(236, 72, 153, 0.15)",
    },
    cyan: {
      chart: "#06B6D4",
      chartLight: "rgba(6, 182, 212, 0.15)",
    },
  };

  const colors = colorConfig[color] || colorConfig.blue;

  // Generate smooth wave chart data - seeded by label for consistency
  const generateWaveData = React.useCallback(() => {
    const points = 25;
    const seed = label
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return Array.from({ length: points }, (_, i) => {
      const wave1 = Math.sin((seed + i) * 0.3) * 30;
      const wave2 = Math.cos((seed + i) * 0.2) * 15;
      return 50 + wave1 + wave2;
    });
  }, [label]);

  const chartData = React.useMemo(() => generateWaveData(), [generateWaveData]);

  // Generate smooth SVG path - memoized to prevent hydration mismatch
  const pathData = React.useMemo(() => {
    const data = chartData;
    const width = 100;
    const height = 40;
    const points = data.map((value, index) => ({
      x: (index / (data.length - 1)) * width,
      y: height - (value / 100) * height,
    }));

    // Create smooth curve using quadratic bezier
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      path += ` Q ${prev.x},${prev.y} ${midX},${(prev.y + curr.y) / 2}`;
      if (i === points.length - 1) {
        path += ` T ${curr.x},${curr.y}`;
      }
    }
    return path;
  }, [chartData]);

  return (
    <div className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl p-5 shadow-lg hover:shadow-2xl border border-gray-200 transition-all duration-300 hover:-translate-y-1">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-20 h-20 opacity-10 rounded-bl-full" style={{ backgroundColor: colors.chart }} />
      
      {/* Count and Label */}
      <div className="relative mb-3">
        <h3 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">{count}</h3>
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{label}</p>
      </div>

      {/* Trend Indicator */}
      {trend && (
        <div
          className={`inline-flex items-center gap-1.5 text-xs font-bold mb-3 px-2.5 py-1 rounded-full ${
            trend.percentage === 0
              ? "bg-gray-100 text-gray-700"
              : trend.isPositive
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
          }`}
        >
          <span className="text-sm">
            {trend.percentage === 0 ? "→" : trend.isPositive ? "↗" : "↘"}
          </span>
          <span>{Math.abs(trend.percentage)}%</span>
        </div>
      )}

      {/* Mini Wave Chart */}
      <div className="h-12 -mx-2 mt-2">
        {isClient ? (
          <svg
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <defs>
              <linearGradient
                id={`gradient-${label.replace(/\s/g, "-")}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor={colors.chart} stopOpacity="0.3" />
                <stop offset="100%" stopColor={colors.chart} stopOpacity="0.05" />
              </linearGradient>
            </defs>
            {/* Area fill with gradient */}
            <path
              d={`${pathData} L 100,40 L 0,40 Z`}
              fill={`url(#gradient-${label.replace(/\s/g, "-")})`}
              stroke="none"
            />
            {/* Line stroke */}
            <path
              d={pathData}
              fill="none"
              stroke={colors.chart}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          </svg>
        ) : (
          <div className="w-full h-full bg-gray-100 rounded animate-pulse" />
        )}
      </div>
    </div>
  );
}

export default ModernWidget;
