"use client";
import React from "react";
import {
  BoltSlashIcon,
  BoltIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";
import Widget from "../components/widget";
import EmpTable from "./components/empTable";
import axios from "@/lib/axios";

export default function page() {
  const [activeCount, setActiveCount] = React.useState(0);
  const [inactiveCount, setInactiveCount] = React.useState(0);
  const [limits, setLimits] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch user counts
        const response = await axios.get("admin/addUser");
        const users = response.data?.users ?? [];

        let active = 0;
        let inactive = 0;

        users.forEach((user) => {
          if (user?.isOnline === true) {
            active += 1;
          } else {
            const status =
              typeof user?.status === "string"
                ? user.status.trim().toLowerCase()
                : undefined;
            if (status === "active") {
              active += 1;
            } else {
              inactive += 1;
            }
          }
        });

        setActiveCount(active);
        setInactiveCount(inactive);

        // Fetch limits
        const limitsResponse = await axios.get("admin/limits");
        setLimits(limitsResponse.data);
      } catch (error) {
        console.error("Failed to fetch employee counts or limits", error);
        setActiveCount(0);
        setInactiveCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-600">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-xs font-medium mb-1">
                Team Management 👨‍💼
              </p>
              <h1 className="text-xl font-bold text-white mb-1">Employees</h1>
              <p className="text-indigo-100 text-xs">
                Manage team members and user accounts
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 text-white">
              <UserGroupIcon className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="px-3 py-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 text-center shadow-sm">
            <div className="flex items-center justify-center mb-2">
              <BoltIcon className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-lg font-bold text-green-600">
              {activeCount}
            </div>
            <div className="text-[10px] text-gray-600">Active Users</div>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 text-center shadow-sm">
            <div className="flex items-center justify-center mb-2">
              <BoltSlashIcon className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-lg font-bold text-red-600">
              {inactiveCount}
            </div>
            <div className="text-[10px] text-gray-600">Inactive Users</div>
          </div>
        </div>
      </div>

      {/* Limits Section */}
      {limits && (
        <div className="px-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            {/* Users Limit */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-blue-700 uppercase">
                  Regular Users
                </p>
                {!limits.users.unlimited && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    Limited
                  </span>
                )}
                {limits.users.unlimited && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Unlimited
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-blue-900 mb-1">
                {limits.users.current}
                {!limits.users.unlimited && `/${limits.users.max}`}
              </div>
              {!limits.users.unlimited && (
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      limits.users.current >= limits.users.max
                        ? "bg-red-500"
                        : "bg-blue-600"
                    }`}
                    style={{
                      width: `${Math.min(
                        (limits.users.current / limits.users.max) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Admins Limit */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-purple-700 uppercase">
                  Admin Users
                </p>
                {!limits.admins.unlimited && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    Limited
                  </span>
                )}
                {limits.admins.unlimited && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    Unlimited
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-purple-900 mb-1">
                {limits.admins.current}
                {!limits.admins.unlimited && `/${limits.admins.max}`}
              </div>
              {!limits.admins.unlimited && (
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      limits.admins.current >= limits.admins.max
                        ? "bg-red-500"
                        : "bg-purple-600"
                    }`}
                    style={{
                      width: `${Math.min(
                        (limits.admins.current / limits.admins.max) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-3 pb-6">
        <EmpTable />
      </div>
    </div>
  );
}
