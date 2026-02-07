"use client";
import { useState, useEffect, useCallback } from "react";
import Dashboard from "../../components/shared/Dashboard";
import axios from "@/lib/axios";

export default function UserDashboard() {
  const [userProfile, setUserProfile] = useState(null);

  // Load favorites from database
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const response = await axios.get("leads/favorites");
        const loadedFavorites = response.data?.favorites || [];
      } catch (error) {
        console.error("Error loading favorites:", error);
      }
    };

    loadFavorites();
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

  // Get greeting based on time of day
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  return <Dashboard userType="user" userProfile={userProfile} getGreeting={getGreeting} />;
}
