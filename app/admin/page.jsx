"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import AdminLeads from "./components/AdminLeads";
import { ModernWidget } from "../../components/ui/ModernWidget";
import axios from "@/lib/axios";
import { useRouter } from "next/navigation";
import {
  HomeIcon,
  UserGroupIcon,
  UsersIcon,
  StarIcon,
  UserIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  UsersIcon as UsersIconSolid,
  StarIcon as StarIconSolid,
  UserIcon as UserIconSolid,
  LinkIcon as LinkIconSolid,
} from "@heroicons/react/24/solid";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Badge,
  Button,
  Divider,
} from "@heroui/react";
import {
  CheckBadgeIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/solid";

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
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
  const [previousStats, setPreviousStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [leads, setLeads] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Load favorites from localStorage
  useEffect(() => {
    const storedFavorites = localStorage.getItem("leadRabbit_admin_favorites");
    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites));
      } catch (error) {
        console.error("Error parsing favorites:", error);
      }
    }
  }, []);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get("me");
        setUserProfile(response.data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    fetchProfile();
  }, []);

  // Fetch leads and calculate stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoadingStats(true);

        // Verify admin role
        const profileResponse = await axios.get("me");
        const userRole = profileResponse.data?.role;

        if (userRole !== "admin") {
          setIsLoadingStats(false);
          return;
        }

        // Fetch all leads for admin
        const response = await axios.get("/leads/getAllLeads");
        const leadsData = response.data || [];
        setLeads(leadsData);

        // Calculate current stats
        const totalLeads = leadsData.length;
        const newLeads = leadsData.filter(
          (lead) => lead.status === "New",
        ).length;
        const interestedLeads = leadsData.filter(
          (lead) => lead.status === "Interested",
        ).length;
        const notInterestedLeads = leadsData.filter(
          (lead) => lead.status === "Not Interested",
        ).length;
        const dealClosedLeads = leadsData.filter(
          (lead) => lead.status === "Deal",
        ).length;
        const assignedLeads = leadsData.filter(
          (lead) => lead.assignedTo,
        ).length;
        const unassignedLeads = leadsData.filter(
          (lead) => !lead.assignedTo,
        ).length;

        // Fetch employee count (all users including admins)
        let totalUsers = 0;
        try {
          const employeesResponse = await axios.get("admin/addUser");
          totalUsers = employeesResponse.data?.users?.length || 0;
        } catch (error) {
          console.error("Error fetching employees:", error);
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

        // Store current stats for comparison next time
        const storedStats = localStorage.getItem("adminDashboardStats");
        if (storedStats) {
          setPreviousStats(JSON.parse(storedStats));
        }
        localStorage.setItem(
          "adminDashboardStats",
          JSON.stringify(currentStats),
        );
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();

    // Refresh stats every 30 seconds
    const statsInterval = setInterval(fetchStats, 30000);

    return () => clearInterval(statsInterval);
  }, []);

  // Get greeting based on time of day
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  // Calculate trend
  const calculateTrend = useCallback((current, previous) => {
    if (!previous) return { percentage: 0, isPositive: true };

    const curr = parseInt(current) || 0;
    const prev = parseInt(previous) || 0;

    if (prev === 0) return { percentage: 0, isPositive: true };

    const percentage = Math.round(((curr - prev) / prev) * 100);
    return {
      percentage: Math.abs(percentage),
      isPositive: curr >= prev,
    };
  }, []);

  const totalLeadsTrend = previousStats
    ? calculateTrend(stats.totalLeads, previousStats.totalLeads)
    : null;

  const newLeadsTrend = previousStats
    ? calculateTrend(stats.newLeads, previousStats.newLeads)
    : null;

  const interestedLeadsTrend = previousStats
    ? calculateTrend(stats.interestedLeads, previousStats.interestedLeads)
    : null;

  const assignedLeadsTrend = previousStats
    ? calculateTrend(stats.assignedLeads, previousStats.assignedLeads)
    : null;

  const dealClosedLeadsTrend = previousStats
    ? calculateTrend(stats.dealClosedLeads, previousStats.dealClosedLeads)
    : null;

  // Toggle favorite
  const handleToggleFavorite = useCallback((leadId) => {
    setFavorites((prevFavorites) => {
      const newFavorites = prevFavorites.includes(leadId)
        ? prevFavorites.filter((id) => id !== leadId)
        : [...prevFavorites, leadId];
      localStorage.setItem(
        "leadRabbit_admin_favorites",
        JSON.stringify(newFavorites),
      );
      return newFavorites;
    });
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Logout failed with status ${response.status}`);
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Failed to logout", error);
    } finally {
      setIsLoggingOut(false);
    }
  }, [isLoggingOut, router]);

  // Handle menu actions
  const handleMenuAction = useCallback((key) => {
    if (key === "profile" || key === "settings") {
      setActiveTab("profile");
      return;
    }
    if (key === "team_settings") {
      setActiveTab("leads");
      return;
    }
  }, []);

  // Filter leads for favorites view
  const favoriteLeads = leads.filter((lead) => {
    const leadId = lead._id?.toString() || lead.id;
    return favorites.includes(leadId);
  });

  return (
    <div className="bg-gray-50">
      {/* Tab Content */}
      <div>
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div>
            {/* Header */}
            <div className="bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-600">
              <div className="px-4 py-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium mb-1">
                      {getGreeting()} 👋
                    </p>
                    <h1 className="text-2xl font-bold text-white mb-1">
                      Admin {userProfile?.name || "Dashboard"}
                    </h1>
                    <p className="text-purple-100 text-sm">
                      Complete system overview and analytics
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
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="px-4 py-5">
              <div className="grid grid-cols-2 gap-3">
                <ModernWidget
                  count={stats.totalLeads}
                  label="Total Leads"
                  trend={totalLeadsTrend}
                  color="blue"
                />
                <ModernWidget
                  count={stats.newLeads}
                  label="New Leads"
                  trend={newLeadsTrend}
                  color="green"
                />
                <ModernWidget
                  count={stats.assignedLeads}
                  label="Assigned"
                  trend={assignedLeadsTrend}
                  color="purple"
                />
                <ModernWidget
                  count={stats.unassignedLeads}
                  label="Unassigned"
                  color="orange"
                />
                <ModernWidget
                  count={stats.interestedLeads}
                  label="Interested"
                  trend={interestedLeadsTrend}
                  color="cyan"
                />
                <ModernWidget
                  count={stats.totalUsers}
                  label="Team Members"
                  color="pink"
                />
                <div className="col-span-2">
                  <ModernWidget
                    count={stats.dealClosedLeads}
                    label="Deals Closed"
                    trend={dealClosedLeadsTrend}
                    color="emerald"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Leads Tab */}
        {activeTab === "leads" && (
          <div>
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-600 via-green-500 to-teal-600">
              <div className="px-4 py-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium mb-1">
                      System Management 🔧
                    </p>
                    <h1 className="text-2xl font-bold text-white mb-1">
                      All Leads
                    </h1>
                    <p className="text-emerald-100 text-sm">
                      Manage all leads across the organization
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-1 my-2">
              <AdminLeads
                favorites={favorites}
                onToggleFavorite={handleToggleFavorite}
                hideHeader={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
