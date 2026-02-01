"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import {
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import {
  Badge,
  User,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Divider,
  Button,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";

type UserProfile = {
  name: string;
  email: string | null;
  role: string | null;
  avatar?: string | null;
  isOnline?: boolean;
  isVerified?: boolean;
};

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const router = useRouter();

  const parseBooleanFlag = useCallback((value: unknown) => {
    if (value === true || value === 1) return true;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();

      return normalized === "true" || normalized === "1";
    }

    return false;
  }, []);

  const menuItems = [
    { key: "Home", href: "/admin" },
    { key: "Tickets", href: "/admin/tickets" },
    { key: "Employees", href: "/admin/employees" },
    { key: "Connectors", href: "/admin/connectors" },
  ];

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      setIsProfileLoading(true);
      try {
        const response = await fetch("/api/me", { cache: "no-store" });

        if (response.status === 401 || response.status === 403) {
          router.push("/login");
          router.refresh();

          return;
        }

        if (!response.ok) {
          throw new Error(
            `Profile request failed with status ${response.status}`,
          );
        }

        const data = await response.json();

        if (isMounted) {
          setProfile({
            name: data.name ?? "User",
            email: data.email ?? null,
            role: data.role ?? null,
            avatar: data.avatar ?? null,
            isOnline: parseBooleanFlag(data.isOnline),
            isVerified: parseBooleanFlag(data.isVerified),
          });
        }
      } catch (error) {
        console.error("Failed to load user profile", error);
      } finally {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [parseBooleanFlag, router]);

  const homeHref = useMemo(() => {
    if (profile?.role === "user") {
      return "/user";
    }

    return "/admin";
  }, [profile?.role]);

  const displayEmailHandle = useMemo(() => {
    if (!profile?.email) return "";

    return profile.email.split("@")[0];
  }, [profile?.email]);

  const avatarSrc = useMemo(() => {
    if (profile?.avatar) return profile.avatar;
    const seed = profile?.name ?? profile?.email ?? "User";

    return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`;
  }, [profile?.avatar, profile?.email, profile?.name]);

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

  return (
    <header className="bg-white shadow-md">
      <div className=" mx-auto px-10 py-3 flex items-center justify-between">
        {/* Left: Logo + Menu toggle */}
        <div className="flex items-center gap-3">
          <button
            className="sm:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
          <img
            alt="Logo"
            className="w-[5rem] cursor-pointer"
            src="/logo.png"
            onClick={() => router.push(homeHref)}
          />
        </div>

        {/* Middle: Links (hidden on mobile) */}
        <div className="flex items-center gap-10">
          <nav className="hidden sm:flex gap-6">
            <a className="hover:text-blue-500" href="/admin">
              Tickets
            </a>
            <a className="hover:text-blue-500" href="/admin/employees">
              Employees
            </a>
            <a className="hover:text-blue-500" href="/admin/calendar">
              Calendar
            </a>
            <a className="hover:text-blue-500" href="/admin/connectors ">
              Connectors
            </a>
          </nav>

          {/* Right: Avatar dropdown */}
          <Dropdown placement="bottom-end">
            <DropdownTrigger className="cursor-pointer">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Badge
                    color={profile?.isOnline ? "success" : "default"}
                    content=""
                    placement="bottom-right"
                    shape="circle"
                  >
                    <User
                      avatarProps={{
                        isBordered: true,
                        src: isProfileLoading ? undefined : avatarSrc,
                        name: profile?.name,
                      }}
                      className="transition-transform"
                      name={undefined}
                    />
                  </Badge>
                  {profile?.isVerified && (
                    <span className="absolute -top-1 -left-1 rounded-full bg-white p-[2px] text-blue-500 shadow-md">
                      <CheckBadgeIcon className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">
                    {profile?.name ??
                      (isProfileLoading ? "Loading..." : "User")}
                  </p>
                  <p className="text-xs text-gray-500">
                    {displayEmailHandle ? `@${displayEmailHandle}` : ""}
                  </p>
                </div>
              </div>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="User Actions"
              variant="flat"
              onAction={(key) => {
                if (key === "settings") {
                  router.push("/admin/profile");
                }
              }}
            >
              <DropdownItem key="profile" className="h-14 gap-2">
                <p className="font-bold">Signed in as</p>
                <p className="font-bold">
                  {displayEmailHandle
                    ? `@${displayEmailHandle}`
                    : (profile?.email ?? "Unknown")}
                </p>
              </DropdownItem>
              <DropdownItem key="settings">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 text-slate-400" />
                  <p>My Profile</p>
                </div>
              </DropdownItem>
              <DropdownItem key="logout" color="danger">
                <Divider className="mb-2" />
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
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden bg-white shadow-md px-4 py-3 space-y-2">
          {menuItems.map((item, index) => (
            <a
              key={index}
              className="block hover:text-blue-500"
              href={item.href}
            >
              {item.key}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
