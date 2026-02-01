"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  HomeIcon,
  UserGroupIcon,
  UsersIcon,
  StarIcon,
  UserIcon,
  LinkIcon,
  HeartIcon,
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
import axios from "@/lib/axios";

type UserProfile = {
  name?: string;
  email?: string;
  role?: string;
  avatar?: string;
  isOnline?: boolean;
  isVerified?: boolean;
};

type Tab = {
  id: string;
  name: string;
  icon: any;
  iconActive: any;
  path: string;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Handle browser back button - only on /admin page
  useEffect(() => {
    // Only enable back button confirmation on the main admin dashboard
    if (pathname !== "/admin") {
      return;
    }

    // Track if we've set up the initial history
    let historyLength = window.history.length;
    
    // Push a new state immediately when component mounts
    window.history.pushState({ preventBack: true }, "");
    
    const handlePopState = (event: PopStateEvent) => {
      // Prevent the back navigation
      event.preventDefault();
      
      // Check if we're trying to go back from the admin area
      if ((event.state as any)?.preventBack || historyLength <= 1) {
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
  }, [pathname]);

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

  // Handle logout
  const handleLogout = useCallback(async () => {
    setShowLogoutConfirm(true);
  }, []);

  // Handle menu actions
  const handleMenuAction = useCallback(
    (key: any) => {
      if (key === "profile") {
        router.push("/admin/profile");
        return;
      }
      if (key === "settings") {
        router.push("/admin/profile");
        return;
      }
      if (key === "favorites") {
        router.push("/admin/favorites");
        return;
      }
      if (key === "team_settings") {
        router.push("/admin");
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
      path: "/admin",
    },
    {
      id: "leads",
      name: "All Leads",
      icon: UserGroupIcon,
      iconActive: UserGroupIconSolid,
      path: "/admin/allLeads",
    },
    {
      id: "integration",
      name: "Integration",
      icon: LinkIcon,
      iconActive: LinkIconSolid,
      path: "/admin/connectors",
    },
    {
      id: "employees",
      name: "Employees",
      icon: UsersIcon,
      iconActive: UsersIconSolid,
      path: "/admin/employees",
    },
  ];

  const handleTabClick = (tab: Tab) => {
    router.push(tab.path);
  };

  const getActiveTab = () => {
    if (!pathname) return "dashboard";
    if (pathname === "/admin") return "dashboard";
    if (pathname.includes("/allLeads")) return "leads";
    if (pathname.includes("/connectors")) return "integration";
    if (pathname.includes("/employees")) return "employees";
    return "dashboard";
  };

  const activeTabId = getActiveTab();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Main Content */}
      <div className="flex-1 pb-16">{children}</div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-around px-2 py-1">
            {/* Dashboard Tab */}
            {tabs.slice(0, 1).map((tab) => {
              const isActive = activeTabId === tab.id;
              const Icon = isActive ? tab.iconActive : tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-all duration-200 active:scale-95 ${
                    isActive ? "text-purple-600" : "text-gray-400"
                  }`}
                >
                  <Icon className="w-7 h-7 mb-0.5" />
                  <span className="text-[10px] font-medium">{tab.name}</span>
                </button>
              );
            })}

            {/* All Leads Tab */}
            {tabs.slice(1, 2).map((tab) => {
              const isActive = activeTabId === tab.id;
              const Icon = isActive ? tab.iconActive : tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-all duration-200 active:scale-95 ${
                    isActive ? "text-purple-600" : "text-gray-400"
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
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile?.name || userProfile?.email || "Admin")}`
                        }
                        className="w-14 h-14"
                      />
                    </Badge>
                    {userProfile?.isVerified && (
                      <span className="absolute -top-0.5 -right-0.5 rounded-full bg-white p-[2px] text-purple-500 shadow-sm">
                        <CheckBadgeIcon className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 mt-0.5">
                    Admin
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
                <DropdownItem key="favorites">
                  <div className="flex items-center gap-2">
                    <HeartIcon className="w-5 text-slate-400" />
                    <p>Favourite</p>
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

            {/* Integration Tab */}
            {tabs.slice(2, 3).map((tab) => {
              const isActive = activeTabId === tab.id;
              const Icon = isActive ? tab.iconActive : tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-all duration-200 active:scale-95 ${
                    isActive ? "text-purple-600" : "text-gray-400"
                  }`}
                >
                  <Icon className="w-7 h-7 mb-0.5" />
                  <span className="text-[10px] font-medium">{tab.name}</span>
                </button>
              );
            })}

            {/* All Employee Tab */}
            {tabs.slice(3, 4).map((tab) => {
              const isActive = activeTabId === tab.id;
              const Icon = isActive ? tab.iconActive : tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`flex flex-col items-center justify-center min-w-[60px] py-1 px-2 rounded-lg transition-all duration-200 active:scale-95 ${
                    isActive ? "text-purple-600" : "text-gray-400"
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
    </div>
  );
}
