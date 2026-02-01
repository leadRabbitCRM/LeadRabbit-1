"use client";
import React, { useState, useCallback, useMemo, useRef } from "react";
import { UserGroupIcon, FunnelIcon } from "@heroicons/react/24/solid";
import { Button } from "@heroui/react";
import LeadManager from "../../../components/shared/leads/LeadManager";
import Filter from "../../../components/shared/leads/ui/Filter";

export default function UserAllLeadsPage() {
  // Local state for this page
  const filterButtonRef = useRef(null);
  const [filters, setFilters] = useState({});
  const [leads, setLeads] = useState([]);
  const [favorites, setFavorites] = useState([]);
  // Load favorites from database
  React.useEffect(() => {
    const loadFavorites = async () => {
      try {
        const response = await axios.get("leads/favorites");
        const loadedFavorites = response.data?.favorites || [];
        console.log("✅ Favorites loaded from database:", loadedFavorites);
        setFavorites(loadedFavorites);
      } catch (error) {
        console.error("❌ Error loading favorites:", error);
        setFavorites([]);
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

  // Fetch leads data for filter autocomplete
  React.useEffect(() => {
    const fetchLeadsForFilter = async () => {
      try {
        const response = await fetch("/api/me");
        const userData = await response.json();
        const userEmail = userData?.email;

        if (userEmail) {
          const leadsResponse = await fetch(
            `/api/leads/getLeads?email=${encodeURIComponent(userEmail)}`,
          );
          const leadsData = await leadsResponse.json();
          setLeads(leadsData || []);
        }
      } catch (error) {
        console.error("Error fetching leads for filter:", error);
      }
    };

    fetchLeadsForFilter();
  }, []);

  // Handle filters change
  const handleFiltersChange = useCallback(
    (newFilters) => {
      setFilters(newFilters);
    },
    [],
  );

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    // Create a completely clean filter object with explicit default values
    const clearedFilters = {
      nameSearch: "",
      emailSearch: "",
      phoneSearch: "",
      statusFilter: "all",
      timeFilter: "all",
      dateRange: null,
      sourcePlatform: "all",
      // Add a timestamp to force parent component re-evaluation
      _cleared: Date.now(),
    };
    setFilters(clearedFilters);
  }, []);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.nameSearch?.trim()) count++;
    if (filters.emailSearch?.trim()) count++;
    if (filters.phoneSearch?.trim()) count++;
    if (filters.statusFilter && filters.statusFilter !== "all") count++;
    if (filters.timeFilter && filters.timeFilter !== "all") count++;
    if (filters.sourcePlatform && filters.sourcePlatform !== "all") count++;
    return count;
  }, [filters]);

  const handleFilterClick = () => {
    if (filterButtonRef.current) {
      filterButtonRef.current.openFilter();
    }
  };

  // Toggle favorite
  const handleToggleFavorite = useCallback((leadId) => {
    console.log("📌 Toggle favorite clicked - leadId:", leadId);
    setFavorites((prevFavorites) => {
      const isFavorite = prevFavorites.includes(leadId);
      const action = isFavorite ? "remove" : "add";
      
      // Call API to update database
      axios.post("leads/favorites", { leadId, action })
        .then((response) => {
          const updatedFavorites = response.data?.favorites || [];
          console.log("💾 Favorites saved to database:", updatedFavorites);
          setFavorites(updatedFavorites);
        })
        .catch((error) => {
          console.error("❌ Error updating favorites:", error);
        });

      // Optimistic update for UI
      const newFavorites = isFavorite
        ? prevFavorites.filter((id) => id !== leadId)
        : [...prevFavorites, leadId];
      return newFavorites;
    });
  }, []);

  return (
    <div className="bg-gray-50">
      {/* Hidden Filter Component - Only for triggering modal */}
      <div className="hidden">
        <Filter
          ref={filterButtonRef}
          leads={leads}
          onFiltersChange={handleFiltersChange}
          currentFilters={filters}
        />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-500 to-teal-600">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-medium mb-1">
                Lead Management 👥
              </p>
              <h1 className="text-xl font-bold text-white mb-1">My Leads</h1>
              <p className="text-emerald-100 text-xs">
                Manage and track your assigned leads
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Filter Button */}
              <Button
                isIconOnly
                variant="flat"
                className="bg-white/20 backdrop-blur-sm text-white border-0 hover:bg-white/30 transition-all duration-200"
                onClick={handleFilterClick}
              >
                <div className="relative">
                  <FunnelIcon className="w-5 h-5" />
                  {activeFilterCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                      {activeFilterCount}
                    </div>
                  )}
                </div>
              </Button>

              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 text-white">
                <UserGroupIcon className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-24">
        <LeadManager
          isAdmin={false}
          hideHeader={true}
          externalFilters={filters}
          onClearFilters={handleClearFilters}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>
    </div>
  );
}
