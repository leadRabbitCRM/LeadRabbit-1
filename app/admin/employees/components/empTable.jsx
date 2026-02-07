"use client";

import React from "react";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  Chip,
  Pagination,
  useDisclosure,
  Avatar,
  addToast,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Spinner,
} from "@heroui/react";
import {
  Autocomplete,
  AutocompleteSection,
  AutocompleteItem,
} from "@heroui/autocomplete";
import {
  CheckBadgeIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/solid";
import CustomModal from "./CustomModal";
import EmployeeEditModal from "./EmployeeEditModal";

export const columns = [
  { name: "ID", uid: "id", sortable: true },
  { name: "NAME", uid: "name", sortable: true },
  { name: "ROLE", uid: "role", sortable: true },
  { name: "EMAIL", uid: "email" },
  { name: "VERIFIED", uid: "verified", sortable: true },
  { name: "STATUS", uid: "status", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];

export const statusOptions = [
  { name: "Active", uid: "active" },
  { name: "Inactive", uid: "inactive" },
];

const parseBooleanFlag = (value) => {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return normalized === "true" || normalized === "1";
  }

  return false;
};

export function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "";
}

export const PlusIcon = ({ size = 24, width, height, ...props }) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height={size || height}
      role="presentation"
      viewBox="0 0 24 24"
      width={size || width}
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      >
        <path d="M6 12h12" />
        <path d="M12 18V6" />
      </g>
    </svg>
  );
};

export const VerticalDotsIcon = ({ size = 24, width, height, ...props }) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height={size || height}
      role="presentation"
      viewBox="0 0 24 24"
      width={size || width}
      {...props}
    >
      <path
        d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
        fill="currentColor"
      />
    </svg>
  );
};

export const SearchIcon = (props) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...props}
    >
      <path
        d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M22 22L20 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
};

export const ChevronDownIcon = ({ strokeWidth = 1.5, ...otherProps }) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...otherProps}
    >
      <path
        d="m19.92 8.95-6.52 6.52c-.77.77-2.03.77-2.8 0L4.08 8.95"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};

const statusColorMap = {
  active: "success",
  inactive: "danger",
};

const INITIAL_VISIBLE_COLUMNS = ["name", "role", "status", "actions"];

export default function EmpTable() {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [users, setUsers] = React.useState([]);
  const [currentUserEmail, setCurrentUserEmail] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fetchError, setFetchError] = React.useState(null);
  const [filterValue, setFilterValue] = React.useState("");
  const [selectedKeys, setSelectedKeys] = React.useState(new Set([]));
  const [visibleColumns, setVisibleColumns] = React.useState(
    new Set(INITIAL_VISIBLE_COLUMNS),
  );
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [sortDescriptor, setSortDescriptor] = React.useState({
    column: "name",
    direction: "ascending",
  });
  const [page, setPage] = React.useState(1);
  const {
    isOpen: isAddModalOpen,
    onOpen: onAddModalOpen,
    onOpenChange: onAddModalOpenChange,
  } = useDisclosure();
  const [editEmployee, setEditEmployee] = React.useState(null);
  const [isEditLoading, setIsEditLoading] = React.useState(false);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteLeadCount, setDeleteLeadCount] = React.useState(0);
  const [isLoadingLeadCount, setIsLoadingLeadCount] = React.useState(false);
  const [verifyTarget, setVerifyTarget] = React.useState(null);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [confirmAction, setConfirmAction] = React.useState(null);
  const {
    isOpen: isEditModalOpen,
    onOpen: onEditModalOpen,
    onOpenChange: onEditModalOpenChange,
  } = useDisclosure();
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onOpenChange: onDeleteModalOpenChange,
  } = useDisclosure();
  const {
    isOpen: isConfirmModalOpen,
    onOpen: onConfirmModalOpen,
    onOpenChange: onConfirmModalOpenChange,
  } = useDisclosure();

  // Mark hydration as complete
  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Fetch current logged-in user's email (for self-delete prevention)
  React.useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await axios.get("me");
        const email = response.data?.email;
        console.log("✅ Current logged-in user email fetched:", email);
        setCurrentUserEmail(email);
      } catch (error) {
        console.error("❌ Error fetching current user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await axios.get("admin/addUser");
      const fetchedUsers = response.data?.users ?? [];

      const normalized = fetchedUsers.map((user, index) => {
        const isOnline = parseBooleanFlag(user.isOnline);
        const rawStatus = user.status?.toString().trim().toLowerCase();
        const normalizedStatus = isOnline
          ? "active"
          : rawStatus === "active"
            ? "active"
            : "inactive";
        const fallbackSeed = user.name ?? user.email ?? `User-${index}`;
        const avatarSrc =
          user.avatar ??
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackSeed)}`;

        return {
          id: user._id?.toString() ?? user.id ?? String(index),
          name: user.name ?? "Unknown",
          role: user.role ?? "—",
          email: user.email ?? "—",
          status: normalizedStatus,
          avatar: avatarSrc,
          isOnline,
          isVerified: parseBooleanFlag(user.isVerified),
          createdAt: user.createdAt ?? null,
        };
      });

      setUsers(normalized);
    } catch (error) {
      console.error("Error fetching users", error);
      setUsers([]);
      setFetchError("Unable to load users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleViewProfile = React.useCallback(
    (user) => {
      if (!user?.id) return;
      router.push(`/admin/employees/${user.id}`);
    },
    [router],
  );

  const handleVerifyEmployee = React.useCallback(
    (user) => {
      if (!user?.id) return;
      const isVerified = parseBooleanFlag(user.isVerified);

      setConfirmAction({
        type: isVerified ? "unverify" : "verify",
        user: user,
        title: isVerified ? "Unverify Employee" : "Verify Employee",
        message: isVerified
          ? `Are you sure you want to unverify ${user.name}? This will remove their verification status.`
          : `Are you sure you want to verify ${user.name}? This will mark their profile as verified.`,
        confirmText: isVerified ? "Unverify" : "Verify",
        action: () => performVerification(user.id, !isVerified),
      });
      onConfirmModalOpen();
    },
    [onConfirmModalOpen],
  );

  const performVerification = React.useCallback(
    async (userId, shouldVerify) => {
      setIsVerifying(true);
      try {
        console.log(`🔄 Attempting to ${shouldVerify ? "verify" : "unverify"} user ${userId}`);
        const response = await axios.put(`admin/employees/${userId}`, {
          action: shouldVerify ? "verify" : "unverify",
        });

        console.log(`✅ Response received:`, response.status, response.data);

        if (response.status === 200 || response.status === 201) {
          addToast({
            title: shouldVerify ? "✅ Employee Verified" : "❌ Employee Unverified",
            description: shouldVerify
              ? "Profile verification completed successfully. Employee is now verified."
              : "Profile verification has been removed. Employee is no longer verified.",
            color: shouldVerify ? "success" : "warning",
          });

          setUsers((prev) =>
            prev.map((item) =>
              item.id === userId
                ? {
                    ...item,
                    isVerified: shouldVerify,
                  }
                : item,
            ),
          );
        }
      } catch (error) {
        console.error("❌ Failed to update verification status");
        console.error("Error object:", error);
        console.error("Error response status:", error?.response?.status);
        console.error("Error response data:", error?.response?.data);
        console.error("Error message:", error?.message);
        
        const errorMessage = 
          error?.response?.data?.error || 
          error?.response?.statusText ||
          error?.message || 
          "Unable to update verification status. Please try again. Check console for details.";
        
        addToast({
          title: "❌ Verification failed",
          description: errorMessage,
          color: "danger",
        });
      } finally {
        setIsVerifying(false);
        setConfirmAction(null);
        onConfirmModalOpenChange(false);
      }
    },
    [onConfirmModalOpenChange],
  );

  const handleOpenEdit = React.useCallback(
    (user) => {
      if (!user?.id) return;

      setConfirmAction({
        type: "edit",
        user: user,
        title: "Edit Employee Profile",
        message: `Are you sure you want to edit ${user.name}'s profile?`,
        confirmText: "Edit Profile",
        action: () => performEdit(user),
      });
      onConfirmModalOpen();
    },
    [onConfirmModalOpen],
  );

  const performEdit = React.useCallback(
    async (user) => {
      setIsEditLoading(true);
      setEditEmployee(null);
      setConfirmAction(null);
      onConfirmModalOpenChange(false);
      onEditModalOpen();

      try {
        const response = await axios.get(`admin/employees/${user.id}`);
        setEditEmployee(response.data);
      } catch (error) {
        console.error("Failed to load employee for editing", error);
        addToast({
          title: "Employee update",
          description: "Unable to load employee details.",
          color: "danger",
        });
        onEditModalOpenChange(false);
      } finally {
        setIsEditLoading(false);
      }
    },
    [
      onEditModalOpen,
      onEditModalOpenChange,
      onConfirmModalOpenChange,
      addToast,
    ],
  );

  const handleOpenDelete = React.useCallback(
    async (user) => {
      if (!user?.id) return;

      // First fetch the lead count for this employee
      setIsLoadingLeadCount(true);
      try {
        const response = await axios.get(`admin/employees/${user.id}/lead-stats`);
        const leadCount = response.data?.total || 0;
        setDeleteLeadCount(leadCount);
      } catch (error) {
        console.error("Failed to fetch lead count for employee:", error);
        setDeleteLeadCount(0);
      } finally {
        setIsLoadingLeadCount(false);
      }

      setDeleteTarget(user);
      onDeleteModalOpen();
    },
    [onDeleteModalOpen],
  );

  const handleSaveEdit = React.useCallback(
    async (updates) => {
      if (!editEmployee?.user?.id) return;

      setIsSavingEdit(true);
      try {
        const response = await axios.put(
          `admin/employees/${editEmployee.user.id}`,
          {
            action: "update",
            payload: updates,
          },
        );

        const updatedData = response.data;

        addToast({
          title: "Employee updated",
          description: "Profile changes saved successfully.",
          color: "success",
        });

        setUsers((prev) =>
          prev.map((item) =>
            item.id === updatedData.user.id
              ? {
                  ...item,
                  name: updatedData.user.name ?? item.name,
                  email: updatedData.user.email ?? item.email,
                }
              : item,
          ),
        );

        setEditEmployee(updatedData);

        // Close the modal after successful update
        onEditModalOpenChange();
        setEditEmployee(null);
      } catch (error) {
        console.error("Failed to update employee", error);
        const message =
          error?.response?.data?.error ?? "Unable to update employee.";
        addToast({
          title: "Update failed",
          description: message,
          color: "danger",
        });
      } finally {
        setIsSavingEdit(false);
      }
    },
    [editEmployee, onEditModalOpenChange, addToast],
  );

  const handleConfirmDelete = React.useCallback(async () => {
    if (!deleteTarget?.id) return;

    setIsDeleting(true);
    try {
      await axios.delete(`admin/employees/${deleteTarget.id}`);

      addToast({
        title: "Employee removed",
        description: "The employee profile has been deleted.",
        color: "success",
      });

      setUsers((prev) => prev.filter((item) => item.id !== deleteTarget.id));

      onDeleteModalOpenChange(false);
      setDeleteTarget(null);
      setDeleteLeadCount(0);
    } catch (error) {
      console.error("Failed to delete employee", error);
      const message =
        error?.response?.data?.error ?? "Unable to delete employee.";
      addToast({
        title: "Delete failed",
        description: message,
        color: "danger",
      });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, onDeleteModalOpenChange]);

  const handleResetPassword = React.useCallback(
    (user) => {
      if (!user?.id) return;
      setConfirmAction({
        type: "resetPassword",
        user: user,
        title: "Reset Password",
        message: `Are you sure you want to reset the password for ${user.name}? They will need to set a new password on their next login.`,
        confirmText: "Reset Password",
        action: () => performResetPassword(user.id),
      });
      onConfirmModalOpen();
    },
    [onConfirmModalOpen],
  );

  const performResetPassword = React.useCallback(
    async (userId) => {
      setIsVerifying(true);
      try {
        const response = await axios.put(`admin/employees/${userId}`, {
          action: "resetPassword",
        });

        addToast({
          title: "✅ Password Reset",
          description: `Password has been reset. Temporary password: ${response.data.tempPassword}`,
          color: "success",
        });
      } catch (error) {
        console.error("Failed to reset password", error);
        const message =
          error?.response?.data?.error ?? "Unable to reset password.";
        addToast({
          title: "Reset failed",
          description: message,
          color: "danger",
        });
      } finally {
        setIsVerifying(false);
        setConfirmAction(null);
        onConfirmModalOpenChange(false);
      }
    },
    [onConfirmModalOpenChange, addToast],
  );

  const handleResetMfa = React.useCallback(
    (user) => {
      if (!user?.id) return;
      setConfirmAction({
        type: "resetMfa",
        user: user,
        title: "Reset MFA",
        message: `Are you sure you want to reset MFA (Two-Factor Authentication) for ${user.name}? They will need to set up MFA again on their next login.`,
        confirmText: "Reset MFA",
        action: () => performResetMfa(user.id),
      });
      onConfirmModalOpen();
    },
    [onConfirmModalOpen],
  );

  const performResetMfa = React.useCallback(
    async (userId) => {
      setIsVerifying(true);
      try {
        await axios.put(`admin/employees/${userId}`, {
          action: "resetMfa",
        });

        addToast({
          title: "✅ MFA Reset",
          description: "MFA has been reset successfully.",
          color: "success",
        });
      } catch (error) {
        console.error("Failed to reset MFA", error);
        const message = error?.response?.data?.error ?? "Unable to reset MFA.";
        addToast({
          title: "Reset failed",
          description: message,
          color: "danger",
        });
      } finally {
        setIsVerifying(false);
        setConfirmAction(null);
        onConfirmModalOpenChange(false);
      }
    },
    [onConfirmModalOpenChange, addToast],
  );

  const hasSearchFilter = Boolean(filterValue);

  const headerColumns = React.useMemo(() => {
    if (visibleColumns === "all") return columns;

    return columns.filter((column) =>
      Array.from(visibleColumns).includes(column.uid),
    );
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    let filteredUsers = [...users];

    if (hasSearchFilter) {
      filteredUsers = filteredUsers.filter((user) =>
        user.name.toLowerCase().includes(filterValue.toLowerCase()),
      );
    }
    if (statusFilter !== "all") {
      const selectedSet =
        statusFilter instanceof Set ? statusFilter : new Set([statusFilter]);

      if (selectedSet.size !== statusOptions.length) {
        const selectedStatuses = Array.from(selectedSet).map((value) =>
          value.toString(),
        );
        filteredUsers = filteredUsers.filter((user) =>
          selectedStatuses.includes(user.status),
        );
      }
    }

    return filteredUsers;
  }, [users, filterValue, statusFilter]);

  const pages = Math.ceil(filteredItems.length / rowsPerPage) || 1;

  const items = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return filteredItems.slice(start, end);
  }, [page, filteredItems, rowsPerPage]);

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const first = a[sortDescriptor.column];
      const second = b[sortDescriptor.column];
      const cmp = first < second ? -1 : first > second ? 1 : 0;

      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [sortDescriptor, items]);

  const renderCell = React.useCallback(
    (user, columnKey) => {
      const cellValue = user[columnKey];

      switch (columnKey) {
        case "name":
          return (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar
                  radius="lg"
                  src={user.avatar || undefined}
                  className="ring-2 ring-white shadow-sm"
                />
                {user.isVerified && (
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 p-1 text-white shadow-lg ring-2 ring-white">
                    <CheckBadgeIcon className="h-3 w-3" />
                  </span>
                )}
                {user.isOnline && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">
                    {cellValue}
                  </span>
                  {user.isVerified && (
                    <CheckBadgeIcon className="h-4 w-4 text-blue-500" />
                  )}
                </div>
                <span className="text-xs text-gray-500">{user.email}</span>
              </div>
            </div>
          );
        case "role":
          return (
            <Chip
              size="sm"
              variant="flat"
              color="secondary"
              className="capitalize font-semibold"
            >
              {cellValue || "Employee"}
            </Chip>
          );
        case "status":
          return (
            <Chip
              className="capitalize font-semibold"
              color={
                statusColorMap[cellValue?.toString().toLowerCase()] ?? "default"
              }
              size="sm"
              variant="solid"
            >
              {capitalize(cellValue)}
            </Chip>
          );
        case "verified":
          return (
            <div className="flex items-center justify-center">
              {user.isVerified ? (
                <Chip
                  startContent={<CheckBadgeIcon className="w-4 h-4" />}
                  variant="flat"
                  color="success"
                  size="sm"
                  className="font-semibold"
                >
                  Verified
                </Chip>
              ) : (
                <Chip
                  variant="flat"
                  color="default"
                  size="sm"
                  className="font-semibold"
                >
                  Not Verified
                </Chip>
              )}
            </div>
          );
        case "actions":
          return (
            <div className="relative flex justify-end items-center gap-2">
              <Dropdown>
                <DropdownTrigger>
                  <Button 
                    isIconOnly 
                    size="sm" 
                    variant="light"
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <VerticalDotsIcon className="w-5 h-5" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu aria-label="User actions">
                  <DropdownItem
                    key="view"
                    onPress={() => handleViewProfile(user)}
                    startContent={<UserIcon className="w-5 h-5" />}
                    className="py-2"
                  >
                    View Profile
                  </DropdownItem>
                  <DropdownItem
                    key="verify"
                    onPress={() => handleVerifyEmployee(user)}
                    startContent={<CheckBadgeIcon className="w-5 h-5" />}
                    color={user.isVerified ? "warning" : "success"}
                    className="py-2"
                  >
                    {user.isVerified ? "Unverify Profile" : "Verify Profile"}
                  </DropdownItem>
                  <DropdownItem
                    key="update"
                    onPress={() => handleOpenEdit(user)}
                    startContent={<PencilIcon className="w-5 h-5" />}
                    className="py-2"
                  >
                    Update Profile
                  </DropdownItem>
                  <DropdownItem
                    key="resetPassword"
                    onPress={() => handleResetPassword(user)}
                    startContent={<KeyIcon className="w-5 h-5" />}
                    color="warning"
                    className="py-2"
                  >
                    Reset Password
                  </DropdownItem>
                  <DropdownItem
                    key="resetMfa"
                    onPress={() => handleResetMfa(user)}
                    startContent={<ShieldExclamationIcon className="w-5 h-5" />}
                    color="warning"
                    className="py-2"
                  >
                    Reset MFA
                  </DropdownItem>
                  <DropdownItem
                    key="delete"
                    className={user.email?.toLowerCase() === currentUserEmail?.toLowerCase() ? "text-gray-400 py-2" : "text-danger py-2"}
                    color={user.email?.toLowerCase() === currentUserEmail?.toLowerCase() ? "default" : "danger"}
                    startContent={<TrashIcon className="w-5 h-5" />}
                    onPress={() => handleOpenDelete(user)}
                    isDisabled={user.email?.toLowerCase() === currentUserEmail?.toLowerCase()}
                  >
                    {user.email?.toLowerCase() === currentUserEmail?.toLowerCase() ? "Delete Employee (You)" : "Delete Employee"}
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          );
        default:
          return cellValue;
      }
    },
    [handleViewProfile, handleOpenEdit, handleOpenDelete, handleVerifyEmployee, handleResetPassword, handleResetMfa, currentUserEmail],
  );

  const onNextPage = React.useCallback(() => {
    if (page < pages) {
      setPage(page + 1);
    }
  }, [page, pages]);

  const onPreviousPage = React.useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);

  const onRowsPerPageChange = React.useCallback((e) => {
    setRowsPerPage(Number(e.target.value));
    setPage(1);
  }, []);

  const onSearchChange = React.useCallback((value) => {
    if (value) {
      setFilterValue(value);
      setPage(1);
    } else {
      setFilterValue("");
    }
  }, []);

  const onClear = React.useCallback(() => {
    setFilterValue("");
    setPage(1);
  }, []);

  const topContent = React.useMemo(() => {
    const userOptions = users.map((user) => ({
      key: user.id,
      label: user.name,
      value: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      isVerified: user.isVerified,
    }));

    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between gap-3 items-end">
          <Autocomplete
            className="w-full sm:max-w-[44%]"
            placeholder="Search by name..."
            startContent={<SearchIcon />}
            inputValue={filterValue}
            onInputChange={onSearchChange}
            onClear={onClear}
            allowsCustomValue
            items={userOptions}
          >
            {(item) => (
              <AutocompleteItem key={item.key} textValue={item.label}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar size="sm" src={item.avatar || undefined} />
                    {item.isVerified && (
                      <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-blue-500 p-0.5 text-white shadow-lg">
                        <CheckBadgeIcon className="h-2 w-2" />
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-small font-medium">{item.label}</span>
                    <span className="text-tiny text-default-400">
                      {item.email} • {item.role}
                    </span>
                  </div>
                </div>
              </AutocompleteItem>
            )}
          </Autocomplete>
          <div className="flex gap-3">
            <Dropdown>
              <DropdownTrigger className="hidden sm:flex">
                <Button
                  endContent={<ChevronDownIcon className="text-small" />}
                  variant="flat"
                >
                  Status
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection
                aria-label="Table Columns"
                closeOnSelect={false}
                selectedKeys={statusFilter}
                selectionMode="multiple"
                onSelectionChange={setStatusFilter}
              >
                {statusOptions.map((status) => (
                  <DropdownItem key={status.uid} className="capitalize">
                    {capitalize(status.name)}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
            <Dropdown>
              <DropdownTrigger className="hidden sm:flex">
                <Button
                  endContent={<ChevronDownIcon className="text-small" />}
                  variant="flat"
                >
                  Columns
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection
                aria-label="Table Columns"
                closeOnSelect={false}
                selectedKeys={visibleColumns}
                selectionMode="multiple"
                onSelectionChange={setVisibleColumns}
              >
                {columns.map((column) => (
                  <DropdownItem key={column.uid} className="capitalize">
                    {capitalize(column.name)}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
            <Button
              color="primary"
              endContent={<PlusIcon />}
              onPress={onAddModalOpen}
            >
              Add New
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-default-400 text-small">
            Total {users.length} users
          </span>
          <label className="flex items-center text-default-400 text-small">
            Rows per page:
            <select
              className="bg-transparent outline-solid outline-transparent text-default-400 text-small"
              onChange={onRowsPerPageChange}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
            </select>
          </label>
        </div>
      </div>
    );
  }, [
    filterValue,
    statusFilter,
    visibleColumns,
    onRowsPerPageChange,
    users.length,
    onSearchChange,
    hasSearchFilter,
    onAddModalOpen,
  ]);

  const bottomContent = React.useMemo(() => {
    return (
      <div className="py-2 px-2 flex justify-between items-center">
        <span className="w-[30%] text-small text-default-400">
          {selectedKeys === "all"
            ? "All items selected"
            : `${selectedKeys.size} of ${filteredItems.length} selected`}
        </span>
        <Pagination
          isCompact
          showControls
          showShadow
          color="primary"
          page={page}
          total={pages}
          onChange={setPage}
        />
        <div className="hidden sm:flex w-[30%] justify-end gap-2">
          <Button
            isDisabled={pages === 1}
            size="sm"
            variant="flat"
            onPress={onPreviousPage}
          >
            Previous
          </Button>
          <Button
            isDisabled={pages === 1}
            size="sm"
            variant="flat"
            onPress={onNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    );
  }, [selectedKeys, items.length, page, pages, hasSearchFilter]);

  return (
    <>
      {/* Mobile View - Cards */}
      <div className="block md:hidden">
        {/* Search and Controls for Mobile */}
        <div className="mb-4 space-y-3">
          <Autocomplete
            placeholder="Search by name..."
            startContent={<SearchIcon />}
            inputValue={filterValue}
            onInputChange={onSearchChange}
            onClear={onClear}
            allowsCustomValue
            items={users.map((user) => ({
              key: user.id,
              label: user.name,
              value: user.name,
              email: user.email,
              role: user.role,
              avatar: user.avatar,
              isVerified: user.isVerified,
            }))}
          >
            {(item) => (
              <AutocompleteItem key={item.key} textValue={item.label}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar size="sm" src={item.avatar || undefined} />
                    {item.isVerified && (
                      <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-blue-500 p-0.5 text-white shadow-lg">
                        <CheckBadgeIcon className="h-2 w-2" />
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-small font-medium">{item.label}</span>
                    <span className="text-tiny text-default-400">
                      {item.email} • {item.role}
                    </span>
                  </div>
                </div>
              </AutocompleteItem>
            )}
          </Autocomplete>
          <div className="flex gap-2">
            <Button
              color="primary"
              size="sm"
              className="flex-1"
              endContent={<PlusIcon />}
              onPress={onAddModalOpen}
            >
              Add New
            </Button>
            <Dropdown>
              <DropdownTrigger>
                <Button
                  size="sm"
                  variant="flat"
                  endContent={<ChevronDownIcon className="text-small" />}
                >
                  Status
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection
                aria-label="Status Filter"
                closeOnSelect={false}
                selectedKeys={statusFilter}
                selectionMode="multiple"
                onSelectionChange={setStatusFilter}
              >
                {statusOptions.map((status) => (
                  <DropdownItem key={status.uid} className="capitalize">
                    {capitalize(status.name)}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        {/* Employee Cards */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white/95 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm animate-pulse"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex justify-between">
                    <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-20"></div>
                    <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {fetchError ?? "No employees found"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedItems.map((user) => (
              <div
                key={user.id}
                className="bg-white/95 backdrop-blur-sm rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 active:scale-[0.99] transition-all duration-200 cursor-pointer"
                onClick={() => handleViewProfile(user)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="relative flex-shrink-0">
                      <Avatar
                        size="lg"
                        src={user.avatar || undefined}
                        className="ring-2 ring-white shadow-sm"
                      />
                      {user.isVerified && (
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 p-1 text-white shadow-lg ring-2 ring-white">
                          <CheckBadgeIcon className="h-3 w-3" />
                        </span>
                      )}
                      {user.isOnline && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 text-base truncate">
                          {user.name}
                        </p>
                        {user.isVerified && (
                          <CheckBadgeIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="hidden">
                    <Dropdown>
                      <DropdownTrigger>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                          <VerticalDotsIcon className="w-5 h-5" />
                        </Button>
                      </DropdownTrigger>
                    <DropdownMenu aria-label="User actions">
                      <DropdownItem
                        key="view"
                        onPress={() => handleViewProfile(user)}
                        startContent={<UserIcon className="w-5 h-5" />}
                        className="py-2"
                      >
                        View Profile
                      </DropdownItem>
                      <DropdownItem
                        key="verify"
                        onPress={() => handleVerifyEmployee(user)}
                        startContent={<CheckBadgeIcon className="w-5 h-5" />}
                        color={user.isVerified ? "warning" : "success"}
                        className="py-2"
                      >
                        {user.isVerified
                          ? "Unverify Profile"
                          : "Verify Profile"}
                      </DropdownItem>
                      <DropdownItem
                        key="update"
                        onPress={() => handleOpenEdit(user)}
                        startContent={<PencilIcon className="w-5 h-5" />}
                        className="py-2"
                      >
                        Update Profile
                      </DropdownItem>
                      <DropdownItem
                        key="resetPassword"
                        onPress={() => handleResetPassword(user)}
                        startContent={<KeyIcon className="w-5 h-5" />}
                        color="warning"
                        className="py-2"
                      >
                        Reset Password
                      </DropdownItem>
                      <DropdownItem
                        key="resetMfa"
                        onPress={() => handleResetMfa(user)}
                        startContent={<ShieldExclamationIcon className="w-5 h-5" />}
                        color="warning"
                        className="py-2"
                      >
                        Reset MFA
                      </DropdownItem>
                      <DropdownItem
                        key="delete"
                        className={user.email?.toLowerCase() === currentUserEmail?.toLowerCase() ? "text-gray-400 py-2" : "text-danger py-2"}
                        color={user.email?.toLowerCase() === currentUserEmail?.toLowerCase() ? "default" : "danger"}
                        startContent={<TrashIcon className="w-5 h-5" />}
                        onPress={() => handleOpenDelete(user)}
                        isDisabled={user.email?.toLowerCase() === currentUserEmail?.toLowerCase()}
                      >
                        {user.email?.toLowerCase() === currentUserEmail?.toLowerCase() ? "Delete Employee (You)" : "Delete Employee"}
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs font-medium">
                      Role
                    </span>
                    <Chip
                      size="sm"
                      variant="flat"
                      color="secondary"
                      className="capitalize font-semibold text-xs px-2 py-1"
                    >
                      {user.role || "Employee"}
                    </Chip>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-xs font-medium">
                      Status
                    </span>
                    <Chip
                      className="capitalize font-semibold text-xs px-2 py-1"
                      color={
                        statusColorMap[user.status?.toString().toLowerCase()] ??
                        "default"
                      }
                      size="sm"
                      variant="solid"
                    >
                      {capitalize(user.status)}
                    </Chip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mobile Pagination */}
        <div className="mt-4 flex flex-col items-center space-y-2">
          <div className="text-sm text-gray-500">
            Total {users.length} users
          </div>
          <Pagination
            isCompact
            showControls
            color="primary"
            page={page}
            total={pages}
            onChange={setPage}
          />
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-500">Rows per page:</span>
            <select
              className="bg-transparent border border-gray-300 rounded px-2 py-1 text-sm"
              onChange={onRowsPerPageChange}
              value={rowsPerPage}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop View - Table */}
      {isHydrated && (
        <div className="hidden md:block">
          <Table
            isHeaderSticky
            aria-label="Example table with custom cells, pagination and sorting"
            bottomContent={bottomContent}
            bottomContentPlacement="outside"
            classNames={{
              wrapper: "max-h-[382px]",
            }}
            selectedKeys={selectedKeys}
            selectionMode="multiple"
            sortDescriptor={sortDescriptor}
            topContent={topContent}
            topContentPlacement="outside"
            onSelectionChange={setSelectedKeys}
            onSortChange={setSortDescriptor}
            isLoading={isLoading}
          >
            <TableHeader columns={headerColumns}>
              {(column) => (
                <TableColumn
                  key={column.uid}
                  align={column.uid === "actions" ? "center" : "start"}
                  allowsSorting={column.sortable}
                >
                  {column.name}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody
              emptyContent={
                isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Spinner size="lg" label="Loading users..." />
                  </div>
                ) : (
                  fetchError ?? "No users found"
                )
              }
              items={sortedItems}
            >
              {(item) => (
                <TableRow key={item.id}>
                  {(columnKey) => (
                    <TableCell>{renderCell(item, columnKey)}</TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      <CustomModal
        isOpen={isAddModalOpen}
        onOpenChange={onAddModalOpenChange}
        onUserAdded={fetchUsers}
      />
      <EmployeeEditModal
        employee={editEmployee}
        isLoading={isEditLoading}
        isOpen={isEditModalOpen}
        isSaving={isSavingEdit}
        onOpenChange={onEditModalOpenChange}
        onSave={handleSaveEdit}
      />
      <Modal isOpen={isDeleteModalOpen} onOpenChange={onDeleteModalOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Delete Employee</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <TrashIcon className="w-5 h-5 text-red-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">
                        Are you sure you want to delete{" "}
                        <span className="font-semibold">
                          {deleteTarget?.name ?? "this employee"}
                        </span>
                        ?
                      </p>
                      
                      {isLoadingLeadCount ? (
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
                <Button
                  variant="light"
                  onPress={() => {
                    setDeleteTarget(null);
                    setDeleteLeadCount(0);
                    onClose();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  color="danger"
                  onPress={handleConfirmDelete}
                  isLoading={isDeleting}
                  className={deleteLeadCount > 0 ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  {deleteLeadCount > 0 ? `Delete Despite ${deleteLeadCount} Assigned Lead${deleteLeadCount !== 1 ? 's' : ''}` : 'Delete Employee'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen && !!confirmAction}
        onOpenChange={onConfirmModalOpenChange}
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                {confirmAction?.type === "verify" && (
                  <CheckBadgeIcon className="w-5 h-5 text-success" />
                )}
                {confirmAction?.type === "unverify" && (
                  <CheckBadgeIcon className="w-5 h-5 text-warning" />
                )}
                {confirmAction?.type === "edit" && (
                  <PencilIcon className="w-5 h-5 text-primary" />
                )}
                {confirmAction?.type === "delete" && (
                  <TrashIcon className="w-5 h-5 text-danger" />
                )}
                {confirmAction?.type === "resetPassword" && (
                  <KeyIcon className="w-5 h-5 text-warning" />
                )}
                {confirmAction?.type === "resetMfa" && (
                  <ShieldExclamationIcon className="w-5 h-5 text-warning" />
                )}
                {confirmAction?.type === "view" && (
                  <UserIcon className="w-5 h-5 text-default-500" />
                )}
                {confirmAction?.title || "Confirm Action"}
              </ModalHeader>
              <ModalBody>
                <p className="text-sm text-gray-600">
                  {confirmAction?.message || "Are you sure you want to proceed?"}
                </p>
                {confirmAction?.type === "delete" && (
                  <div className="mt-3 p-3 bg-danger-50 rounded-lg border border-danger-200">
                    <p className="text-xs text-danger-600 font-medium">
                      ⚠️ Warning: This action is irreversible and will
                      permanently remove all employee data.
                    </p>
                  </div>
                )}
                {confirmAction?.type === "resetPassword" && (
                  <div className="mt-3 p-3 bg-warning-50 rounded-lg border border-warning-200">
                    <p className="text-xs text-warning-600 font-medium">
                      ⚠️ The user will need to reset their password on next login.
                    </p>
                  </div>
                )}
                {confirmAction?.type === "resetMfa" && (
                  <div className="mt-3 p-3 bg-warning-50 rounded-lg border border-warning-200">
                    <p className="text-xs text-warning-600 font-medium">
                      ⚠️ The user will need to set up MFA again on next login.
                    </p>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="light"
                  onPress={() => {
                    setConfirmAction(null);
                    onClose();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  color={
                    confirmAction?.type === "delete"
                      ? "danger"
                      : confirmAction?.type === "unverify"
                        ? "warning"
                        : confirmAction?.type === "verify"
                          ? "success"
                          : confirmAction?.type === "resetPassword"
                            ? "warning"
                            : confirmAction?.type === "resetMfa"
                              ? "warning"
                              : "primary"
                  }
                  onPress={() => {
                    if (confirmAction?.action) {
                      confirmAction.action();
                      // Close modal for view, edit, verify and unverify actions immediately
                      if (
                        confirmAction.type === "view" ||
                        confirmAction.type === "edit" ||
                        confirmAction.type === "verify" ||
                        confirmAction.type === "unverify"
                      ) {
                        setConfirmAction(null);
                        onClose();
                      }
                    }
                  }}
                  isLoading={isVerifying || isDeleting}
                >
                  {confirmAction?.confirmText || "Confirm"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
