"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Spinner,
  addToast,
} from "@heroui/react";
import { ArrowLeftIcon, UserIcon } from "@heroicons/react/24/solid";
import axios from "@/lib/axios";
import ProfileView from "@/components/shared/ProfileView";

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params?.employeeId;

  const [employee, setEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!employeeId) {
        setError("Employee ID is required");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await axios.get(`admin/employees/${employeeId}`);
        setEmployee(response.data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch employee profile", err);
        setError("Failed to load employee profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId]);

  const handleVerify = async () => {
    if (!employeeId) return;

    try {
      const isCurrentlyVerified = employee?.user?.isVerified;
      const shouldVerify = !isCurrentlyVerified;

      const response = await axios.put(`admin/employees/${employeeId}`, {
        action: shouldVerify ? "verify" : "unverify",
      });

      if (response.status === 200) {
        setEmployee((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            isVerified: shouldVerify,
          },
          profile: prev.profile
            ? {
                ...prev.profile,
                isVerified: shouldVerify,
                verifiedAt: shouldVerify
                  ? (response.data?.verifiedAt ?? new Date().toISOString())
                  : null,
              }
            : prev.profile,
        }));
        addToast({
          title: "Success",
          description: `Employee ${shouldVerify ? "verified" : "unverified"} successfully`,
          color: "success",
        });
      }
    } catch (error) {
      console.error("Failed to update verification status", error);
      addToast({
        title: "Error",
        description: "Failed to update verification status",
        color: "danger",
      });
    }
  };

  const handleUpdate = async (updatedData) => {
    if (!employeeId) return { success: false };

    try {
      const response = await axios.put(`admin/employees/${employeeId}`, {
        action: "update-profile",
        profileData: updatedData,
      });

      if (response.status === 200) {
        // Update the employee state with the new data including email
        setEmployee((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            email: updatedData.email || prev.user.email,
            name: updatedData.fullName || prev.user.name,
          },
          profile: {
            ...prev.profile,
            ...updatedData,
          },
        }));
        addToast({
          title: "Success",
          description: "Profile updated successfully",
          color: "success",
        });
        return { success: true };
      }
    } catch (error) {
      // Check if it's a duplicate email error - show warning but don't throw
      if (error.response?.status === 409) {
        addToast({
          title: "Warning",
          description: error.response?.data?.error || "Another user already uses this email address. Please use a different email.",
          color: "warning",
          duration: 5000,
        });
        return { success: false, validationError: true };
      } else if (error.response?.status === 400) {
        addToast({
          title: "Invalid Data",
          description: error.response?.data?.error || "Please check the email format.",
          color: "warning",
        });
        return { success: false, validationError: true };
      } else {
        addToast({
          title: "Error",
          description: "Failed to update profile",
          color: "danger",
        });
        return { success: false };
      }
    }
    return { success: false };
  };

  const handleDelete = async () => {
    if (!employeeId) return;

    try {
      await axios.delete(`admin/employees/${employeeId}`);
      addToast({
        title: "Success",
        description: "Employee deleted successfully",
        color: "success",
      });
      router.push("/admin/employees");
    } catch (error) {
      console.error("Failed to delete employee", error);
      addToast({
        title: "Error",
        description: "Failed to delete employee",
        color: "danger",
      });
    }
  };

  const handleResetPassword = async () => {
    if (!employeeId) return;

    try {
      await axios.post(`admin/employees/${employeeId}/reset-password`);
      addToast({
        title: "Success",
        description: "Password reset successfully",
        color: "success",
      });
    } catch (error) {
      console.error("Failed to reset password", error);
      addToast({
        title: "Error",
        description: "Failed to reset password",
        color: "danger",
      });
    }
  };

  const handleResetMFA = async () => {
    if (!employeeId) return;

    try {
      await axios.post(`admin/employees/${employeeId}/reset-mfa`);
      addToast({
        title: "Success",
        description: "MFA reset successfully",
        color: "success",
      });
    } catch (error) {
      console.error("Failed to reset MFA", error);
      addToast({
        title: "Error",
        description: "Failed to reset MFA",
        color: "danger",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div className="mx-auto max-w-4xl">
          {/* Header Skeleton */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-xl">
            <div className="px-4 md:px-6 py-6 md:py-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-lg animate-pulse"></div>
                <div className="flex-1">
                  <div className="w-32 h-3 bg-white/20 rounded mb-2 animate-pulse"></div>
                  <div className="w-48 h-6 bg-white/20 rounded mb-2 animate-pulse"></div>
                  <div className="w-64 h-3 bg-white/20 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="px-4 md:px-6 py-6 md:py-8">
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-4 bg-gray-300 rounded"></div>
                    <div className="h-4 bg-gray-300 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="bg-gradient-to-br from-red-600 via-red-500 to-pink-600 shadow-xl">
            <div className="px-4 md:px-6 py-6 md:py-8">
              <div className="flex items-center gap-4">
                <Button
                  isIconOnly
                  variant="light"
                  className="text-white hover:bg-white/20"
                  onPress={() => router.back()}
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </Button>
                <div>
                  <p className="text-red-100 text-xs font-medium mb-1">
                    Error 🚫
                  </p>
                  <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
                    Failed to Load Profile
                  </h1>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 md:px-6 py-6 md:py-8">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-100 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-gray-600 mb-6 text-sm">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="flat"
                  size="md"
                  onPress={() => router.back()}
                >
                  Go Back
                </Button>
                <Button
                  color="primary"
                  size="md"
                  onPress={() => window.location.reload()}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const user = employee?.user ?? null;
  const profile = employee?.profile ?? null;

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-xl">
          <div className="px-4 md:px-6 py-6 md:py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  isIconOnly
                  variant="light"
                  className="text-white hover:bg-white/20"
                  onPress={() => router.back()}
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </Button>
                <div>
                  <p className="text-blue-100 text-xs font-medium mb-1">
                    Employee Profile 👤
                  </p>
                  <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
                    {profile?.fullName || user?.name || "Employee Details"}
                  </h1>
                  <p className="text-blue-100 text-xs md:text-sm">
                    Complete profile information and verification status
                  </p>
                </div>
              </div>
              <div className="hidden md:flex bg-white/20 backdrop-blur-sm rounded-xl p-3 text-white">
                <UserIcon className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 md:px-6 py-6 md:py-8">
          <ProfileView
            user={user}
            profile={profile}
            isAdmin={true}
            onVerify={handleVerify}
            onDelete={handleDelete}
            onResetPassword={handleResetPassword}
            onResetMFA={handleResetMFA}
            onUpdate={handleUpdate}
            employeeId={employeeId}
          />
        </div>
      </div>
    </div>
  );
}
