"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import axios from "@/lib/axios";
import Filter from "../../components/shared/leads/ui/Filter";
import {
  HomeIcon,
  UserGroupIcon,
  FunnelIcon,
  StarIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  UserGroupIcon as UserGroupIconSolid,
  FunnelIcon as FunnelIconSolid,
  StarIcon as StarIconSolid,
  UserIcon as UserIconSolid,
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

export default function UserLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const filterButtonRef = useRef(null);

  const [filters, setFilters] = useState({});
  const [leads, setLeads] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Handle browser back button - only on /user page (main dashboard)
  useEffect(() => {
    // Only enable back button confirmation on the main user dashboard
    if (pathname !== "/user") {
      return;
    }

    // Track if we've set up the initial history
    let historyLength = window.history.length;
    
    // Push a new state immediately when component mounts
    window.history.pushState({ preventBack: true }, "");
    
    const handlePopState = (event) => {
      // Prevent the back navigation
      event.preventDefault();
      
      // Check if we're trying to go back from the user area
      if (event.state?.preventBack || historyLength <= 1) {
        // Show confirmation dialog
        setShowLogoutConfirm(true);
        // Push state again to stay on the page
        window.history.pushState({ preventBack: true }, "");
        return;
      }
      
      // If not our special state, allow normal back navigation
      window.history.back();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  });

  // Handle logout confirmation
  const handleConfirmLogout = useCallback(async () => {
    setShowLogoutConfirm(false);
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

      // Navigate to login page
      setTimeout(() => {
        window.location.href = "/login";
      }, 100);
    } catch (error) {
      console.error("Failed to logout", error);
      setIsLoggingOut(false);
      alert("Logout failed. Please try again.");
    }
  }, []);

  const handleCancelLogout = useCallback(() => {
    setShowLogoutConfirm(false);
  }, []);


  // Fetch user profile and leads data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get("me");
        setUserProfile(response.data);

        // Fetch leads data for filter autocomplete
        const userEmail = response.data?.email;
        if (userEmail) {
          const leadsResponse = await axios.get(
            `/leads/getLeads?email=${encodeURIComponent(userEmail)}`,
          );
          setLeads(leadsResponse.data || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

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
    if (filters.sourcePlatform && filters.sourcePlatform !== "all") count++;
    return count;
  }, [filters]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    setShowLogoutConfirm(true);
  }, []);

  // Handle menu actions
  const handleMenuAction = useCallback(
    (key) => {
      if (key === "profile" || key === "settings") {
        router.push("/user/profile");
        return;
      }
      if (key === "team_settings") {
        router.push("/user/allLeads");
        return;
      }
    },
    [router],
  );

  const tabs = [
    {
      id: "dashboard",
      name: "Dashboard",
      icon: HomeIcon,
      iconActive: HomeIconSolid,
      path: "/user",
    },
    {
      id: "leads",
      name: "Leads",
      icon: UserGroupIcon,
      iconActive: UserGroupIconSolid,
      path: "/user/allLeads",
    },
    {
      id: "filter",
      name: "Filter",
      icon: FunnelIcon,
      iconActive: FunnelIconSolid,
      isModal: true,
    },
    {
      id: "favorites",
      name: "Favorites",
      icon: StarIcon,
      iconActive: StarIconSolid,
      path: "/user/favorites",
    },
    {
      id: "profile",
      name: "Profile",
      icon: UserIcon,
      iconActive: UserIconSolid,
      path: "/user/profile",
    },
  ];

  const handleTabClick = (tab) => {
    if (tab.isModal && filterButtonRef.current) {
      // Trigger the existing Filter component's modal
      filterButtonRef.current.openFilter();
    } else if (tab.path) {
      router.push(tab.path);
    }
  };

  const isActiveTab = (tab) => {
    if (tab.path) {
      return pathname === tab.path;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hidden Filter Component - Only for triggering modal */}
      <div className="hidden">
        <Filter
          ref={filterButtonRef}
          leads={leads}
          onFiltersChange={handleFiltersChange}
          currentFilters={filters}
        />
      </div>

      {/* Main Content */}
      <div className="pb-20">
        {React.cloneElement(children, {
          sharedFilters: filters,
          sharedLeads: leads,
          onSharedFiltersChange: handleFiltersChange,
          onSharedClearFilters: handleClearFilters,
          sharedFilterRef: filterButtonRef,
        })}
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-[100000]">
          <div className="bg-white w-full rounded-t-2xl p-6 animate-slide-up">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Confirm Logout
              </h2>
              <p className="text-gray-600">
                Are you sure you want to log out? You'll need to log in again to access your account.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancelLogout}
                className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-3 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? "Logging out..." : "Log Out"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-[99999] h-16"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          backgroundColor: "white",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <div className="max-w-screen-xl mx-auto h-full">
          <div className="flex items-center justify-around px-2 py-1 h-full">
            {/* Dashboard Tab */}
            {tabs.slice(0, 1).map((tab) => {
              const isActive = isActiveTab(tab);
              const Icon = isActive ? tab.iconActive : tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-all duration-200 active:scale-95 ${
                    isActive ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  <Icon className="w-7 h-7 mb-0.5" />
                  <span className="text-[10px] font-medium">{tab.name}</span>
                </button>
              );
            })}

            {/* Leads Tab */}
            {tabs.slice(1, 2).map((tab) => {
              const isActive = isActiveTab(tab);
              const Icon = isActive ? tab.iconActive : tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-all duration-200 active:scale-95 ${
                    isActive ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  <Icon className="w-7 h-7 mb-0.5" />
                  <span className="text-[10px] font-medium">{tab.name}</span>
                </button>
              );
            })}

            {/* Profile Dropdown - Middle Position (Bigger) */}
            <Dropdown placement="top">
              <DropdownTrigger>
                <button className="flex flex-col items-center justify-center min-w-[70px] -mt-4 transition-all duration-200 active:scale-95">
                  <div className="relative">
                    <Badge
                      color={userProfile?.isOnline ? "success" : "default"}
                      content=""
                      placement="bottom-right"
                      shape="circle"
                      size="sm"
                    >
                      <Avatar
                        size="md"
                        isBordered
                        name={userProfile?.name}
                        src={
                          userProfile?.avatar ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile?.name || userProfile?.email || "User")}`
                        }
                        className="w-14 h-14"
                      />
                    </Badge>
                    {userProfile?.isVerified && (
                      <span className="absolute -top-0.5 -right-0.5 rounded-full bg-white p-[2px] text-blue-500 shadow-sm">
                        <CheckBadgeIcon className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 mt-0.5">
                    Profile
                  </span>
                </button>
              </DropdownTrigger>
              <DropdownMenu
                aria-label="User Actions"
                variant="flat"
                onAction={handleMenuAction}
              >
                <DropdownItem key="profile" className="h-14 gap-2">
                  <p className="font-bold">Signed in as</p>
                  <p className="font-bold">
                    {userProfile?.email?.split("@")[0]
                      ? `@${userProfile.email.split("@")[0]}`
                      : (userProfile?.email ?? "Unknown")}
                  </p>
                </DropdownItem>
                <DropdownItem key="settings">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-5 text-slate-400" />
                    <p>My Profile</p>
                  </div>
                </DropdownItem>
                <DropdownItem key="team_settings">
                  <div className="flex items-center gap-2">
                    <ClipboardDocumentCheckIcon className="w-5 text-slate-400" />
                    <p>My Tasks</p>
                  </div>
                </DropdownItem>
                <DropdownItem key="logout" color="danger">
                  <Divider className="mb-2" orientation="horizontal" />
                  <Button
                    className="w-full text-left"
                    color="danger"
                    isDisabled={isLoggingOut}
                    variant="flat"
                    onClick={handleLogout}
                  >
                    {isLoggingOut ? "Logging out..." : "Log Out"}
                  </Button>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>

            {/* Filter Tab */}
            {tabs.slice(2, 3).map((tab) => {
              const isActive = isActiveTab(tab);
              const Icon = isActive ? tab.iconActive : tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-all duration-200 active:scale-95 relative ${
                    isActive ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  <Icon className="w-7 h-7 mb-0.5" />
                  <span className="text-[10px] font-medium">{tab.name}</span>
                  {activeFilterCount > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                      {activeFilterCount}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Favorites Tab */}
            {tabs.slice(3, 4).map((tab) => {
              const isActive = isActiveTab(tab);
              const Icon = isActive ? tab.iconActive : tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-all duration-200 active:scale-95 ${
                    isActive ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  <Icon className="w-7 h-7 mb-0.5" />
                  <span className="text-[10px] font-medium">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
