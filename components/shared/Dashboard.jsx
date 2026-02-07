"use client";
import { useState, useEffect, useCallback } from "react";
import { HandRaisedIcon } from "@heroicons/react/24/outline";
import { ModernWidget } from "../ui/ModernWidget";
import {
  TrendAreaChart,
  LeadStatusPieChart,
  AssignmentBarChart,
} from "../../app/admin/components/DashboardCharts";
import TimeRangeFilter from "../../app/admin/components/TimeRangeFilter";
import axios from "@/lib/axios";

/**
 * Shared Dashboard Component for both Admin and User dashboards
 * @param {Object} props
 * @param {string} props.userType - "admin" or "user"
 * @param {Object} props.userProfile - User profile data
 * @param {Function} props.getGreeting - Function to get greeting message
 */
export default function Dashboard({ userType = "user", userProfile, getGreeting }) {
  const [timeRange, setTimeRange] = useState("all");
  const [customRange, setCustomRange] = useState({ startDate: "", endDate: "" });
  const [stats, setStats] = useState({
    totalLeads: "0",
    newLeads: "0",
    interestedLeads: "0",
    notInterestedLeads: "0",
    dealClosedLeads: "0",
    assignedLeads: "0",
    unassignedLeads: "0",
    totalUsers: "0",
  });
  const [historicalData, setHistoricalData] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [leads, setLeads] = useState([]);

  // Filter leads by time range
  const filterLeadsByTimeRange = useCallback((leadsData, range, customDates = null) => {
    if (range === "all") return leadsData;

    const now = new Date();
    let cutoffDate;

    if (range === "custom" && customDates?.startDate && customDates?.endDate) {
      const startDate = new Date(customDates.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(customDates.endDate);
      endDate.setHours(23, 59, 59, 999);

      return leadsData.filter((lead) => {
        const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
        return createdAt && createdAt >= startDate && createdAt <= endDate;
      });
    }

    switch (range) {
      case "24h":
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return leadsData;
    }

    return leadsData.filter((lead) => {
      const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
      return createdAt && createdAt >= cutoffDate;
    });
  }, []);

  // Generate historical data for charts
  const generateHistoricalData = useCallback((leadsData, range, customDates = null) => {
    const now = new Date();
    const data = [];

    if (range === "custom" && customDates?.startDate && customDates?.endDate) {
      // Custom range - divide into equal intervals
      const start = new Date(customDates.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customDates.endDate);
      end.setHours(23, 59, 59, 999);
      
      const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      const intervals = Math.min(7, Math.max(3, daysDiff)); // 3-7 data points
      
      for (let i = 0; i < intervals; i++) {
        const intervalStart = new Date(start.getTime() + (daysDiff / intervals) * i * 24 * 60 * 60 * 1000);
        const intervalEnd = new Date(start.getTime() + (daysDiff / intervals) * (i + 1) * 24 * 60 * 60 * 1000);
        
        const leadsInInterval = leadsData.filter((lead) => {
          const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
          return createdAt && createdAt >= intervalStart && createdAt < intervalEnd;
        });
        
        data.push({
          date: intervalStart.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit" }),
          total: leadsInInterval.length,
          new: leadsInInterval.filter((l) => l.status === "New").length,
          deal: leadsInInterval.filter((l) => l.status === "Deal").length,
        });
      }
      
      return data;
    }

    if (range === "24h") {
      // Last 24 hours - 6 data points (every 4 hours)
      for (let i = 5; i >= 0; i--) {
        const timePoint = new Date(now.getTime() - i * 4 * 60 * 60 * 1000);
        const cutoff = new Date(timePoint.getTime() - 4 * 60 * 60 * 1000);

        const leadsUpToPoint = leadsData.filter((lead) => {
          const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
          return createdAt && createdAt <= timePoint && createdAt > cutoff;
        });

        data.push({
          date: timePoint.toLocaleTimeString("en-IN", {
            hour: "numeric",
            hour12: true,
          }),
          total: leadsUpToPoint.length,
          new: leadsUpToPoint.filter((l) => l.status === "New").length,
          deal: leadsUpToPoint.filter((l) => l.status === "Deal").length,
        });
      }
    } else if (range === "7d") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const leadsForDay = leadsData.filter((lead) => {
          const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
          return createdAt && createdAt >= date && createdAt < nextDate;
        });

        data.push({
          date:
            i === 0
              ? "Today"
              : date.toLocaleDateString("en-IN", { weekday: "short" }),
          total: leadsForDay.length,
          new: leadsForDay.filter((l) => l.status === "New").length,
          deal: leadsForDay.filter((l) => l.status === "Deal").length,
        });
      }
    } else if (range === "30d") {
      // Last 30 days - 6 data points (every 5 days)
      for (let i = 5; i >= 0; i--) {
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() - i * 5);
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 4);
        startDate.setHours(0, 0, 0, 0);

        const leadsInRange = leadsData.filter((lead) => {
          const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
          return createdAt && createdAt >= startDate && createdAt <= endDate;
        });

        data.push({
          date: `${String(startDate.getDate()).padStart(2, '0')}/${String(startDate.getMonth() + 1).padStart(2, '0')}`,
          total: leadsInRange.length,
          new: leadsInRange.filter((l) => l.status === "New").length,
          deal: leadsInRange.filter((l) => l.status === "Deal").length,
        });
      }
    } else {
      // All time - show monthly data for last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const leadsForMonth = leadsData.filter((lead) => {
          const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
          return createdAt && createdAt >= monthStart && createdAt <= monthEnd;
        });

        data.push({
          date: date.toLocaleDateString("en-IN", { month: "short" }),
          total: leadsForMonth.length,
          new: leadsForMonth.filter((l) => l.status === "New").length,
          deal: leadsForMonth.filter((l) => l.status === "Deal").length,
        });
      }
    }

    return data;
  }, []);

  // Fetch leads and calculate stats
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchStats = async () => {
      try {
        setIsLoadingStats(true);

        let leadsData = [];

        if (userType === "admin") {
          // Fetch all leads for admin
          const response = await axios.get("/leads/getAllLeads", {
            signal: controller.signal,
          });
          leadsData = response.data || [];
        } else {
          // Fetch user-specific leads
          const profileResponse = await axios.get("me", {
            signal: controller.signal,
          });
          const userEmail = profileResponse.data?.email;

          if (!userEmail || !isMounted) {
            setIsLoadingStats(false);
            return;
          }

          const response = await axios.get(
            `/leads/getLeads?email=${encodeURIComponent(userEmail)}`,
            { signal: controller.signal },
          );
          leadsData = response.data || [];
        }

        if (!isMounted) return;

        setLeads(leadsData);

        // Filter leads by time range
        const filteredLeads = filterLeadsByTimeRange(leadsData, timeRange, customRange);

        // Generate historical data for charts
        const historical = generateHistoricalData(leadsData, timeRange, customRange);
        setHistoricalData(historical);

        // Calculate current stats from filtered data
        const totalLeads = filteredLeads.length;
        const newLeads = filteredLeads.filter(
          (lead) => lead.status === "New",
        ).length;
        const interestedLeads = filteredLeads.filter(
          (lead) => lead.status === "Interested",
        ).length;
        const notInterestedLeads = filteredLeads.filter(
          (lead) => lead.status === "Not Interested",
        ).length;
        const dealClosedLeads = filteredLeads.filter(
          (lead) => lead.status === "Deal",
        ).length;

        let assignedLeads = 0;
        let unassignedLeads = 0;
        let totalUsers = 0;

        // Admin-specific stats
        if (userType === "admin") {
          assignedLeads = filteredLeads.filter((lead) => 
            lead.assignedTo && lead.assignedTo.trim() !== ""
          ).length;
          unassignedLeads = filteredLeads.filter((lead) => 
            !lead.assignedTo || lead.assignedTo.trim() === ""
          ).length;

          // Fetch employee count
          try {
            const employeesResponse = await axios.get("admin/addUser", {
              signal: controller.signal,
            });
            totalUsers = employeesResponse.data?.users?.length || 0;
          } catch (error) {
            if (error.name !== "CanceledError" && error.name !== "AbortError") {
              console.error("Error fetching employees:", error);
            }
          }
        }

        const currentStats = {
          totalLeads: totalLeads.toString(),
          newLeads: newLeads.toString(),
          interestedLeads: interestedLeads.toString(),
          notInterestedLeads: notInterestedLeads.toString(),
          dealClosedLeads: dealClosedLeads.toString(),
          assignedLeads: assignedLeads.toString(),
          unassignedLeads: unassignedLeads.toString(),
          totalUsers: totalUsers.toString(),
        };

        setStats(currentStats);
      } catch (error) {
        if (error.name !== "AbortError" && error.name !== "CanceledError") {
          console.error("Error fetching stats:", error);
        }
      } finally {
        if (isMounted) {
          setIsLoadingStats(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [timeRange, customRange, userType, filterLeadsByTimeRange, generateHistoricalData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div>
        {/* Header with decorative pattern */}
        <div className="relative bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative px-4 py-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1 flex items-center gap-2">
                  <span>{getGreeting()}</span>
                  <HandRaisedIcon className="w-4 h-4" />
                </p>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {userProfile?.name || (userType === "admin" ? "Admin" : "User")}
                </h1>
                <p className="text-purple-100 text-sm">
                  {userType === "admin" 
                    ? "Manage your team and track overall performance"
                    : "Here's your performance overview"}
                </p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-white">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Time Range Filter */}
          <div className="relative border-t border-white/10 px-4 py-3">
            <TimeRangeFilter
              selectedRange={timeRange}
              onRangeChange={setTimeRange}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
            />
          </div>
        </div>

        {/* Quick Overview */}
        <div className="px-4 py-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg p-1.5">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Quick Overview</h2>
            </div>
            <p className="text-sm text-gray-600 ml-8">Key performance metrics</p>
          </div>

          {/* Stats Grid - Different layouts for admin vs user */}
          {userType === "admin" ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <ModernWidget
                count={stats.totalLeads}
                label="Total Leads"
                color="blue"
              />
              <ModernWidget
                count={stats.newLeads}
                label="New Leads"
                color="green"
              />
              <ModernWidget
                count={stats.dealClosedLeads}
                label="Deals Closed"
                color="pink"
              />
              <ModernWidget
                count={stats.totalUsers}
                label="Team Members"
                color="purple"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <ModernWidget
                count={stats.totalLeads}
                label="Total Leads"
                color="blue"
              />
              <ModernWidget
                count={stats.newLeads}
                label="New Leads"
                color="green"
              />
              <ModernWidget
                count={stats.interestedLeads}
                label="Interested"
                color="purple"
              />
              <ModernWidget
                count={stats.notInterestedLeads}
                label="Not Interested"
                color="orange"
              />
              <div className="col-span-2">
                <ModernWidget
                  count={stats.dealClosedLeads}
                  label="Deals Closed"
                  color="pink"
                />
              </div>
            </div>
          )}
        </div>

        {/* Charts Section */}
        <div className="px-4 pb-6 space-y-4">
          {/* Lead Trends Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <TrendAreaChart historicalData={historicalData} />
          </div>

          {/* Lead Status Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <LeadStatusPieChart data={stats} />
          </div>

          {/* Lead Assignment - Admin Only */}
          {userType === "admin" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <AssignmentBarChart data={stats} />
            </div>
          )}

          {/* Admin-specific breakdown */}
          {userType === "admin" && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                Detailed Breakdown
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mb-2">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.totalLeads}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Total Leads</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mb-2">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.assignedLeads}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Assigned</div>
                </div>

                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-orange-100 rounded-full mb-2">
                    <svg
                      className="w-5 h-5 text-orange-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.unassignedLeads}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Unassigned</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mb-2">
                    <svg
                      className="w-5 h-5 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.totalUsers}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Team Members</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom spacing for mobile nav */}
        <div className="h-24" />
      </div>
    </div>
  );
}
