"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import {
  Button,
  Avatar,
  Chip,
  Textarea,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Spinner,
  Checkbox,
  DatePicker,
} from "@heroui/react";
import { Input } from "@heroui/input";
import { parseDate, CalendarDate } from "@internationalized/date";
import {
  UserIcon,
  CheckBadgeIcon,
  DocumentTextIcon,
  IdentificationIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  UserCircleIcon,
  PencilIcon,
  XMarkIcon,
  KeyIcon,
  ShieldExclamationIcon,
  TrashIcon,
  CameraIcon,
  PlusIcon,
  BriefcaseIcon,
  ChartPieIcon,
} from "@heroicons/react/24/solid";

function buildDataUrl(file) {
  if (!file?.type || !file?.data) return null;
  return `data:${file.type};base64,${file.data}`;
}

const parseBooleanFlag = (value) => {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return false;
};

function openFileInNewTab(file) {
  if (!file?.data || !file?.type) return;

  const byteCharacters = window.atob(file.data);
  const byteArrays = [];
  const sliceSize = 1024;

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);

    for (let i = 0; i < slice.length; i += 1) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    byteArrays.push(new Uint8Array(byteNumbers));
  }

  const blob = new Blob(byteArrays, { type: file.type });
  const url = URL.createObjectURL(blob);
  const newWindow = window.open(url, "_blank", "noopener,noreferrer");

  if (!newWindow) {
    URL.revokeObjectURL(url);
    return;
  }

  const revokeUrl = () => {
    URL.revokeObjectURL(url);
    newWindow.removeEventListener("beforeunload", revokeUrl);
  };

  newWindow.addEventListener("beforeunload", revokeUrl);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Unable to read file"));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export default function ProfileView({
  user,
  profile,
  isAdmin = false,
  onVerify,
  onDelete,
  onResetPassword,
  onResetMFA,
  onUpdate,
  employeeId,
}) {
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({});
  const [photoPreview, setPhotoPreview] = useState(null);
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);
  const [leadStats, setLeadStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [deleteLeadCount, setDeleteLeadCount] = useState(0);
  const [isLoadingDeleteStats, setIsLoadingDeleteStats] = useState(false);
  
  const {
    isOpen: isVerifyOpen,
    onOpen: onVerifyOpen,
    onClose: onVerifyClose,
  } = useDisclosure();
  
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();

  const {
    isOpen: isResetPasswordOpen,
    onOpen: onResetPasswordOpen,
    onClose: onResetPasswordClose,
  } = useDisclosure();

  const {
    isOpen: isResetMFAOpen,
    onOpen: onResetMFAOpen,
    onClose: onResetMFAClose,
  } = useDisclosure();

  useEffect(() => {
    if (profile) {
      setEditData({
        ...profile,
        email: user?.email || "",
      });
      setEducation(profile.education || []);
      setExperience(profile.experience || []);
    }
  }, [profile, user?.email]);

  useEffect(() => {
    setPhotoPreview(user?.avatar || null);
  }, [user?.avatar]);

  useEffect(() => {
    const fetchLeadStats = async () => {
      setIsLoadingStats(true);
      try {
        const url = isAdmin && employeeId 
          ? `/api/admin/employees/${employeeId}/lead-stats`
          : '/api/user/lead-stats';
        
        console.log('Fetching lead stats from:', url);
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Lead stats data:', data);
          setLeadStats(data);
        } else {
          const error = await response.json();
          console.error('Failed to fetch lead stats:', response.status, error);
        }
      } catch (error) {
        console.error("Failed to fetch lead stats", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchLeadStats();
  }, [employeeId, isAdmin]);

  const userVerified = parseBooleanFlag(user?.isVerified);
  const aadhaarUrl = buildDataUrl(profile?.aadhaarFile ?? null);
  const panUrl = buildDataUrl(profile?.panFile ?? null);

  const handleEditMode = () => {
    setEditData({
      ...profile,
      email: user?.email || "",
    });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditData({
      ...profile,
      email: user?.email || "",
    });
    setPhotoPreview(user?.avatar || null); // Reset photo preview
    setEducation(profile?.education || []);
    setExperience(profile?.experience || []);
    setIsEditMode(false);
  };

  const handleInputChange = (field, value) => {
    setEditData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToBase64(file);
      setPhotoPreview(dataUrl);
      setEditData((prev) => ({
        ...prev,
        profilePhoto: dataUrl,
      }));
    } catch (error) {
      console.error("Failed to process photo", error);
    }
  };

  const handleAadhaarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToBase64(file);
      const [, base64Data] = dataUrl.split(",");
      
      const filePayload = {
        name: file.name,
        type: file.type,
        data: base64Data,
      };

      setEditData((prev) => ({
        ...prev,
        aadhaarFile: filePayload,
      }));
    } catch (error) {
      console.error("Failed to process Aadhaar file", error);
    }
  };

  const handlePanUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToBase64(file);
      const [, base64Data] = dataUrl.split(",");
      
      const filePayload = {
        name: file.name,
        type: file.type,
        data: base64Data,
      };

      setEditData((prev) => ({
        ...prev,
        panFile: filePayload,
      }));
    } catch (error) {
      console.error("Failed to process PAN file", error);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        ...editData,
        education,
        experience,
      };
      const result = await onUpdate(dataToSave);
      // Only close edit mode if the update was successful
      if (result?.success) {
        setIsEditMode(false);
      }
      // If validation error (like duplicate email), keep edit mode open
    } catch (error) {
      // Keep edit mode open if there's an unexpected error
      console.error("Failed to update profile", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addEducation = () => {
    setEducation([...education, {
      id: Date.now(),
      institution: "",
      degree: "",
      fieldOfStudy: "",
      startYear: "",
      endYear: "",
      marks: ""
    }]);
  };

  const updateEducation = (id, field, value) => {
    setEducation(education.map(edu => 
      edu.id === id ? { ...edu, [field]: value } : edu
    ));
  };

  const deleteEducation = (id) => {
    setEducation(education.filter(edu => edu.id !== id));
  };

  const addExperience = () => {
    setExperience([...experience, {
      id: Date.now(),
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      description: "",
      isPresent: false
    }]);
  };

  const updateExperience = (id, field, value) => {
    setExperience(experience.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    ));
  };

  const deleteExperience = (id) => {
    setExperience(experience.filter(exp => exp.id !== id));
  };

  const handleVerifyClick = () => {
    onVerifyOpen();
  };

  const handleConfirmVerify = async () => {
    if (onVerify) {
      await onVerify();
    }
    onVerifyClose();
  };

  const handleDeleteClick = async () => {
    // Fetch lead count before showing delete modal
    if (employeeId) {
      setIsLoadingDeleteStats(true);
      try {
        const response = await axios.get(`admin/employees/${employeeId}/lead-stats`);
        const leadCount = response.data?.total || 0;
        setDeleteLeadCount(leadCount);
        
        // Only open the modal after we have the lead count
        onDeleteOpen();
      } catch (error) {
        console.error("Failed to fetch lead count for delete:", error);
        setDeleteLeadCount(0);
        // Open modal even on error
        onDeleteOpen();
      } finally {
        setIsLoadingDeleteStats(false);
      }
    } else {
      setDeleteLeadCount(0);
      onDeleteOpen();
    }
  };

  const handleConfirmDelete = async () => {
    if (onDelete) {
      await onDelete();
    }
    onDeleteClose();
  };

  const handleResetPasswordClick = () => {
    onResetPasswordOpen();
  };

  const handleConfirmResetPassword = async () => {
    if (onResetPassword) {
      await onResetPassword();
    }
    onResetPasswordClose();
  };

  const handleResetMFAClick = () => {
    onResetMFAOpen();
  };

  const handleConfirmResetMFA = async () => {
    if (onResetMFA) {
      await onResetMFA();
    }
    onResetMFAClose();
  };

  if (!profile) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 text-center shadow-lg border border-gray-100">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserCircleIcon className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Profile Submitted
        </h3>
        <p className="text-sm text-gray-600">
          {isAdmin ? "This user has not submitted their profile details yet." : "Please complete your profile to get started."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* ID Card Style Profile */}
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-200">
          {/* Header with gradient and pattern */}
          <div className="relative h-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute transform rotate-45 -right-20 top-0 w-40 h-40 bg-white rounded-full"></div>
              <div className="absolute transform -rotate-45 -left-20 bottom-0 w-40 h-40 bg-white rounded-full"></div>
            </div>
            <div className="absolute top-4 left-4 text-white">
              <p className="text-xs font-semibold opacity-90">
                {isAdmin ? "EMPLOYEE ID CARD" : "PROFILE CARD"}
              </p>
              <p className="text-2xl font-bold mt-1">Lead Rabbit</p>
            </div>
            {userVerified && (
              <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                <CheckBadgeIcon className="w-4 h-4" />
                VERIFIED
              </div>
            )}
          </div>

          {/* Card Body */}
          <div className="relative px-6 pb-6 pt-2">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Photo Section */}
              <div className="flex flex-col items-center md:items-start -mt-16 z-10">
                <div className="relative">
                  {photoPreview ? (
                    <Avatar
                      src={photoPreview}
                      className="w-32 h-32 border-4 border-white shadow-2xl"
                      radius="lg"
                    />
                  ) : (
                    <div className="w-32 h-32 border-4 border-white shadow-2xl rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      <UserIcon className="w-16 h-16 text-blue-400" />
                    </div>
                  )}
                  {userVerified && (
                    <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-2 border-4 border-white shadow-lg">
                      <CheckBadgeIcon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  {/* Photo Upload Button - Only in Edit Mode - Bottom Left */}
                  {isEditMode && (
                    <>
                      <label
                        htmlFor="profilePhotoUpload"
                        className="absolute bottom-0 left-0 p-2 bg-blue-600 rounded-full cursor-pointer shadow-lg hover:bg-blue-700 transition-colors border-2 border-white"
                      >
                        <CameraIcon className="w-4 h-4 text-white" />
                      </label>
                      <input
                        id="profilePhotoUpload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Details Section */}
              <div className="flex-1 space-y-4 pt-4 md:pt-0">
                {/* Name and Role */}
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                    {isEditMode ? (editData.fullName || user?.name || "—") : (profile.fullName || user?.name || "—")}
                  </h2>
                  <div className="flex items-center gap-2">
                    <Chip
                      size="sm"
                      variant="flat"
                      color="secondary"
                      className="font-semibold uppercase text-xs"
                    >
                      {user?.role || "Employee"}
                    </Chip>
                    {!userVerified && (
                      <Chip
                        size="sm"
                        variant="flat"
                        color="warning"
                        className="font-semibold text-xs"
                      >
                        Pending Verification
                      </Chip>
                    )}
                  </div>
                </div>

                {/* Contact Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <EnvelopeIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-medium">Email Address</p>
                      {isEditMode && isAdmin ? (
                        <Input
                          value={editData.email || ""}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          variant="bordered"
                          size="sm"
                          type="email"
                          classNames={{
                            input: "text-sm font-medium",
                            inputWrapper: "border-blue-300 bg-white",
                          }}
                        />
                      ) : (
                        <p className="text-sm text-gray-900 font-medium truncate">{user?.email ?? "—"}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <PhoneIcon className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 font-medium">Phone Number</p>
                      <p className="text-sm text-gray-900 font-medium">
                        {isEditMode ? (editData.mobileNumber || "Not provided") : (profile.mobileNumber || "Not provided")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">
                      {[profile.aadhaarFile, profile.panFile].filter(Boolean).length}
                    </div>
                    <p className="text-xs text-gray-600 font-medium mt-1">Documents</p>
                  </div>
                  <div className="text-center border-x border-blue-200">
                    <div className="text-xl font-bold text-indigo-600">
                      {Object.values({
                        fullName: profile.fullName,
                        dateOfBirth: profile.dateOfBirth,
                        gender: profile.gender,
                        mobileNumber: profile.mobileNumber,
                        currentAddress: profile.currentAddress,
                        permanentAddress: profile.permanentAddress,
                        highestQualification: profile.highestQualification,
                        aadhaarNumber: profile.aadhaarNumber,
                        panNumber: profile.panNumber,
                      }).filter((val) => val && val !== "").length}
                    </div>
                    <p className="text-xs text-gray-600 font-medium mt-1">Complete</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-purple-600">
                      {Math.round(
                        (Object.values({
                          fullName: profile.fullName,
                          dateOfBirth: profile.dateOfBirth,
                          gender: profile.gender,
                          mobileNumber: profile.mobileNumber,
                          currentAddress: profile.currentAddress,
                          permanentAddress: profile.permanentAddress,
                          highestQualification: profile.highestQualification,
                          aadhaarNumber: profile.aadhaarNumber,
                          panNumber: profile.panNumber,
                        }).filter((val) => val && val !== "").length /
                          9) *
                          100
                      )}
                      %
                    </div>
                    <p className="text-xs text-gray-600 font-medium mt-1">Progress</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {isEditMode ? (
                    <div className="flex gap-3">
                      <Button
                        size="lg"
                        variant="flat"
                        className="flex-1 font-semibold"
                        onPress={handleCancelEdit}
                        startContent={<XMarkIcon className="w-5 h-5" />}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="lg"
                        isLoading={isSaving}
                        className="flex-1 font-semibold text-white shadow-lg bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600"
                        onPress={handleSaveChanges}
                        startContent={!isSaving && <CheckBadgeIcon className="w-5 h-5" />}
                      >
                        Save Changes
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-3">
                        <Button
                          size="lg"
                          className="flex-1 font-semibold text-white shadow-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600"
                          onPress={handleEditMode}
                          startContent={<PencilIcon className="w-5 h-5" />}
                        >
                          Edit Profile
                        </Button>
                        {isAdmin && (
                          <Button
                            size="lg"
                            className={`flex-1 font-semibold text-white shadow-lg ${ 
                              userVerified
                                ? "bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600"
                                : "bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600"
                            }`}
                            onPress={handleVerifyClick}
                            startContent={<CheckBadgeIcon className="w-5 h-5" />}
                          >
                            {userVerified ? "Unverify" : "Verify"}
                          </Button>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            size="md"
                            variant="flat"
                            color="warning"
                            className="font-semibold"
                            onPress={handleResetPasswordClick}
                            startContent={<KeyIcon className="w-4 h-4" />}
                          >
                            Reset Pass
                          </Button>
                          <Button
                            size="md"
                            variant="flat"
                            color="warning"
                            className="font-semibold"
                            onPress={handleResetMFAClick}
                            startContent={<ShieldExclamationIcon className="w-4 h-4" />}
                          >
                            Reset MFA
                          </Button>
                          <Button
                            size="md"
                            variant="flat"
                            color="danger"
                            className="font-semibold"
                            onPress={handleDeleteClick}
                            startContent={<TrashIcon className="w-4 h-4" />}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {profile.verifiedAt && (
                  <div className="flex items-center gap-2 text-xs text-green-600 font-medium">
                    <CalendarDaysIcon className="w-4 h-4" />
                    Verified on{" "}
                    {new Date(profile.verifiedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lead Statistics Section */}
        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg border border-indigo-100">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <ChartPieIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Lead Statistics</h3>
            </div>

            {isLoadingStats ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" color="secondary" />
              </div>
            ) : leadStats ? (
              <div className="space-y-6">
                {/* Total Leads */}
                <div className="bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-4 sm:p-6 border border-indigo-200">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">Total Leads Assigned</p>
                    <p className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {leadStats.total || 0}
                    </p>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white/80 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 border border-blue-200 hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2 sm:mb-3">
                        <span className="text-xl sm:text-2xl">🆕</span>
                      </div>
                      <p className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1">{leadStats.new || 0}</p>
                      <p className="text-xs font-semibold text-gray-600 uppercase">New</p>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-green-200 hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                        <span className="text-2xl">👍</span>
                      </div>
                      <p className="text-3xl font-bold text-green-600 mb-1">{leadStats.interested || 0}</p>
                      <p className="text-xs font-semibold text-gray-600 uppercase">Interested</p>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-red-200 hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                        <span className="text-2xl">👎</span>
                      </div>
                      <p className="text-3xl font-bold text-red-600 mb-1">{leadStats.notInterested || 0}</p>
                      <p className="text-xs font-semibold text-gray-600 uppercase">Not Interested</p>
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-amber-200 hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                        <span className="text-2xl">🤝</span>
                      </div>
                      <p className="text-3xl font-bold text-amber-600 mb-1">{leadStats.deal || 0}</p>
                      <p className="text-xs font-semibold text-gray-600 uppercase">Deal</p>
                    </div>
                  </div>
                </div>

                {/* Visual Pie Chart Representation */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-indigo-200">
                  <p className="text-sm font-semibold text-gray-700 mb-4 text-center">Status Distribution</p>
                  <div className="flex items-center justify-center mb-4">
                    <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
                      {(() => {
                        const total = leadStats.total || 1;
                        const newPercent = ((leadStats.new || 0) / total) * 100;
                        const interestedPercent = ((leadStats.interested || 0) / total) * 100;
                        const notInterestedPercent = ((leadStats.notInterested || 0) / total) * 100;
                        const dealPercent = ((leadStats.deal || 0) / total) * 100;
                        
                        const radius = 80;
                        const circumference = 2 * Math.PI * radius;
                        
                        let currentOffset = 0;
                        const segments = [];
                        
                        const colors = [
                          { percent: newPercent, color: '#3b82f6' },
                          { percent: interestedPercent, color: '#10b981' },
                          { percent: notInterestedPercent, color: '#ef4444' },
                          { percent: dealPercent, color: '#f59e0b' }
                        ];
                        
                        colors.forEach((seg, idx) => {
                          if (seg.percent > 0) {
                            const strokeLength = (seg.percent / 100) * circumference;
                            segments.push(
                              <circle
                                key={idx}
                                cx="100"
                                cy="100"
                                r={radius}
                                fill="none"
                                stroke={seg.color}
                                strokeWidth="40"
                                strokeDasharray={`${strokeLength} ${circumference}`}
                                strokeDashoffset={-currentOffset}
                              />
                            );
                            currentOffset += strokeLength;
                          }
                        });
                        
                        return segments;
                      })()}
                    </svg>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                      <span className="text-sm text-gray-700">New ({leadStats.new || 0})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-green-500"></div>
                      <span className="text-sm text-gray-700">Interested ({leadStats.interested || 0})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-red-500"></div>
                      <span className="text-sm text-gray-700">Not Interested ({leadStats.notInterested || 0})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                      <span className="text-sm text-gray-700">Deal ({leadStats.deal || 0})</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No lead statistics available</p>
              </div>
            )}
        </div>

        {/* Personal Information */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-emerald-100">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
              <UserCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-gray-800">Personal Information</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Full Name */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-emerald-200/50">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                Full Name
              </label>
              {isEditMode ? (
                <Input
                  value={editData.fullName || ""}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  variant="bordered"
                  size="sm"
                  classNames={{
                    input: "text-base font-medium",
                    inputWrapper: "border-emerald-300",
                  }}
                />
              ) : (
                <p className="text-base font-medium text-gray-900">{profile.fullName || "—"}</p>
              )}
            </div>

            {/* Mobile Number */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-emerald-200/50">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                Mobile Number
              </label>
              {isEditMode ? (
                <Input
                  value={editData.mobileNumber || ""}
                  onChange={(e) => handleInputChange("mobileNumber", e.target.value)}
                  variant="bordered"
                  size="sm"
                  type="tel"
                  classNames={{
                    input: "text-base font-medium",
                    inputWrapper: "border-emerald-300",
                  }}
                />
              ) : (
                <p className="text-base font-medium text-gray-900">{profile.mobileNumber || "—"}</p>
              )}
            </div>

            {/* Gender */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-emerald-200/50">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                Gender
              </label>
              {isEditMode ? (
                <Select
                  selectedKeys={editData.gender ? [editData.gender] : []}
                  onSelectionChange={(keys) => handleInputChange("gender", Array.from(keys)[0] || "")}
                  variant="bordered"
                  size="sm"
                  classNames={{
                    trigger: "border-emerald-300",
                  }}
                >
                  <SelectItem key="male">Male</SelectItem>
                  <SelectItem key="female">Female</SelectItem>
                  <SelectItem key="other">Other</SelectItem>
                </Select>
              ) : (
                <p className="text-base font-medium text-gray-900 capitalize">{profile.gender || "—"}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-emerald-200/50">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                Date of Birth
              </label>
              {isEditMode ? (
                <DatePicker
                  value={editData.dateOfBirth ? parseDate(editData.dateOfBirth) : null}
                  onChange={(date) => handleInputChange("dateOfBirth", date ? date.toString() : "")}
                  variant="bordered"
                  size="sm"
                  showMonthAndYearPickers
                  classNames={{
                    selectorButton: "border-emerald-300",
                  }}
                />
              ) : (
                <p className="text-base font-medium text-gray-900">{profile.dateOfBirth || "—"}</p>
              )}
            </div>

            {/* Highest Qualification */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-emerald-200/50 md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-2">
                <AcademicCapIcon className="w-4 h-4 text-emerald-600" />
                Highest Qualification
              </label>
              {isEditMode ? (
                <Select
                  selectedKeys={editData.highestQualification ? [editData.highestQualification] : []}
                  onSelectionChange={(keys) =>
                    handleInputChange("highestQualification", Array.from(keys)[0] || "")
                  }
                  variant="bordered"
                  size="sm"
                  classNames={{
                    trigger: "border-emerald-300",
                  }}
                >
                  <SelectItem key="10th">10th</SelectItem>
                  <SelectItem key="puc">PUC</SelectItem>
                  <SelectItem key="degree">Degree</SelectItem>
                  <SelectItem key="post graduation">Post Graduation</SelectItem>
                </Select>
              ) : (
                <p className="text-base font-medium text-gray-900 capitalize">
                  {profile.highestQualification || "—"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-violet-100">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
              <MapPinIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-gray-800">Address Information</span>
          </h3>
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-violet-200/50">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                Current Address
              </label>
              {isEditMode ? (
                <Textarea
                  value={editData.currentAddress || ""}
                  onChange={(e) => handleInputChange("currentAddress", e.target.value)}
                  variant="bordered"
                  size="sm"
                  minRows={2}
                  classNames={{
                    input: "text-sm",
                    inputWrapper: "border-violet-300",
                  }}
                />
              ) : (
                <p className="text-sm text-gray-900 leading-relaxed">
                  {profile.currentAddress || "Not provided"}
                </p>
              )}
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-violet-200/50">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                Permanent Address
              </label>
              {isEditMode ? (
                <Textarea
                  value={editData.permanentAddress || ""}
                  onChange={(e) => handleInputChange("permanentAddress", e.target.value)}
                  variant="bordered"
                  size="sm"
                  minRows={2}
                  classNames={{
                    input: "text-sm",
                    inputWrapper: "border-violet-300",
                  }}
                />
              ) : (
                <p className="text-sm text-gray-900 leading-relaxed">
                  {profile.permanentAddress || "Not provided"}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-amber-100">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg">
              <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-gray-800">Identity Documents</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Aadhaar Card */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-amber-200/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                  <IdentificationIcon className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-base font-semibold text-gray-900">Aadhaar Card</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                    Number
                  </span>
                  {isEditMode ? (
                    <Input
                      value={editData.aadhaarNumber || ""}
                      onChange={(e) => handleInputChange("aadhaarNumber", e.target.value)}
                      variant="bordered"
                      size="sm"
                      placeholder="XXXX-XXXX-XXXX"
                      classNames={{
                        input: "text-sm font-medium",
                        inputWrapper: "border-amber-300",
                      }}
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {profile.aadhaarNumber || "—"}
                    </p>
                  )}
                </div>
                {(aadhaarUrl || editData.aadhaarFile) && (
                  <Button
                    size="md"
                    variant="flat"
                    color="warning"
                    className="w-full font-semibold"
                    onPress={() => openFileInNewTab(editData.aadhaarFile || profile?.aadhaarFile)}
                    startContent={<DocumentTextIcon className="w-4 h-4" />}
                  >
                    View Document
                  </Button>
                )}
                {isEditMode && (
                  <>
                    <label
                      htmlFor="aadhaarUpload"
                      className="w-full cursor-pointer"
                    >
                      <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-amber-300 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-colors">
                        <CameraIcon className="w-5 h-5 text-amber-600" />
                        <span className="text-sm text-amber-700 font-medium">
                          {editData.aadhaarFile || profile?.aadhaarFile ? "Change Document" : "Upload Aadhaar"}
                        </span>
                      </div>
                    </label>
                    <input
                      id="aadhaarUpload"
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handleAadhaarUpload}
                    />
                  </>
                )}
              </div>
            </div>

            {/* PAN Card */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-amber-200/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center">
                  <IdentificationIcon className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-base font-semibold text-gray-900">PAN Card</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
                    Number
                  </span>
                  {isEditMode ? (
                    <Input
                      value={editData.panNumber || ""}
                      onChange={(e) => handleInputChange("panNumber", e.target.value)}
                      variant="bordered"
                      size="sm"
                      placeholder="ABCDE1234F"
                      classNames={{
                        input: "text-sm font-medium",
                        inputWrapper: "border-amber-300",
                      }}
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1">{profile.panNumber || "—"}</p>
                  )}
                </div>
                {(panUrl || editData.panFile) && (
                  <Button
                    size="md"
                    variant="flat"
                    color="primary"
                    className="w-full font-semibold"
                    onPress={() => openFileInNewTab(editData.panFile || profile?.panFile)}
                    startContent={<DocumentTextIcon className="w-4 h-4" />}
                  >
                    View Document
                  </Button>
                )}
                {isEditMode && (
                  <>
                    <label
                      htmlFor="panUpload"
                      className="w-full cursor-pointer"
                    >
                      <div className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                        <CameraIcon className="w-5 h-5 text-blue-600" />
                        <span className="text-sm text-blue-700 font-medium">
                          {editData.panFile || profile?.panFile ? "Change Document" : "Upload PAN"}
                        </span>
                      </div>
                    </label>
                    <input
                      id="panUpload"
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={handlePanUpload}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Education Section */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                <AcademicCapIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Education</h3>
            </div>
            {isEditMode && (
              <Button
                size="sm"
                color="success"
                variant="flat"
                onPress={addEducation}
                startContent={<PlusIcon className="w-4 h-4" />}
              >
                Add Education
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {education.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No education details added yet</p>
            ) : (
              education.map((edu) => (
                <div key={edu.id} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
                  {isEditMode ? (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          isIconOnly
                          onPress={() => deleteEducation(edu.id)}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Institution/School"
                          value={edu.institution || ""}
                          onChange={(e) => updateEducation(edu.id, "institution", e.target.value)}
                          variant="bordered"
                          size="sm"
                        />
                        <Input
                          label="Degree/Course"
                          value={edu.degree || ""}
                          onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                          variant="bordered"
                          size="sm"
                        />
                        <Input
                          label="Field of Study"
                          value={edu.fieldOfStudy || ""}
                          onChange={(e) => updateEducation(edu.id, "fieldOfStudy", e.target.value)}
                          variant="bordered"
                          size="sm"
                        />
                        <Input
                          label="Marks/CGPA/Percentage"
                          value={edu.marks || ""}
                          onChange={(e) => updateEducation(edu.id, "marks", e.target.value)}
                          variant="bordered"
                          size="sm"
                        />
                        <DatePicker
                          label="Start Date"
                          value={edu.startYear ? parseDate(edu.startYear.includes('-') ? edu.startYear + '-01' : edu.startYear + '-01-01') : null}
                          onChange={(date) => updateEducation(edu.id, "startYear", date ? `${date.year}-${String(date.month).padStart(2, '0')}` : "")}
                          variant="bordered"
                          size="sm"
                          granularity="month"
                          showMonthAndYearPickers
                        />
                        <DatePicker
                          label="End Date"
                          value={edu.endYear ? parseDate(edu.endYear.includes('-') ? edu.endYear + '-01' : edu.endYear + '-01-01') : null}
                          onChange={(date) => updateEducation(edu.id, "endYear", date ? `${date.year}-${String(date.month).padStart(2, '0')}` : "")}
                          variant="bordered"
                          size="sm"
                          granularity="month"
                          showMonthAndYearPickers
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="text-lg font-semibold text-gray-900">{edu.degree || "—"}</h4>
                      <p className="text-base font-medium text-purple-700">{edu.institution || "—"}</p>
                      {edu.fieldOfStudy && (
                        <p className="text-sm text-gray-600">Field: {edu.fieldOfStudy}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{edu.startYear || "—"} - {edu.endYear || "—"}</span>
                        {edu.marks && <span className="font-medium">• {edu.marks}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Experience Section */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-lg flex items-center justify-center">
                <BriefcaseIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Experience</h3>
            </div>
            {isEditMode && (
              <Button
                size="sm"
                color="success"
                variant="flat"
                onPress={addExperience}
                startContent={<PlusIcon className="w-4 h-4" />}
              >
                Add Experience
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {experience.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No experience details added yet</p>
            ) : (
              experience.map((exp) => (
                <div key={exp.id} className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200">
                  {isEditMode ? (
                    <div className="space-y-4">
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          isIconOnly
                          onPress={() => deleteExperience(exp.id)}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Company Name"
                          value={exp.company || ""}
                          onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                          variant="bordered"
                          size="sm"
                        />
                        <Input
                          label="Position/Job Title"
                          value={exp.position || ""}
                          onChange={(e) => updateExperience(exp.id, "position", e.target.value)}
                          variant="bordered"
                          size="sm"
                        />
                        <DatePicker
                          label="Start Date"
                          value={exp.startDate ? parseDate(exp.startDate + "-01") : null}
                          onChange={(date) => updateExperience(exp.id, "startDate", date ? `${date.year}-${String(date.month).padStart(2, '0')}` : "")}
                          variant="bordered"
                          size="sm"
                          granularity="month"
                          showMonthAndYearPickers
                        />
                        <DatePicker
                          label="End Date"
                          value={exp.endDate ? parseDate(exp.endDate + "-01") : null}
                          onChange={(date) => updateExperience(exp.id, "endDate", date ? `${date.year}-${String(date.month).padStart(2, '0')}` : "")}
                          variant="bordered"
                          size="sm"
                          granularity="month"
                          showMonthAndYearPickers
                          isDisabled={exp.isPresent}
                        />
                        <div className="col-span-2">
                          <Checkbox
                            isSelected={exp.isPresent || false}
                            onValueChange={(checked) => updateExperience(exp.id, "isPresent", checked)}
                            size="sm"
                          >
                            Currently working here
                          </Checkbox>
                        </div>
                        <div className="col-span-2">
                          <Textarea
                            label="Description"
                            value={exp.description || ""}
                            onChange={(e) => updateExperience(exp.id, "description", e.target.value)}
                            variant="bordered"
                            size="sm"
                            minRows={3}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="text-lg font-semibold text-gray-900">{exp.position || "—"}</h4>
                      <p className="text-base font-medium text-blue-700">{exp.company || "—"}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <CalendarDaysIcon className="w-4 h-4" />
                        <span>
                          {exp.startDate || "—"} - {exp.isPresent ? "Present" : exp.endDate || "—"}
                        </span>
                      </div>
                      {exp.description && (
                        <p className="text-sm text-gray-700 mt-2">{exp.description}</p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Verification Confirmation Modal */}
      {isAdmin && (
        <Modal isOpen={isVerifyOpen} onClose={onVerifyClose} size="md">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        userVerified ? "bg-yellow-100" : "bg-green-100"
                      }`}
                    >
                      <CheckBadgeIcon
                        className={`w-6 h-6 ${
                          userVerified ? "text-yellow-600" : "text-green-600"
                        }`}
                      />
                    </div>
                    <span>{userVerified ? "Unverify Employee" : "Verify Employee"}</span>
                  </div>
                </ModalHeader>
                <ModalBody>
                  <div className="space-y-4">
                    <p className="text-gray-700">
                      {userVerified
                        ? `Are you sure you want to unverify ${
                            profile?.fullName || user?.name || "this employee"
                          }? This will remove their verification status.`
                        : `Are you sure you want to verify ${
                            profile?.fullName || user?.name || "this employee"
                          }? This will mark their profile as verified.`}
                    </p>
                    {!userVerified && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Note:</strong> Please ensure all documents and information have
                          been reviewed before verifying.
                        </p>
                      </div>
                    )}
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    Cancel
                  </Button>
                  <Button
                    color={userVerified ? "warning" : "success"}
                    onPress={handleConfirmVerify}
                    startContent={<CheckBadgeIcon className="w-4 h-4" />}
                  >
                    {userVerified ? "Unverify" : "Verify"}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      {/* Enhanced Delete Confirmation Modal */}
      {isAdmin && (
        <Modal isOpen={isDeleteOpen} onClose={onDeleteClose} size="lg">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-red-100">
                      <TrashIcon className="w-6 h-6 text-red-600" />
                    </div>
                    <span>Delete Employee</span>
                  </div>
                </ModalHeader>
                <ModalBody>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-red-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 font-medium">
                          Are you sure you want to delete{" "}
                          <span className="font-semibold">
                            {profile?.fullName || user?.name || "this employee"}
                          </span>
                          ?
                        </p>
                        
                        {isLoadingDeleteStats ? (
                          <div className="mt-2 flex items-center space-x-2">
                            <Spinner size="sm" />
                            <span className="text-sm text-gray-500">Checking assigned leads...</span>
                          </div>
                        ) : (
                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                            {deleteLeadCount > 0 ? (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <UserIcon className="w-4 h-4 text-amber-600" />
                                  <span className="text-sm font-medium text-amber-800">
                                    This employee has {deleteLeadCount} lead{deleteLeadCount !== 1 ? 's' : ''} assigned
                                  </span>
                                </div>
                                <p className="text-sm text-amber-700">
                                  <strong>Important:</strong> These leads will be automatically unassigned and kept in the system, but you may want to reassign them to another employee first to maintain continuity.
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <CheckBadgeIcon className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-green-800">
                                  No leads are currently assigned to this employee.
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <p className="mt-3 text-xs text-gray-500">
                          This action cannot be undone. The employee account will be permanently removed.
                        </p>
                      </div>
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    Cancel
                  </Button>
                  <Button
                    color="danger"
                    onPress={handleConfirmDelete}
                    className={deleteLeadCount > 0 ? "bg-red-600 hover:bg-red-700" : ""}
                  >
                    {deleteLeadCount > 0 ? `Delete Despite ${deleteLeadCount} Assigned Lead${deleteLeadCount !== 1 ? 's' : ''}` : 'Delete Employee'}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {isAdmin && (
        <Modal isOpen={isResetPasswordOpen} onClose={onResetPasswordClose} size="md">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-100">
                      <KeyIcon className="w-6 h-6 text-amber-600" />
                    </div>
                    <span>Reset Password</span>
                  </div>
                </ModalHeader>
                <ModalBody>
                  <p className="text-gray-700">
                    Are you sure you want to reset the password for{" "}
                    {profile?.fullName || user?.name || "this employee"}? A new temporary password
                    will be generated and sent to their email.
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    Cancel
                  </Button>
                  <Button
                    color="warning"
                    onPress={handleConfirmResetPassword}
                    startContent={<KeyIcon className="w-4 h-4" />}
                  >
                    Reset Password
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      {/* Reset MFA Modal */}
      {isAdmin && (
        <Modal isOpen={isResetMFAOpen} onClose={onResetMFAClose} size="md">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-100">
                      <ShieldExclamationIcon className="w-6 h-6 text-amber-600" />
                    </div>
                    <span>Reset MFA</span>
                  </div>
                </ModalHeader>
                <ModalBody>
                  <p className="text-gray-700">
                    Are you sure you want to reset the Multi-Factor Authentication for{" "}
                    {profile?.fullName || user?.name || "this employee"}? They will need to set up
                    MFA again on their next login.
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    Cancel
                  </Button>
                  <Button
                    color="warning"
                    onPress={handleConfirmResetMFA}
                    startContent={<ShieldExclamationIcon className="w-4 h-4" />}
                  >
                    Reset MFA
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
    </>
  );
}
