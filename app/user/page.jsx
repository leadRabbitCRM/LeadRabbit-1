"use client";
import { useState, useEffect, useCallback } from "react";
import { ModernWidget } from "../../components/ui/ModernWidget";
import LeadManager from "../../components/shared/leads/LeadManager";
import UserProfilePage from "./profile/page";
import axios from "@/lib/axios";

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState({
    totalLeads: "0",
    newLeads: "0",
    interestedLeads: "0",
    notInterestedLeads: "0",
    dealClosedLeads: "0",
  });
  const [previousStats, setPreviousStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({});
  const [userProfile, setUserProfile] = useState(null);

  // Load favorites from database
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const response = await axios.get("leads/favorites");
        const loadedFavorites = response.data?.favorites || [];
        setFavorites(loadedFavorites);
      } catch (error) {
        console.error("Error loading favorites:", error);
      }
    };

    loadFavorites();

    // Listen for visibility change to reload when returning to tab
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        loadFavorites();
      }
    });

    return () => {
      document.removeEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          loadFavorites();
        }
      });
    };
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

        // Get current user's email
        const profileResponse = await axios.get("me");
        const userEmail = profileResponse.data?.email;

        if (!userEmail) {
          setIsLoadingStats(false);
          return;
        }

        // Fetch leads for this user
        const response = await axios.get(
          `/leads/getLeads?email=${encodeURIComponent(userEmail)}`,
        );
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

        const currentStats = {
          totalLeads: totalLeads.toString(),
          newLeads: newLeads.toString(),
          interestedLeads: interestedLeads.toString(),
          notInterestedLeads: notInterestedLeads.toString(),
          dealClosedLeads: dealClosedLeads.toString(),
        };

        setStats(currentStats);

        // Store current stats for comparison next time
        const storedStats = localStorage.getItem("userDashboardStats");
        if (storedStats) {
          setPreviousStats(JSON.parse(storedStats));
        }
        localStorage.setItem(
          "userDashboardStats",
          JSON.stringify(currentStats),
        );
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
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

  const notInterestedLeadsTrend = previousStats
    ? calculateTrend(stats.notInterestedLeads, previousStats.notInterestedLeads)
    : null;

  const dealClosedLeadsTrend = previousStats
    ? calculateTrend(stats.dealClosedLeads, previousStats.dealClosedLeads)
    : null;

  // Toggle favorite
  const handleToggleFavorite = useCallback((leadId) => {
    setFavorites((prevFavorites) => {
      const isFavorite = prevFavorites.includes(leadId);
      const action = isFavorite ? "remove" : "add";
      
      // Call API to update database
      axios.post("leads/favorites", { leadId, action })
        .then((response) => {
          const updatedFavorites = response.data?.favorites || [];
          setFavorites(updatedFavorites);
        })
        .catch((error) => {
          console.error("Error updating favorites:", error);
        });

      // Optimistic update for UI
      const newFavorites = isFavorite
        ? prevFavorites.filter((id) => id !== leadId)
        : [...prevFavorites, leadId];
      return newFavorites;
    });
  }, []);

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard Content */}
      <div>
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600">
          <div className="px-4 py-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">
                  {getGreeting()} 👋
                </p>
                <h1 className="text-2xl font-bold text-white mb-1">
                  {userProfile?.name || "User"}
                </h1>
                <p className="text-blue-100 text-sm">
                  Here's your performance overview
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
        </div>

        {/* Stats Grid */}
        <div className="px-4 py-5 pb-24">
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
              count={stats.interestedLeads}
              label="Interested"
              trend={interestedLeadsTrend}
              color="purple"
            />
            <ModernWidget
              count={stats.notInterestedLeads}
              label="Not Interested"
              trend={notInterestedLeadsTrend}
              color="orange"
            />
            <div className="col-span-2">
              <ModernWidget
                count={stats.dealClosedLeads}
                label="Deals Closed"
                trend={dealClosedLeadsTrend}
                color="pink"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
