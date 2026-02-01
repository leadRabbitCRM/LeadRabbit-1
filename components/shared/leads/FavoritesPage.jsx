"use client";
import React, { useState, useCallback, useMemo, useRef } from "react";
import { UserGroupIcon, FunnelIcon, SparklesIcon } from "@heroicons/react/24/solid";
import { Button } from "@heroui/react";
import LeadManager from "./LeadManager";
import Filter from "./ui/Filter";

export default function FavoritesPage({ isAdmin = false, storageKey = "leadRabbit_favorites" }) {
  // Local state for this page
  const filterButtonRef = useRef(null);
  const [filters, setFilters] = useState({});
  const [leads, setLeads] = useState([]);
  const [favorites, setFavorites] = useState([]);

  // Load favorites from database
  React.useEffect(() => {
    const loadFavorites = async () => {
      try {
        const response = await fetch("/api/leads/favorites", { 
          method: "GET",
          cache: "no-store" 
        });
        if (response.ok) {
          const data = await response.json();
          const loadedFavorites = data.favorites || [];
          console.log("✅ Favorites loaded from database:", loadedFavorites);
          setFavorites(loadedFavorites);
        }
      } catch (error) {
        console.error("❌ Error loading favorites:", error);
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
  }, [storageKey]);

  // Fetch leads data for filter autocomplete
  React.useEffect(() => {
    const fetchLeadsForFilter = async () => {
      try {
        let leadsData = [];

        if (isAdmin) {
          // For admin, fetch all leads
          const response = await fetch("/api/leads/getAllLeads");
          leadsData = await response.json();
        } else {
          // For user, fetch their leads
          const response = await fetch("/api/me");
          const userData = await response.json();
          const userEmail = userData?.email;

          if (userEmail) {
            const leadsResponse = await fetch(
              `/api/leads/getLeads?email=${encodeURIComponent(userEmail)}`,
            );
            leadsData = await leadsResponse.json();
          }
        }

        setLeads(leadsData || []);
      } catch (error) {
        console.error("Error fetching leads for filter:", error);
      }
    };

    fetchLeadsForFilter();
  }, [isAdmin]);

  // Handle filters change
  const handleFiltersChange = useCallback(
    (newFilters) => {
      setFilters(newFilters);
    },
    [],
  );

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.nameSearch?.trim()) count++;
    if (filters.emailSearch?.trim()) count++;
    if (filters.phoneSearch?.trim()) count++;
    if (filters.statusFilter && filters.statusFilter !== "all") count++;
    if (filters.timeFilter && filters.timeFilter !== "all") count++;
    if (filters.sourceFilter && filters.sourceFilter !== "all") count++;
    return count;
  }, [filters]);

  const handleFilterClick = () => {
    if (filterButtonRef.current) {
      filterButtonRef.current.openFilter();
    }
  };

  // Toggle favorite
  const handleToggleFavorite = useCallback((leadId) => {
    setFavorites((prevFavorites) => {
      const isFavorite = prevFavorites.includes(leadId);
      const action = isFavorite ? "remove" : "add";
      
      // Call API to update database
      fetch("/api/leads/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, action })
      })
        .then((response) => response.json())
        .then((data) => {
          const updatedFavorites = data.favorites || [];
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
  }, [storageKey]);

  // Header config based on role
  const headerConfig = isAdmin
    ? {
        bgClass: "bg-gradient-to-br from-purple-600 via-pink-500 to-red-600",
        textClass: "text-purple-100",
        title: "My Favorites",
        subtitle: "Favorite Leads ⭐",
        description: "Your starred leads",
      }
    : {
        bgClass: "bg-gradient-to-br from-amber-600 via-yellow-500 to-orange-600",
        textClass: "text-amber-100",
        title: "My Favorites",
        subtitle: "Favorite Leads ⭐",
        description: "Your starred leads",
      };

  return (
    <div className="bg-gray-50">
      {/* Hidden Filter Component - Only for triggering modal */}
      <div className="hidden">
        <Filter
          ref={filterButtonRef}
          leads={leads}
          onFiltersChange={handleFiltersChange}
          currentFilters={filters}
          isAdmin={isAdmin}
        />
      </div>

      {/* Header */}
      <div className={headerConfig.bgClass}>
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className={`${headerConfig.textClass} text-xs font-medium mb-1`}>
                {headerConfig.subtitle}
              </p>
              <h1 className="text-xl font-bold text-white mb-1">
                {headerConfig.title}
              </h1>
              <p className={`${headerConfig.textClass} text-xs`}>
                {headerConfig.description} ({favorites.length})
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
                <SparklesIcon className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-24">
        <LeadManager
          isAdmin={isAdmin}
          hideHeader={true}
          externalFilters={filters}
          onClearFilters={handleClearFilters}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          showFavoritesOnly={true}
        />
      </div>
    </div>
  );
}
