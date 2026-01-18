"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "@/lib/axios";
import LeadDrawerCard from "@/components/shared/leads/LeadDrawerCard";

export default function UserLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.leadId;

  const [lead, setLead] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);

  // Use refs to track if we've already fetched to prevent Strict Mode double-fetches
  const leadFetchRef = useRef(false);
  const favoritesFetchRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch lead details - only when leadId changes
  useEffect(() => {
    if (!leadId) return;

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Only fetch if we haven't already fetched this lead
    if (leadFetchRef.current && lead?.toString() === leadId) return;

    const fetchLead = async () => {
      try {
        leadFetchRef.current = true;
        setIsLoading(true);
        const response = await axios.get(
          `leads/${encodeURIComponent(leadId)}`
        );
        setLead(response.data);
        setError(null);
      } catch (err) {
        // Only show error if it wasn't aborted
        if (err?.code !== 'ECONNABORTED') {
          console.error("Error fetching lead:", err);
          setError("Failed to load lead details");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchLead();

    // Cleanup: prepare to cancel if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [leadId]);

  // Fetch favorites - only once on mount
  useEffect(() => {
    // Skip if already fetched
    if (favoritesFetchRef.current) return;

    const fetchFavorites = async () => {
      try {
        favoritesFetchRef.current = true;
        const response = await axios.get("leads/favorites");
        setFavorites(response.data?.favorites || []);
      } catch (err) {
        // If it fails, still mark as fetched to avoid retrying
        favoritesFetchRef.current = true;
        console.warn("Favorites endpoint unavailable - continuing without favorites");
      }
    };

    fetchFavorites();
  }, []);

  const handleToggleFavorite = useCallback(async (leadId) => {
    try {
      const response = await axios.patch(
        `leads/favorites/${encodeURIComponent(leadId)}`
      );
      setFavorites(response.data?.favorites || []);
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  }, []);

  const handleStatusChange = useCallback(async (leadId, newStatus) => {
    try {
      const response = await axios.patch(
        `leads/${encodeURIComponent(leadId)}`,
        { status: newStatus }
      );
      setLead(response.data);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  }, []);

  const handleMeetingsChange = useCallback((leadId, meetings) => {
    setLead((prev) => {
      if (!prev) return prev;
      const leadIdStr = typeof prev._id === "string" ? prev._id : prev._id?.toString?.();
      if (leadIdStr === leadId) {
        return { ...prev, meetings };
      }
      return prev;
    });
  }, []);

  const handleEngagementsChange = useCallback((leadId, engagements) => {
    setLead((prev) => {
      if (!prev) return prev;
      const leadIdStr = typeof prev._id === "string" ? prev._id : prev._id?.toString?.();
      if (leadIdStr === leadId) {
        return { ...prev, engagements };
      }
      return prev;
    });
  }, []);

  const handleOpenChange = useCallback((isOpen) => {
    if (!isOpen) {
      router.back();
    }
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || "Lead not found"}
          </h2>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <LeadDrawerCard
      isOpen={true}
      onOpen={() => {}}
      onOpenChange={handleOpenChange}
      lead={lead}
      favorites={favorites}
      onToggleFavorite={handleToggleFavorite}
      onStatusChange={handleStatusChange}
      onMeetingsChange={handleMeetingsChange}
      onEngagementsChange={handleEngagementsChange}
      isAdmin={false}
    />
  );
}
