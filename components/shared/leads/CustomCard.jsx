import React from "react";
import { useRouter } from "next/navigation";
import CustomButton from "./ui/CustomButton";
import StatusChip from "./ui/StatusChip";
import { StarIcon } from "@heroicons/react/24/solid";
import Image from "next/image";

export default function CustomCard({
  lead,
  favorites = [],
  onToggleFavorite,
  onOpen,
  isAdmin = false,
  users = [],
  navigateTo = "/admin/allLeads",
}) {
  const router = useRouter();
  // Resolve lead ID
  const resolveLeadId = (lead) => {
    if (!lead) return null;
    if (typeof lead?._id?.toString === "function") {
      return lead._id.toString();
    }
    return lead?._id ?? lead?.id ?? null;
  };

  const leadId = resolveLeadId(lead);
  const isFavorite = leadId && favorites.includes(leadId);

  // Get assigned user avatar
  const getAssignedUserAvatar = (lead) => {
    // Try to find the user in the users array first
    const assignedUser = users.find(
      (user) => user.email === (lead.assignedTo || lead.userEmail),
    );
    if (assignedUser?.avatar && assignedUser.avatar.startsWith("data:image/")) {
      return assignedUser.avatar;
    }
    // Fallback to generated avatar
    const name =
      lead.assignedToName || lead.assignedTo || lead.userEmail || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=ffffff&size=64&bold=true`;
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation(); // Prevent opening the drawer
    if (onToggleFavorite && leadId) {
      onToggleFavorite(leadId);
    }
  };

  const handleCardClick = () => {
    if (leadId) {
      router.push(`${navigateTo}/${leadId}`);
    }
  };
  // Sticker mapping by status
  const statusAliases = {
    InProgress: "Interested",
  };

  const statusStickers = {
    New: {
      src: "/img/stickers/plantAsset2.svg",
      size: "w-14 max-w-[3.5rem]",
      left: "right-3 bottom-2",
    },
    Interested: {
      src: "/img/stickers/plantAsset3.svg",
      size: "w-14 max-w-[3.5rem]",
      left: "right-3 bottom-2",
    },
    "Not Interested": {
      src: "/img/stickers/plantAsset2.svg",
      size: "w-14 max-w-[3.5rem]",
      left: "right-3 bottom-2",
    },
    Deal: {
      src: "/img/stickers/plantAsset4.svg",
      size: "w-14 max-w-[3.5rem]",
      left: "right-3 bottom-2",
    },
  };

  const stickerKey = statusStickers[lead.status]
    ? lead.status
    : (statusAliases[lead.status] ?? null);

  const sticker = stickerKey ? (statusStickers[stickerKey] ?? null) : null;

  return (
    <div className="relative">
      {/* Main Card */}
      <div
        className="w-full rounded-2xl bg-white 
                   shadow-[0_1px_3px_rgba(0,0,0,0.1)]
                   hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]
                   transition-all duration-200
                   relative cursor-pointer overflow-visible"
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
      >
        <div className="p-3 sm:p-4">
          {/* Header Row */}
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1 sm:mb-2 truncate">
                {lead.name}
              </h3>
              <div className="inline-block">
                <StatusChip status={lead.status} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Platform Logo */}
              {lead.metaData?.platform && (
                <div className="flex-shrink-0 bg-white rounded-lg p-1.5 shadow-sm border border-gray-200">
                  <Image
                    src={lead.metaData.platform === "facebook" 
                      ? "/icons/facebookIcon.svg" 
                      : "/icons/instagramIcon.svg"}
                    alt={lead.metaData.platform}
                    width={20}
                    height={20}
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  />
                </div>
              )}

              {/* Favorites Button */}
              <button
                onClick={handleFavoriteClick}
                className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 
                  ${
                    isFavorite
                      ? "bg-yellow-400 text-white shadow-md"
                      : "bg-gray-100 text-gray-400 hover:bg-yellow-50 hover:text-yellow-500"
                  }`}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <StarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 my-2 sm:my-3"></div>

          {/* Contact Details */}
          <div className="space-y-2 sm:space-y-2.5">
            <div className="flex items-start gap-2 sm:gap-2.5">
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
              </svg>
              <span className="text-xs sm:text-sm text-gray-700 truncate flex-1">
                {lead.email}
              </span>
            </div>

            <div className="flex items-start gap-2 sm:gap-2.5">
              <svg
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path>
              </svg>
              <span className="text-xs sm:text-sm text-gray-700">
                {lead.phone}
              </span>
            </div>

            {lead.metaData?.formName && (
              <div className="flex items-start gap-2 sm:gap-2.5">
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="text-xs sm:text-sm text-gray-700 truncate flex-1" title={lead.metaData.formName}>
                  {lead.metaData.formName}
                </span>
              </div>
            )}

            {lead.project && (
              <div className="flex items-start gap-2 sm:gap-2.5">
                <svg
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="text-xs sm:text-sm text-gray-700 truncate flex-1">
                  {lead.project}
                </span>
              </div>
            )}

            {/* Admin-only: Assignment Status */}
            {isAdmin && (
              <>
                {lead.assignedTo || lead.userEmail ? (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-2.5 sm:p-3 mt-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative flex-shrink-0">
                        <img
                          src={getAssignedUserAvatar(lead)}
                          alt={
                            lead.assignedToName ||
                            lead.assignedTo ||
                            lead.userEmail
                          }
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-blue-200"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                            Assigned to
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                          {lead.assignedToName ||
                            lead.assignedTo ||
                            lead.userEmail}
                        </p>
                        {lead.assignedTo && lead.assignedToName && (
                          <p className="text-xs text-gray-500 truncate hidden sm:block">
                            {lead.assignedTo}
                          </p>
                        )}
                      </div>
                      <div className="text-blue-500 flex-shrink-0">
                        <svg
                          className="w-3 h-3 sm:w-4 sm:h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-2.5 sm:p-3 mt-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                            Assignment
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-gray-600">
                          Unassigned
                        </p>
                        <p className="text-xs text-gray-500 hidden sm:block">
                          Available for assignment
                        </p>
                      </div>
                      <div className="text-gray-400 flex-shrink-0">
                        <svg
                          className="w-3 h-3 sm:w-4 sm:h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Sticker - Outside card */}
      {sticker && (
        <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 pointer-events-none z-10">
          <img
            src={sticker.src}
            alt={`${lead.status} sticker`}
            className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-lg"
          />
        </div>
      )}
    </div>
  );
}
