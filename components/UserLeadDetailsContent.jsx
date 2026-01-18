"use client";
import { createMeetingHandlers } from "../app/user/components/ui/MeetingHandlers";
import React, { useState, useEffect } from "react";
import { Button, Avatar, Select, SelectItem, Chip } from "@heroui/react";
import { MegaphoneIcon, PhoneIcon } from "@heroicons/react/24/solid";
import { IoLogoWhatsapp } from "react-icons/io";
import { FaMessage } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";
import LeadMeetingDetalsTable from "../app/user/components/ui/LeadMeetingDetalsTable";
import LeadDetailNameCard from "../app/user/components/ui/LeadDetailNameCard";
import LeadHistoryTable from "../app/user/components/ui/LeadHistoryTable";
import StatusChip from "../app/user/components/ui/StatusChip";

const STATUS_OPTIONS = [
  { key: "New", label: "New" },
  { key: "Interested", label: "Interested" },
  { key: "Not Interested", label: "Not Interested" },
  { key: "Deal", label: "Deal" },
];

const STATUS_ALIASES = {
  InProgress: "Interested",
};

function normalizeStatusValue(value) {
  if (!value) return "New";
  const trimmed = value.toString().trim();
  if (trimmed.length === 0) return "New";
  const directMatch = STATUS_OPTIONS.find((option) => option.key === trimmed);
  if (directMatch) return directMatch.key;
  const alias = STATUS_ALIASES[trimmed];
  return alias ?? "New";
}

function resolveLeadId(lead) {
  if (!lead) return null;
  if (typeof lead?._id?.toString === "function") {
    return lead._id.toString();
  }
  return lead?._id ?? lead?.id ?? null;
}

export default function LeadDetailsContent({
  lead,
  onStatusChange,
  onMeetingsChange,
  onEngagementsChange,
}) {
  const [leadStatus, setLeadStatus] = useState(
    normalizeStatusValue(lead?.status),
  );
  const [meetings, setMeetings] = useState(
    Array.isArray(lead?.meetings) ? lead.meetings : [],
  );
  const [engagements, setEngagements] = useState(
    Array.isArray(lead?.engagements) ? lead.engagements : [],
  );

  // Add meeting action state
  const [meetingActionState, setMeetingActionState] = useState({
    submitting: false,
    error: null,
  });

  const handleMeetingActionError = (message) => {
    setMeetingActionState({ submitting: false, error: message });
    return message;
  };

  const clearMeetingError = () => {
    if (meetingActionState.error) {
      setMeetingActionState((prev) => ({ ...prev, error: null }));
    }
  };

  const propagateMeetings = (nextMeetings) => {
    const sanitized = Array.isArray(nextMeetings) ? nextMeetings : [];
    setMeetings(sanitized);

    if (onMeetingsChange) {
      const leadId = resolveLeadId(lead);
      onMeetingsChange(leadId, sanitized);
    }
  };

  const normalizedLeadId = resolveLeadId(lead);

  // Use common meeting handlers
  const { handleCreateMeeting, handleRescheduleMeeting, handleCancelMeeting } =
    createMeetingHandlers(
      normalizedLeadId,
      meetings,
      propagateMeetings,
      setMeetingActionState,
      handleMeetingActionError,
    );

  const displayedLead = {
    ...lead,
    status: leadStatus,
    meetings,
    engagements,
  };

  const handleStatusSelection = (keys) => {
    const selectedStatus = Array.from(keys)[0];
    if (selectedStatus && selectedStatus !== leadStatus) {
      setLeadStatus(selectedStatus);

      if (onStatusChange) {
        const leadId = resolveLeadId(lead);
        onStatusChange(leadId, selectedStatus);
      }
    }
  };

  useEffect(() => {
    setLeadStatus(normalizeStatusValue(lead?.status));
    setMeetings(Array.isArray(lead?.meetings) ? lead.meetings : []);
    setEngagements(Array.isArray(lead?.engagements) ? lead.engagements : []);
  }, [lead]);

  if (!lead) return null;

  return (
    <div className="space-y-6">
      {/* Lead Name Card */}
      <LeadDetailNameCard lead={displayedLead} />

      {/* Action Buttons */}
      <div className="pb-2 gap-2 flex text-xs overflow-scroll scrollbar-hide">
        <a
          href={`tel:${lead.phone}`}
          className="rounded-2xl bg-[#c9d5e0] [transform-style:preserve-3d] mix-blend-hard-light shadow-[6px_6px_6px_-2px_rgba(0,0,0,0.15),inset_4px_4px_3px_rgba(255,255,255,0.75),-4px_-4px_8px_rgba(255,255,255,0.55),inset_-1px_-1px_3px_rgba(0,0,0,0.2)] items-center px-5 py-2 flex gap-2"
        >
          <PhoneIcon className="w-5 text-gray-600" />
          Call
        </a>
        <a
          href={`https://wa.me/${lead.phone}`}
          className="rounded-2xl bg-[#c9d5e0] [transform-style:preserve-3d] mix-blend-hard-light shadow-[6px_6px_6px_-2px_rgba(0,0,0,0.15),inset_4px_4px_3px_rgba(255,255,255,0.75),-4px_-4px_8px_rgba(255,255,255,0.55),inset_-1px_-1px_3px_rgba(0,0,0,0.2)] items-center px-5 py-2 flex gap-2"
        >
          <IoLogoWhatsapp className="text-2xl text-gray-600" />
          WhatsApp
        </a>
        <a
          href={`mailto:${lead.email}`}
          className="rounded-2xl bg-[#c9d5e0] [transform-style:preserve-3d] mix-blend-hard-light shadow-[6px_6px_6px_-2px_rgba(0,0,0,0.15),inset_4px_4px_3px_rgba(255,255,255,0.75),-4px_-4px_8px_rgba(255,255,255,0.55),inset_-1px_-1px_3px_rgba(0,0,0,0.2)] items-center px-5 py-2 flex gap-2"
        >
          <MdEmail className="text-2xl text-gray-600" />
          Email
        </a>
        <a
          href={`sms:${lead.phone}`}
          className="rounded-2xl bg-[#c9d5e0] [transform-style:preserve-3d] mix-blend-hard-light shadow-[6px_6px_6px_-2px_rgba(0,0,0,0.15),inset_4px_4px_3px_rgba(255,255,255,0.75),-4px_-4px_8px_rgba(255,255,255,0.55),inset_-1px_-1px_3px_rgba(0,0,0,0.2)] items-center px-5 py-2 flex gap-2"
        >
          <FaMessage className="text-large text-gray-600" />
          Text
        </a>
      </div>

      {/* Lead Status */}
      <div className="my-3">
        <h1 className="font-bold text-md text-gray-700 pb-2 flex gap-2">
          <MegaphoneIcon className="w-4" />
          Lead Status
        </h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 pl-1">
            <StatusChip status={leadStatus} />
          </div>
          <Select
            aria-label="Change lead status"
            className="w-full max-w-[12rem]"
            disallowEmptySelection
            labelPlacement="outside"
            placeholder="Change status"
            selectedKeys={new Set([leadStatus])}
            size="sm"
            onSelectionChange={handleStatusSelection}
          >
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.key} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
        </div>
      </div>

      {/* Meetings Table */}
      <div className="space-y-4">
        <LeadMeetingDetalsTable
          meetings={meetings}
          leadEmail={lead.email}
          leadName={lead.name}
          onCreateMeeting={handleCreateMeeting}
          onRescheduleMeeting={handleRescheduleMeeting}
          onCancelMeeting={handleCancelMeeting}
          actionState={meetingActionState}
          clearActionError={clearMeetingError}
        />
      </div>

      {/* History Table */}
      <div className="space-y-4">
        <LeadHistoryTable
          lead={displayedLead}
          onEngagementsChange={onEngagementsChange}
        />
      </div>
    </div>
  );
}
