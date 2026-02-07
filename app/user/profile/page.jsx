"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addToast, Spinner } from "@heroui/react";
import ProfileView from "@/components/shared/ProfileView";

const parseBooleanFlag = (value) => {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return false;
};

export default function UserProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/user/profile", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch profile: ${response.status}`);
        }

        const data = await response.json();
        setUserData(data.user);
        setProfileData(data.profile);
      } catch (error) {
        console.error("Failed to load profile", error);
        addToast({
          title: "Profile",
          description: "Unable to load profile details.",
          color: "danger",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdate = async (updatedData) => {
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to update profile");
      }

      // Update local state
      setProfileData((prev) => ({
        ...prev,
        ...updatedData,
      }));

      // Update verification status if returned
      if (data.isVerified !== undefined) {
        setUserData((prev) => ({
          ...prev,
          isVerified: data.isVerified,
        }));
        setProfileData((prev) => ({
          ...prev,
          isVerified: data.isVerified,
        }));
      }

      const verified = parseBooleanFlag(data?.isVerified);
      addToast({
        title: "Profile updated",
        description: verified
          ? "Your profile has been updated successfully."
          : "Profile submitted. Awaiting admin verification.",
        color: "success",
      });
    } catch (error) {
      console.error("Failed to update profile", error);
      addToast({
        title: "Profile",
        description: error.message ?? "Failed to update profile.",
        color: "danger",
      });
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" color="primary" />
          <p className="mt-4 text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-xl">
          <div className="px-4 md:px-6 py-6 md:py-8">
            <div className="flex items-center justify-center md:justify-start">
              <div>
                <p className="text-blue-100 text-xs font-medium mb-1">
                  My Profile ??
                </p>
                <h1 className="text-xl md:text-2xl font-bold text-white mb-1">
                  {profileData?.fullName || userData?.name || "My Profile"}
                </h1>
                <p className="text-blue-100 text-xs md:text-sm">
                  Manage your professional information and documents
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 md:px-6 py-6 md:py-8">
          <ProfileView
            user={userData}
            profile={profileData}
            isAdmin={false}
            onUpdate={handleUpdate}
          />
        </div>
      </div>
    </div>
  );
}

