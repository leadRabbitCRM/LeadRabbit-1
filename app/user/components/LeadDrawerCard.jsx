import { createMeetingHandlers } from "./ui/MeetingHandlers";
import { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Button,
  Tooltip,
  Avatar,
  AvatarGroup,
  Select,
  SelectItem,
  Chip,
} from "@heroui/react";
import {
  MegaphoneIcon,
  PhoneIcon,
  PlusIcon,
  StarIcon,
} from "@heroicons/react/24/solid";
import { IoLogoWhatsapp } from "react-icons/io";
import { FaMessage } from "react-icons/fa6";
import { MdEmail } from "react-icons/md";
import LeadMeetingDetalsTable from "./ui/LeadMeetingDetalsTable";
import LeadDetailNameCard from "./ui/LeadDetailNameCard";
import LeadHistoryTable from "./ui/LeadHistoryTable";
import StatusChip from "./ui/StatusChip";
import axios from "@/lib/axios";

// Validation functions
const isValidEmail = (email) => {
  // Handle undefined, null, empty strings, and whitespace
  if (email === undefined || email === null) return false;
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed === '') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
};

const isValidPhoneNumber = (phone) => {
  // Handle undefined, null, empty strings, and whitespace
  if (phone === undefined || phone === null) return false;
  if (typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (trimmed === '') return false;
  
  // Remove all non-digit characters
  const digitsOnly = trimmed.replace(/\D/g, '');
  // Phone should have at least 10 digits
  return digitsOnly.length >= 10;
};

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

export const users = [
  {
    id: 1,
    name: "Tony Reichert",
    role: "CEO",
    team: "Management",
    status: "active",
    age: "29",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/male/1.png",
    email: "tony.reichert@example.com",
  },
  {
    id: 2,
    name: "Zoey Lang",
    role: "Tech Lead",
    team: "Development",
    status: "paused",
    age: "25",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/female/1.png",
    email: "zoey.lang@example.com",
  },
  {
    id: 3,
    name: "Jane Fisher",
    role: "Sr. Dev",
    team: "Development",
    status: "active",
    age: "22",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/female/2.png",
    email: "jane.fisher@example.com",
  },
  {
    id: 4,
    name: "William Howard",
    role: "C.M.",
    team: "Marketing",
    status: "vacation",
    age: "28",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/male/2.png",
    email: "william.howard@example.com",
  },
  {
    id: 5,
    name: "Kristen Copper",
    role: "S. Manager",
    team: "Sales",
    status: "active",
    age: "24",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/female/3.png",
    email: "kristen.cooper@example.com",
  },
  {
    id: 6,
    name: "Brian Kim",
    role: "P. Manager",
    team: "Management",
    age: "29",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/male/3.png",
    email: "brian.kim@example.com",
    status: "active",
  },
  {
    id: 7,
    name: "Michael Hunt",
    role: "Designer",
    team: "Design",
    status: "paused",
    age: "27",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/male/4.png",
    email: "michael.hunt@example.com",
  },
  {
    id: 8,
    name: "Samantha Brooks",
    role: "HR Manager",
    team: "HR",
    status: "active",
    age: "31",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/female/4.png",
    email: "samantha.brooks@example.com",
  },
  {
    id: 9,
    name: "Frank Harrison",
    role: "F. Manager",
    team: "Finance",
    status: "vacation",
    age: "33",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/male/5.png",
    email: "frank.harrison@example.com",
  },
  {
    id: 10,
    name: "Emma Adams",
    role: "Ops Manager",
    team: "Operations",
    status: "active",
    age: "35",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/female/5.png",
    email: "emma.adams@example.com",
  },
  {
    id: 11,
    name: "Brandon Stevens",
    role: "Jr. Dev",
    team: "Development",
    status: "active",
    age: "22",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/male/7.png",
    email: "brandon.stevens@example.com",
  },
  {
    id: 12,
    name: "Megan Richards",
    role: "P. Manager",
    team: "Product",
    status: "paused",
    age: "28",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/female/7.png",
    email: "megan.richards@example.com",
  },
  {
    id: 13,
    name: "Oliver Scott",
    role: "S. Manager",
    team: "Security",
    status: "active",
    age: "37",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/male/8.png",
    email: "oliver.scott@example.com",
  },
  {
    id: 14,
    name: "Grace Allen",
    role: "M. Specialist",
    team: "Marketing",
    status: "active",
    age: "30",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/female/8.png",
    email: "grace.allen@example.com",
  },
  {
    id: 15,
    name: "Noah Carter",
    role: "IT Specialist",
    team: "I. Technology",
    status: "paused",
    age: "31",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/male/9.png",
    email: "noah.carter@example.com",
  },
  {
    id: 16,
    name: "Ava Perez",
    role: "Manager",
    team: "Sales",
    status: "active",
    age: "29",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/female/9.png",
    email: "ava.perez@example.com",
  },
  {
    id: 17,
    name: "Liam Johnson",
    role: "Data Analyst",
    team: "Analysis",
    status: "active",
    age: "28",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/male/11.png",
    email: "liam.johnson@example.com",
  },
  {
    id: 18,
    name: "Sophia Taylor",
    role: "QA Analyst",
    team: "Testing",
    status: "active",
    age: "27",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/female/11.png",
    email: "sophia.taylor@example.com",
  },
  {
    id: 19,
    name: "Lucas Harris",
    role: "Administrator",
    team: "Information Technology",
    status: "paused",
    age: "32",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/male/12.png",
    email: "lucas.harris@example.com",
  },
  {
    id: 20,
    name: "Mia Robinson",
    role: "Coordinator",
    team: "Operations",
    status: "active",
    age: "26",
    avatar: "https://d2u8k2ocievbld.cloudfront.net/memojis/female/12.png",
    email: "mia.robinson@example.com",
  },
];

export default function LeadCard({
  isOpen,
  onOpen,
  onOpenChange,
  lead,
  favorites = [],
  onToggleFavorite,
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

  // Favorites functionality
  const resolveLeadId = (lead) => {
    if (!lead) return null;
    if (typeof lead?._id?.toString === "function") {
      return lead._id.toString();
    }
    return lead?._id ?? lead?.id ?? null;
  };

  const leadId = resolveLeadId(lead);
  const isFavorite = leadId && favorites.includes(leadId);

  const handleFavoriteToggle = () => {
    if (onToggleFavorite && leadId) {
      onToggleFavorite(leadId);
    }
  };

  const [meetingActionState, setMeetingActionState] = useState({
    submitting: false,
    error: null,
  });
  const [engagementActionState, setEngagementActionState] = useState({
    submitting: false,
    error: null,
  });

  useEffect(() => {
    setLeadStatus(normalizeStatusValue(lead?.status));
    setMeetings(Array.isArray(lead?.meetings) ? lead.meetings : []);
    setEngagements(Array.isArray(lead?.engagements) ? lead.engagements : []);
  }, [lead?._id, lead?.status, lead?.meetings, lead?.engagements]);

  const normalizedLeadId = useMemo(() => {
    if (!lead) return null;

    if (typeof lead._id === "string") return lead._id;
    if (lead?._id?.toString) return lead._id.toString();
    if (lead?.id) return String(lead.id);

    return null;
  }, [lead]);

  const handleStatusSelection = (keys) => {
    const nextValue = Array.from(keys)[0];

    if (!nextValue) return;

    setLeadStatus(nextValue);

    if (onStatusChange && normalizedLeadId) {
      onStatusChange(normalizedLeadId, nextValue);
    }
  };

  const displayedLead = useMemo(() => {
    if (!lead) return lead;

    return {
      ...lead,
      status: leadStatus,
      meetings,
      engagements,
    };
  }, [lead, leadStatus, meetings, engagements]);

  const propagateMeetings = (nextMeetings) => {
    const sanitized = Array.isArray(nextMeetings) ? nextMeetings : [];
    setMeetings(sanitized);

    if (onMeetingsChange && normalizedLeadId) {
      onMeetingsChange(normalizedLeadId, sanitized);
    }
  };

  const handleMeetingActionError = (message) => {
    setMeetingActionState({ submitting: false, error: message });
    return message;
  };

  const clearMeetingError = () => {
    if (meetingActionState.error) {
      setMeetingActionState((prev) => ({ ...prev, error: null }));
    }
  };

  const propagateEngagements = (nextEngagements) => {
    const sanitized = Array.isArray(nextEngagements) ? nextEngagements : [];
    setEngagements(sanitized);

    if (onEngagementsChange && normalizedLeadId) {
      onEngagementsChange(normalizedLeadId, sanitized);
    }
  };

  const handleEngagementActionError = (message) => {
    setEngagementActionState({ submitting: false, error: message });
    return message;
  };

  const clearEngagementError = () => {
    if (engagementActionState.error) {
      setEngagementActionState((prev) => ({ ...prev, error: null }));
    }
  };

  // Use common meeting handlers
  const { handleCreateMeeting, handleRescheduleMeeting, handleCancelMeeting } =
    createMeetingHandlers(
      normalizedLeadId,
      meetings,
      propagateMeetings,
      setMeetingActionState,
      handleMeetingActionError,
    );

  const handleCreateEngagement = async (payload) => {
    if (!normalizedLeadId)
      return { success: false, error: "Missing lead identifier." };

    setEngagementActionState({ submitting: true, error: null });

    try {
      const response = await axios.post(
        `leads/${encodeURIComponent(normalizedLeadId)}/engagements`,
        payload,
      );
      const nextEngagements = response.data?.engagements ?? [];
      propagateEngagements(nextEngagements);

      setEngagementActionState({ submitting: false, error: null });
      return { success: true };
    } catch (error) {
      console.error("Failed to create engagement", error);
      const message =
        error?.response?.data?.error ??
        "Unable to save engagement. Please try again.";
      handleEngagementActionError(message);
      return { success: false, error: message };
    }
  };

  const handleUpdateEngagement = async (engagementId, payload) => {
    if (!normalizedLeadId)
      return { success: false, error: "Missing lead identifier." };

    setEngagementActionState({ submitting: true, error: null });

    try {
      const response = await axios.patch(
        `leads/${encodeURIComponent(normalizedLeadId)}/engagements/${encodeURIComponent(engagementId)}`,
        payload,
      );
      const nextEngagements = response.data?.engagements ?? [];
      propagateEngagements(nextEngagements);

      setEngagementActionState({ submitting: false, error: null });
      return { success: true };
    } catch (error) {
      console.error("Failed to update engagement", error);
      const message =
        error?.response?.data?.error ??
        "Unable to update engagement. Please try again.";
      handleEngagementActionError(message);
      return { success: false, error: message };
    }
  };

  const handleDeleteEngagement = async (engagementId) => {
    if (!normalizedLeadId)
      return { success: false, error: "Missing lead identifier." };

    setEngagementActionState({ submitting: true, error: null });

    try {
      const response = await axios.delete(
        `leads/${encodeURIComponent(normalizedLeadId)}/engagements/${encodeURIComponent(engagementId)}`,
      );
      const nextEngagements = response.data?.engagements ?? [];
      propagateEngagements(nextEngagements);

      setEngagementActionState({ submitting: false, error: null });
      return { success: true };
    } catch (error) {
      console.error("Failed to delete engagement", error);
      const message =
        error?.response?.data?.error ??
        "Unable to delete engagement. Please try again.";
      handleEngagementActionError(message);
      return { success: false, error: message };
    }
  };

  return (
    <>
      <Drawer
        hideCloseButton
        backdrop="blur"
        classNames={{
          base: "!max-w-full !w-full m-0 rounded-none bg-[#e8e8e8]",
        }}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        <DrawerContent>
          {(onClose) => (
            <>
              <DrawerHeader className="absolute top-0 inset-x-0 z-50 flex flex-row gap-3 px-4 py-4 border-b border-gray-200/60 justify-between bg-white/95 backdrop-saturate-150 backdrop-blur-xl shadow-sm">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Tooltip content="Close">
                    <Button
                      isIconOnly
                      className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 min-w-[40px] h-10"
                      size="sm"
                      variant="light"
                      onPress={onClose}
                    >
                      <svg
                        fill="none"
                        height="20"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        width="20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </Button>
                  </Tooltip>

                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                        Lead Details
                      </h2>
                    </div>
                  </div>
                </div>

                <Tooltip
                  content={
                    isFavorite ? "Remove from favorites" : "Add to favorites"
                  }
                >
                  <Button
                    isIconOnly
                    className={`transition-all duration-200 min-w-[40px] h-10 flex-shrink-0 ${
                      isFavorite
                        ? "text-yellow-500 bg-yellow-100 hover:bg-yellow-200 border-yellow-200"
                        : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 border-gray-200"
                    } border`}
                    size="sm"
                    variant="flat"
                    onPress={handleFavoriteToggle}
                  >
                    <StarIcon className="w-5 h-5" />
                  </Button>
                </Tooltip>
              </DrawerHeader>
              <DrawerBody className="pt-16 sm:pt-20 px-3 sm:px-4 pb-6">
                <div className="space-y-4 sm:space-y-6 pt-5">
                  <LeadDetailNameCard lead={displayedLead} />

                  {/* Quick Actions Section */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-medium text-gray-900">
                            Quick Actions
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Connect with this lead instantly
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {/* Call Now */}
                        <a
                          href={isValidPhoneNumber(lead?.phone) ? `tel:${lead.phone}` : "#"}
                          onClick={(e) => !isValidPhoneNumber(lead?.phone) && e.preventDefault()}
                          className={`group relative overflow-hidden text-gray-700 border rounded-2xl transition-all duration-300 active:scale-95 min-h-[64px] flex items-center justify-center ${
                            isValidPhoneNumber(lead?.phone)
                              ? "bg-white hover:bg-gray-50 border-gray-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer"
                              : "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                          }`}
                          title={!isValidPhoneNumber(lead?.phone) ? (!lead?.phone ? "Phone number not available" : "Invalid phone number") : ""}
                        >
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                            isValidPhoneNumber(lead?.phone)
                              ? "bg-gradient-to-br from-blue-500/5 to-transparent"
                              : ""
                          }`}></div>
                          <div className="relative flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isValidPhoneNumber(lead?.phone)
                            }`}>
                              <PhoneIcon className="w-4 h-4 text-white flex-shrink-0" />
                            </div>
                            <span className="font-medium text-sm">
                              Call Now
                            </span>
                          </div>
                        </a>

                        {/* WhatsApp */}
                        <a
                          href={isValidPhoneNumber(lead?.phone) ? `https://wa.me/${lead.phone}` : "#"}
                          onClick={(e) => !isValidPhoneNumber(lead?.phone) && e.preventDefault()}
                          className={`group relative overflow-hidden text-gray-700 border rounded-2xl transition-all duration-300 active:scale-95 min-h-[64px] flex items-center justify-center ${
                            isValidPhoneNumber(lead?.phone)
                              ? "bg-white hover:bg-gray-50 border-gray-200 hover:border-green-300 hover:shadow-lg hover:shadow-green-500/10 cursor-pointer"
                              : "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                          }`}
                          title={!isValidPhoneNumber(lead?.phone) ? (!lead?.phone ? "Phone number not available" : "Invalid phone number") : ""}
                        >
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                            isValidPhoneNumber(lead?.phone)
                              ? "bg-gradient-to-br from-green-500/5 to-transparent"
                              : ""
                          }`}></div>
                          <div className="relative flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isValidPhoneNumber(lead?.phone)
                                ? "bg-green-500"
                                : "bg-gray-400"
                            }`}>
                              <IoLogoWhatsapp className="w-4 h-4 text-white flex-shrink-0" />
                            </div>
                            <span className="font-medium text-sm">
                              WhatsApp
                            </span>
                          </div>
                        </a>

                        {/* Send Email */}
                        <a
                          href={isValidEmail(lead?.email) ? `mailto:${lead.email}` : "#"}
                          onClick={(e) => !isValidEmail(lead?.email) && e.preventDefault()}
                          className={`group relative overflow-hidden text-gray-700 border rounded-2xl transition-all duration-300 active:scale-95 min-h-[64px] flex items-center justify-center ${
                            isValidEmail(lead?.email)
                              ? "bg-white hover:bg-gray-50 border-gray-200 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer"
                              : "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                          }`}
                          title={!isValidEmail(lead?.email) ? (!lead?.email ? "Email not available" : "Invalid email address") : ""}
                        >
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                            isValidEmail(lead?.email)
                              ? "bg-gradient-to-br from-purple-500/5 to-transparent"
                              : ""
                          }`}></div>
                          <div className="relative flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isValidEmail(lead?.email)
                                ? "bg-purple-500"
                                : "bg-gray-400"
                            }`}>
                              <MdEmail className="w-4 h-4 text-white flex-shrink-0" />
                            </div>
                            <span className="font-medium text-sm">
                              Send Email
                            </span>
                          </div>
                        </a>

                        {/* Send SMS */}
                        <a
                          href={isValidPhoneNumber(lead?.phone) ? `sms:${lead.phone}` : "#"}
                          onClick={(e) => !isValidPhoneNumber(lead?.phone) && e.preventDefault()}
                          className={`group relative overflow-hidden text-gray-700 border rounded-2xl transition-all duration-300 active:scale-95 min-h-[64px] flex items-center justify-center ${
                            isValidPhoneNumber(lead?.phone)
                              ? "bg-white hover:bg-gray-50 border-gray-200 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer"
                              : "bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed"
                          }`}
                          title={!isValidPhoneNumber(lead?.phone) ? (!lead?.phone ? "Phone number not available" : "Invalid phone number") : ""}
                        >
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                            isValidPhoneNumber(lead?.phone)
                              ? "bg-gradient-to-br from-orange-500/5 to-transparent"
                              : ""
                          }`}></div>
                          <div className="relative flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isValidPhoneNumber(lead?.phone)
                                ? "bg-orange-500"
                                : "bg-gray-400"
                            }`}>
                              <FaMessage className="w-4 h-4 text-white flex-shrink-0" />
                            </div>
                            <span className="font-medium text-sm">
                              Send SMS
                            </span>
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Lead Status Section */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                          <MegaphoneIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-medium text-gray-900">
                            Lead Status
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Manage lead progression and pipeline stage
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-500">
                            Current Status
                          </span>
                          <StatusChip status={leadStatus} />
                        </div>
                        <div className="sm:max-w-[200px] w-full">
                          <Select
                            aria-label="Change lead status"
                            className="w-full"
                            disallowEmptySelection
                            label="Update Status"
                            labelPlacement="outside-left"
                            placeholder="Select new status"
                            selectedKeys={new Set([leadStatus])}
                            size="sm"
                            variant="bordered"
                            onSelectionChange={handleStatusSelection}
                            classNames={{
                              label:
                                "text-xs font-medium text-gray-600 whitespace-nowrap",
                              trigger:
                                "border-gray-300 hover:border-indigo-300 focus:border-indigo-500",
                            }}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.key}
                                textValue={option.label}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meetings Section */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-medium text-gray-900">
                            Meeting Schedule
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Manage appointments and meetings with this lead
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-0">
                      <LeadMeetingDetalsTable
                        meetings={meetings}
                        onCreateMeeting={handleCreateMeeting}
                        onRescheduleMeeting={handleRescheduleMeeting}
                        onCancelMeeting={handleCancelMeeting}
                        actionState={meetingActionState}
                        clearActionError={clearMeetingError}
                        leadEmail={lead.email}
                        leadName={lead.name}
                      />
                    </div>
                  </div>

                  {/* History Section */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-medium text-gray-900">
                            Engagement History
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Track all interactions and communications with this
                            lead
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-0">
                      <LeadHistoryTable
                        engagements={engagements}
                        onCreateEngagement={handleCreateEngagement}
                        onUpdateEngagement={handleUpdateEngagement}
                        onDeleteEngagement={handleDeleteEngagement}
                        actionState={engagementActionState}
                        clearActionError={clearEngagementError}
                      />
                    </div>
                  </div>
                </div>
              </DrawerBody>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
