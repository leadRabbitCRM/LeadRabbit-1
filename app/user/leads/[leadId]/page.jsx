"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner, Button } from "@heroui/react";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import LeadDetailsContent from "../../../components/UserLeadDetailsContent";

export default function UserLeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.leadId;
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!leadId) return;

    const fetchLead = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/leads/${leadId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch lead");
        }

        const data = await response.json();
        setLead(data);
      } catch (err) {
        console.error("Error fetching lead:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [leadId]);

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const updatedLead = await response.json();
        setLead(updatedLead);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleMeetingsChange = (leadId, meetings) => {
    setLead((prev) => ({
      ...prev,
      meetings: meetings,
    }));
  };

  const handleEngagementsChange = (leadId, engagements) => {
    setLead((prev) => ({
      ...prev,
      engagements: engagements,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Lead Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "The lead you're looking for doesn't exist."}
          </p>
          <Button
            color="primary"
            startContent={<ArrowLeftIcon className="w-4 h-4" />}
            onClick={() => router.push("/user/allLeads")}
          >
            Back to Leads
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-500 to-teal-600">
        <div className="px-4 py-6">
          <div className="flex items-center gap-4">
            <Button
              isIconOnly
              variant="flat"
              className="bg-white/20 backdrop-blur-sm text-white border-0 hover:bg-white/30"
              onClick={() => router.push("/user/allLeads")}
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Button>
            <div>
              <p className="text-emerald-100 text-xs font-medium mb-1">
                Lead Details 👤
              </p>
              <h1 className="text-xl font-bold text-white mb-1">
                {lead.name || "Unknown"}
              </h1>
              <p className="text-emerald-100 text-xs">
                View and manage lead information
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <LeadDetailsContent
          lead={lead}
          onStatusChange={handleStatusChange}
          onMeetingsChange={handleMeetingsChange}
          onEngagementsChange={handleEngagementsChange}
        />
      </div>
    </div>
  );
}
