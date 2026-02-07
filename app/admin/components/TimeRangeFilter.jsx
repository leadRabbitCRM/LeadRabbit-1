"use client";
import React, { useState } from "react";
import { Button, Popover, PopoverTrigger, PopoverContent } from "@heroui/react";
import { DateRangePicker } from "@heroui/date-picker";
import { BoltIcon, CalendarDaysIcon, ChartBarIcon, CalendarIcon } from "@heroicons/react/24/outline";

export default function TimeRangeFilter({ selectedRange, onRangeChange, customRange, onCustomRangeChange }) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [dateRange, setDateRange] = useState(null);

  const ranges = [
    { value: "24h", label: "24 Hours", icon: BoltIcon },
    { value: "7d", label: "7 Days", icon: CalendarDaysIcon },
    { value: "30d", label: "30 Days", icon: ChartBarIcon },
    { value: "all", label: "All Time", icon: "∞" },
    { value: "custom", label: "Custom", icon: CalendarIcon },
  ];

  const handleApplyCustom = () => {
    try {
      if (dateRange && dateRange.start && dateRange.end) {
        // Validate dates
        if (!dateRange.start.year || !dateRange.start.month || !dateRange.start.day ||
            !dateRange.end.year || !dateRange.end.month || !dateRange.end.day) {
          console.error("Invalid date range values");
          return;
        }
        
        // Convert DateValue to ISO string format
        const startDateStr = `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`;
        const endDateStr = `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`;
        
        // Validate date strings
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error("Invalid date conversion");
          return;
        }
        
        if (startDate > endDate) {
          console.error("Start date cannot be after end date");
          return;
        }
        
        onCustomRangeChange({ startDate: startDateStr, endDate: endDateStr });
        onRangeChange("custom");
        setIsCustomOpen(false);
      }
    } catch (error) {
      console.error("Error applying custom date range:", error);
    }
  };

  const handleCancel = () => {
    setDateRange(null);
    setIsCustomOpen(false);
  };

  const handleRangeClick = (value) => {
    if (value === "custom") {
      setIsCustomOpen(true);
    } else {
      onRangeChange(value);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-2 text-white/90">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm font-semibold">Time Range</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {ranges.map((range) => (
          range.value === "custom" ? (
            <Popover 
              key={range.value} 
              isOpen={isCustomOpen} 
              onOpenChange={setIsCustomOpen}
              placement="bottom"
              shouldCloseOnBlur={false}
              backdrop="transparent"
            >
              <PopoverTrigger>
                <Button
                  size="sm"
                  onClick={() => handleRangeClick(range.value)}
                  className={`
                    ${
                      selectedRange === range.value
                        ? "bg-white text-purple-600 shadow-lg scale-105 font-bold"
                        : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                    }
                    border-2 ${
                      selectedRange === range.value
                        ? "border-white"
                        : "border-white/30"
                    }
                    transition-all duration-300 transform hover:scale-105
                    px-4 py-2 rounded-xl
                  `}
                >
                  <span className="mr-1.5">
                    {typeof range.icon === 'string' ? range.icon : <range.icon className="w-4 h-4" />}
                  </span>
                  {range.label}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="px-4 py-3 space-y-3">
                  <div className="text-sm font-semibold text-gray-900 pb-2 border-b">
                    Select Custom Date Range
                  </div>
                  <div className="space-y-3">
                    <DateRangePicker
                      label="Date Range"
                      value={dateRange}
                      onChange={setDateRange}
                      size="sm"
                      variant="bordered"
                      placeholder="Select date range"
                      dateInputClassNames={{
                        input: "text-sm"
                      }}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      color="default"
                      variant="flat"
                      onPress={handleCancel}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      color="primary"
                      onPress={handleApplyCustom}
                      isDisabled={!dateRange || !dateRange.start || !dateRange.end}
                      className="flex-1"
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Button
              key={range.value}
              size="sm"
              onClick={() => handleRangeClick(range.value)}
              className={`
                ${
                  selectedRange === range.value
                    ? "bg-white text-purple-600 shadow-lg scale-105 font-bold"
                    : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                }
                border-2 ${
                  selectedRange === range.value
                    ? "border-white"
                    : "border-white/30"
                }
                transition-all duration-300 transform hover:scale-105
                px-4 py-2 rounded-xl
              `}
            >
              <span className="mr-1.5">
                {typeof range.icon === 'string' ? range.icon : <range.icon className="w-4 h-4" />}
              </span>
              {range.label}
            </Button>
          )
        ))}
      </div>
    </div>
  );
}
