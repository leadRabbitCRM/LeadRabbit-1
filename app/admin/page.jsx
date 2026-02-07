"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import AdminLeads from "./components/AdminLeads";
import Dashboard from "../../components/shared/Dashboard";
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

  // Fetch leads for favorites
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await axios.get("/leads/getAllLeads");
        setLeads(response.data || []);
      } catch (error) {
        console.error("Error fetching leads:", error);
      }
    };
    fetchLeads();
  }, []);

  // Get greeting based on time of day
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

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
          <Dashboard 
            userType="admin" 
            userProfile={userProfile} 
            getGreeting={getGreeting} 
          />
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
