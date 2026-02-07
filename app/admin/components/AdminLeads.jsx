"use client";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import axios from "@/lib/axios";
import Filter from "../../../components/shared/leads/ui/Filter";
import AdminLeadTable from "./AdminLeadTable";
import { UserGroupIcon } from "@heroicons/react/24/solid";
import {
  getLocalTimeZone,
  today,
  startOfWeek,
  startOfMonth,
  startOfYear,
  parseDate,
} from "@internationalized/date";

export default function AdminLeads({
  favorites = [],
  onToggleFavorite,
  hideHeader = false,
}) {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [filters, setFilters] = useState({});
  const [allUsers, setAllUsers] = useState([]); // Add users state

  const resolveLeadId = useCallback((lead) => {
    if (!lead) return null;

    if (typeof lead?._id?.toString === "function") {
      return lead._id.toString();
    }

    return lead?._id ?? lead?.id ?? null;
  }, []);

  // Fetch all leads for admin (not filtered by user email)
  useEffect(() => {
    const fetchAllLeads = async () => {
      try {
        setIsLoading(true);
        setFetchError("");

        // First, verify admin role and get user info
        const profileResponse = await axios.get("me");
        const userRole = profileResponse.data?.role;
        const userEmail = profileResponse.data?.email;

        if (userRole !== "admin") {
          setFetchError("Access denied. Admin role required.");
          setIsLoading(false);
          return;
        }

        // For admin, fetch ALL leads regardless of assignment
        const [leadsResponse, usersResponse] = await Promise.all([
          axios.get("leads/getAllLeads"),
          axios.get("admin/employees"),
        ]);

        const allLeads = leadsResponse.data ?? [];
        const users = usersResponse.data.users ?? [];

        setLeads(allLeads);
        setAllUsers(users);
        setIsLoading(false);
      } catch (error) {
        console.error("[ERROR] Admin: Error fetching all leads:", error);

        // Fallback: try alternative approach
        try {
          // Try to fetch leads without any email filter
          const fallbackResponse = await axios.get("leads/getLeads");
          const fallbackLeads = fallbackResponse.data ?? [];
          setLeads(fallbackLeads);
        } catch (fallbackError) {
          console.error("[ERROR] Admin: Fallback failed:", fallbackError);
          setLeads([]);
          setFetchError(
            "Unable to load leads. Please check your admin permissions or contact support.",
          );
        }
        setIsLoading(false);
      }
    };

    fetchAllLeads();
  }, []);

  // Apply filters whenever leads or filters change
  useEffect(() => {
    let filtered = [...leads];

    // Apply name filter
    if (filters.nameSearch?.trim()) {
      const searchTerm = filters.nameSearch.toLowerCase();
      filtered = filtered.filter((lead) =>
        lead.name?.toLowerCase().includes(searchTerm),
      );
    }

    // Apply email filter
    if (filters.emailSearch?.trim()) {
      const searchTerm = filters.emailSearch.toLowerCase();
      filtered = filtered.filter((lead) =>
        lead.email?.toLowerCase().includes(searchTerm),
      );
    }

    // Apply phone filter
    if (filters.phoneSearch?.trim()) {
      const searchTerm = filters.phoneSearch.toLowerCase();
      filtered = filtered.filter((lead) =>
        lead.phone?.toLowerCase().includes(searchTerm),
      );
    }

    // Apply assigned user filter
    if (filters.assignedUserSearch?.trim()) {
      const selectedUserEmail = filters.assignedUserSearch.trim().toLowerCase();
      filtered = filtered.filter((lead) => {
        // Check direct email match for assignedTo or userEmail
        const leadAssignedTo = (lead.assignedTo || "").toLowerCase().trim();
        const leadUserEmail = (lead.userEmail || "").toLowerCase().trim();

        // Exact email match
        return (
          leadAssignedTo === selectedUserEmail ||
          leadUserEmail === selectedUserEmail
        );
      });
    }

    // Apply status filter
    if (filters.statusFilter && filters.statusFilter !== "all") {
      filtered = filtered.filter(
        (lead) => lead.status === filters.statusFilter,
      );
    }

    // Apply source platform filter
    if (filters.sourcePlatform && filters.sourcePlatform !== "all") {
      filtered = filtered.filter(
        (lead) => lead.sourcePlatform === filters.sourcePlatform,
      );
    }

    // Apply time filter
    if (filters.timeFilter && filters.timeFilter !== "all") {
      const now = new Date();
      const timezone = getLocalTimeZone();

      let startDate;

      switch (filters.timeFilter) {
        case "today":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
          );
          break;
        case "week":
          const startOfCurrentWeek = startOfWeek(today(timezone), "en-US");
          startDate = new Date(
            startOfCurrentWeek.year,
            startOfCurrentWeek.month - 1,
            startOfCurrentWeek.day,
          );
          break;
        case "month":
          const startOfCurrentMonth = startOfMonth(today(timezone));
          startDate = new Date(
            startOfCurrentMonth.year,
            startOfCurrentMonth.month - 1,
            startOfCurrentMonth.day,
          );
          break;
        case "quarter":
          const currentMonth = now.getMonth();
          const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
          break;
        case "year":
          const startOfCurrentYear = startOfYear(today(timezone));
          startDate = new Date(startOfCurrentYear.year, 0, 1);
          break;
        case "custom":
          if (filters.dateRange?.start && filters.dateRange?.end) {
            const startCalDate = filters.dateRange.start;
            const endCalDate = filters.dateRange.end;

            const customStartDate = new Date(
              startCalDate.year,
              startCalDate.month - 1,
              startCalDate.day,
            );
            const customEndDate = new Date(
              endCalDate.year,
              endCalDate.month - 1,
              endCalDate.day + 1,
            );

            filtered = filtered.filter((lead) => {
              const leadDate = new Date(lead.createdAt || lead.timestamp);
              return leadDate >= customStartDate && leadDate < customEndDate;
            });
          }
          break;
        default:
          break;
      }

      if (startDate && filters.timeFilter !== "custom") {
        filtered = filtered.filter((lead) => {
          const leadDate = new Date(lead.createdAt || lead.timestamp);
          return leadDate >= startDate;
        });
      }
    }

    setFilteredLeads(filtered);
  }, [leads, filters, allUsers, resolveLeadId]);

  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleLeadStatusChange = useCallback(
    async (leadId, nextStatus) => {
      if (!leadId) return;

      let previousStatus = null;

      setLeads((prev) =>
        prev.map((lead) => {
          const currentId = resolveLeadId(lead);

          if (currentId === leadId) {
            previousStatus = lead.status ?? null;
            return { ...lead, status: nextStatus };
          }

          return lead;
        }),
      );

      try {
        await axios.patch("leads/updateStatus", {
          leadId,
          status: nextStatus,
        });
      } catch (error) {
        console.error("Failed to update lead status:", error);

        if (previousStatus) {
          setLeads((prev) =>
            prev.map((lead) => {
              const currentId = resolveLeadId(lead);

              return currentId === leadId
                ? { ...lead, status: previousStatus }
                : lead;
            }),
          );
        }
      }
    },
    [resolveLeadId],
  );

  const handleLeadMeetingsChange = useCallback(
    (leadId, nextMeetings) => {
      if (!leadId) return;

      setLeads((prev) =>
        prev.map((lead) => {
          const currentId = resolveLeadId(lead);

          if (currentId === leadId) {
            return {
              ...lead,
              meetings: Array.isArray(nextMeetings) ? nextMeetings : [],
            };
          }

          return lead;
        }),
      );
    },
    [resolveLeadId],
  );

  const handleLeadEngagementsChange = useCallback(
    (leadId, nextEngagements) => {
      if (!leadId) return;

      setLeads((prev) =>
        prev.map((lead) => {
          const currentId = resolveLeadId(lead);

          if (currentId === leadId) {
            return {
              ...lead,
              engagements: Array.isArray(nextEngagements)
                ? nextEngagements
                : [],
            };
          }

          return lead;
        }),
      );
    },
    [resolveLeadId],
  );

  // Count stats for display
  const totalLeads = leads.length;
  const filteredCount = filteredLeads.length;

  // Get comprehensive lead statistics including assignments
  const leadStats = useMemo(() => {
    const stats = {
      total: totalLeads,
      new: 0,
      interested: 0,
      notInterested: 0,
      deal: 0,
      assigned: 0,
      unassigned: 0,
      withEngagements: 0,
      withMeetings: 0,
      uniqueAssignees: new Set(),
    };

    leads.forEach((lead) => {
      // Status statistics
      switch (lead.status) {
        case "New":
          stats.new++;
          break;
        case "Interested":
          stats.interested++;
          break;
        case "Not Interested":
          stats.notInterested++;
          break;
        case "Deal":
          stats.deal++;
          break;
      }

      // Assignment statistics
      if (lead.assignedTo) {
        stats.assigned++;
        stats.uniqueAssignees.add(lead.assignedTo);
      } else {
        stats.unassigned++;
      }

      // Activity statistics
      if (Array.isArray(lead.engagements) && lead.engagements.length > 0) {
        stats.withEngagements++;
      }
      if (Array.isArray(lead.meetings) && lead.meetings.length > 0) {
        stats.withMeetings++;
      }
    });

    return {
      ...stats,
      uniqueAssignees: stats.uniqueAssignees.size,
    };
  }, [leads, totalLeads]);

  const renderEmptyState = () => (
    <div className="mt-20 text-center">
      <img
        src="/img/stickers/noLeads.svg"
        alt="No leads"
        className="mx-auto mb-4 w-[20rem]"
      />
      <p className="text-lg">No Leads Available !!</p>
      {fetchError && <p className="mt-2 text-sm text-red-500">{fetchError}</p>}
    </div>
  );

  return (
    <div>
      {/* Stats Section - Hidden when hideHeader is true */}
      {!hideHeader && (
        <div className="bg-[url('/gradient.jpg')] bg-cover bg-center pb-[3rem] mb-6">
          <div className="flex items-center gap-2 p-5">
            <UserGroupIcon className="w-10 text-white" />
            <p className="font-extrabold text-xl text-white">
              All Leads Management
            </p>
          </div>
          <div className="md:flex md:gap-3 md:justify-center max-md:grid grid-cols-2 gap-3 max-md:mx-3">
            {/* Total Leads */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center text-white">
              <div className="text-2xl font-bold">{leadStats.total}</div>
              <div className="text-sm opacity-90">Total Leads</div>
            </div>

            {/* Assignment Statistics */}
            <div className="bg-blue-500/20 backdrop-blur-sm rounded-2xl p-4 text-center text-white">
              <div className="text-2xl font-bold">{leadStats.assigned}</div>
              <div className="text-sm opacity-90">Assigned</div>
            </div>
            <div className="bg-orange-500/20 backdrop-blur-sm rounded-2xl p-4 text-center text-white">
              <div className="text-2xl font-bold">{leadStats.unassigned}</div>
              <div className="text-sm opacity-90">Unassigned</div>
            </div>
            <div className="bg-purple-500/20 backdrop-blur-sm rounded-2xl p-4 text-center text-white">
              <div className="text-2xl font-bold">
                {leadStats.uniqueAssignees}
              </div>
              <div className="text-sm opacity-90">Team Members</div>
            </div>

            {/* Status Statistics */}
            <div className="bg-green-500/20 backdrop-blur-sm rounded-2xl p-4 text-center text-white">
              <div className="text-2xl font-bold">{leadStats.new}</div>
              <div className="text-sm opacity-90">New Leads</div>
            </div>
            <div className="bg-cyan-500/20 backdrop-blur-sm rounded-2xl p-4 text-center text-white">
              <div className="text-2xl font-bold">{leadStats.interested}</div>
              <div className="text-sm opacity-90">Interested</div>
            </div>
            <div className="bg-yellow-500/20 backdrop-blur-sm rounded-2xl p-4 text-center text-white">
              <div className="text-2xl font-bold">{leadStats.deal}</div>
              <div className="text-sm opacity-90">Deals</div>
            </div>

            {/* Activity Statistics */}
            <div className="bg-pink-500/20 backdrop-blur-sm rounded-2xl p-4 text-center text-white">
              <div className="text-2xl font-bold">
                {leadStats.withEngagements}
              </div>
              <div className="text-sm opacity-90">With Activity</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="md:px-10 px-3 mb-6">
        <div className="flex justify-between items-center py-3">
          <Filter
            leads={leads}
            onFiltersChange={handleFiltersChange}
            currentFilters={filters}
            isAdmin={true}
          />
          <div className="flex gap-2 items-center">
            {/* Filter results count */}
            {Object.keys(filters).length > 0 && (
              <div className="flex items-center text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-lg">
                {filteredCount} of {totalLeads} leads
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leads Content */}
      <div className="md:px-10 px-3">
        {isLoading ? (
          <div className="flex w-full justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : filteredLeads.length > 0 ? (
          <AdminLeadTable
            leads={filteredLeads}
            onStatusChange={handleLeadStatusChange}
            onMeetingsChange={handleLeadMeetingsChange}
            onEngagementsChange={handleLeadEngagementsChange}
          />
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
}
