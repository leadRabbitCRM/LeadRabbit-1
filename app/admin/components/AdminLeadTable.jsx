"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Chip,
  Pagination,
  Avatar,
  useDisclosure,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import { EyeIcon } from "@heroicons/react/24/solid";
import { 
  ChevronDownIcon,
  ClipboardDocumentListIcon, 
  UserIcon, 
  TagIcon, 
  ArrowUpTrayIcon, 
  PencilIcon, 
  TrashIcon 
} from "@heroicons/react/24/outline";
import axios from "@/lib/axios";
import AdminLeadDetailModal from "./AdminLeadDetailModal";

// Custom VerticalDotsIcon component
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

const columns = [
  { name: "NAME", uid: "name", sortable: true },
  { name: "EMAIL", uid: "email", sortable: true },
  { name: "PHONE", uid: "phone" },
  { name: "STATUS", uid: "status", sortable: true },
  { name: "ASSIGNED TO", uid: "assignedTo", sortable: true },
  { name: "SOURCE", uid: "sourcePlatform", sortable: true },
  { name: "ENGAGEMENTS", uid: "engagements" },
  { name: "MEETINGS", uid: "meetings" },
  { name: "CREATED", uid: "createdAt", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];

const statusColorMap = {
  New: "success",
  Interested: "primary",
  "Not Interested": "danger",
  Deal: "warning",
};

const INITIAL_VISIBLE_COLUMNS = [
  "name",
  "email",
  "status",
  "assignedTo",
  "engagements",
  "meetings",
  "actions",
];

export default function AdminLeadTable({
  leads = [],
  onStatusChange,
  onMeetingsChange,
  onEngagementsChange,
}) {
  const [selectedKeys, setSelectedKeys] = useState(new Set([]));
  const [visibleColumns, setVisibleColumns] = useState(
    new Set(INITIAL_VISIBLE_COLUMNS),
  );
  const [statusFilter, setStatusFilter] = useState("all");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortDescriptor, setSortDescriptor] = useState({
    column: "createdAt",
    direction: "descending",
  });
  const [page, setPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  // Confirmation modals
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onOpenChange: onDeleteOpenChange,
  } = useDisclosure();
  const {
    isOpen: isAssignOpen,
    onOpen: onAssignOpen,
    onOpenChange: onAssignOpenChange,
  } = useDisclosure();
  const {
    isOpen: isStatusOpen,
    onOpen: onStatusOpen,
    onOpenChange: onStatusOpenChange,
  } = useDisclosure();
  const {
    isOpen: isExportOpen,
    onOpen: onExportOpen,
    onOpenChange: onExportOpenChange,
  } = useDisclosure();
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onOpenChange: onEditOpenChange,
  } = useDisclosure();

  // Action states
  const [actionLead, setActionLead] = useState(null);
  const [newAssignee, setNewAssignee] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [editData, setEditData] = useState({ name: "", email: "", phone: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);

  // Fetch users for avatar display
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get("admin/employees");
      setUsers(response.data.users || []);
    } catch (error) {
      console.error("Error fetching users for avatars:", error);
    }
  };

  // Get user avatar helper function
  const getUserAvatar = (email, name) => {
    const user = users.find((u) => u.email === email);
    if (user?.avatar && user.avatar.startsWith("data:image/")) {
      return user.avatar;
    }
    // Fallback to generated avatar
    const displayName = name || email?.split("@")[0] || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3b82f6&color=ffffff&size=64&bold=true`;
  };

  const resolveLeadId = useCallback((lead) => {
    if (!lead) return null;
    if (typeof lead?._id?.toString === "function") {
      return lead._id.toString();
    }
    return lead?._id ?? lead?.id ?? null;
  }, []);

  const statusOptions = [
    { name: "All", uid: "all" },
    { name: "New", uid: "New" },
    { name: "Interested", uid: "Interested" },
    { name: "Not Interested", uid: "Not Interested" },
    { name: "Deal", uid: "Deal" },
  ];

  const headerColumns = useMemo(() => {
    if (visibleColumns === "all") return columns;
    return columns.filter((column) =>
      Array.from(visibleColumns).includes(column.uid),
    );
  }, [visibleColumns]);

  const filteredItems = useMemo(() => {
    let filteredLeads = [...leads];

    if (statusFilter !== "all") {
      filteredLeads = filteredLeads.filter(
        (lead) => lead.status === statusFilter,
      );
    }

    return filteredLeads;
  }, [leads, statusFilter]);

  const pages = Math.ceil(filteredItems.length / rowsPerPage) || 1;

  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredItems.slice(start, end);
  }, [page, filteredItems, rowsPerPage]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const first = a[sortDescriptor.column];
      const second = b[sortDescriptor.column];
      const cmp = first < second ? -1 : first > second ? 1 : 0;
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [sortDescriptor, items]);

  const handleViewLead = useCallback(
    (lead) => {
      setSelectedLead(lead);
      onOpen();
    },
    [onOpen],
  );

  const handleDeleteLead = useCallback(async () => {
    if (!actionLead) return;

    setIsLoading(true);
    try {
      const leadId = resolveLeadId(actionLead);
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh the leads list by calling parent component
        window.location.reload(); // Simple refresh for now
      } else {
        alert("Failed to delete lead");
      }
    } catch (error) {
      console.error("Error deleting lead:", error);
      alert("Error deleting lead");
    } finally {
      setIsLoading(false);
      onDeleteOpenChange();
      setActionLead(null);
    }
  }, [actionLead, resolveLeadId, onDeleteOpenChange]);

  const handleAssignLead = useCallback(async () => {
    if (!actionLead || !newAssignee) return;

    setIsLoading(true);
    try {
      const leadId = resolveLeadId(actionLead);
      const response = await fetch(`/api/leads/${leadId}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignedTo: newAssignee }),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert("Failed to assign lead");
      }
    } catch (error) {
      console.error("Error assigning lead:", error);
      alert("Error assigning lead");
    } finally {
      setIsLoading(false);
      onAssignOpenChange();
      setActionLead(null);
      setNewAssignee("");
    }
  }, [actionLead, newAssignee, resolveLeadId, onAssignOpenChange]);

  const handleStatusChange = useCallback(async () => {
    if (!actionLead || !newStatus) return;

    setIsLoading(true);
    try {
      const leadId = resolveLeadId(actionLead);
      const response = await fetch(`/api/leads/${leadId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        if (onStatusChange) {
          onStatusChange(leadId, newStatus);
        }
        window.location.reload();
      } else {
        alert("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error updating status");
    } finally {
      setIsLoading(false);
      onStatusOpenChange();
      setActionLead(null);
      setNewStatus("");
    }
  }, [
    actionLead,
    newStatus,
    resolveLeadId,
    onStatusChange,
    onStatusOpenChange,
  ]);

  const handleExportData = useCallback(async () => {
    if (!actionLead) return;

    setIsLoading(true);
    try {
      const leadData = {
        name: actionLead.name,
        email: actionLead.email,
        phone: actionLead.phone,
        status: actionLead.status,
        assignedTo: actionLead.assignedTo,
        createdAt: actionLead.createdAt,
        engagements: actionLead.engagements?.length || 0,
        meetings: actionLead.meetings?.length || 0,
      };

      const dataStr = JSON.stringify(leadData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lead-${actionLead.name || "unnamed"}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Error exporting data");
    } finally {
      setIsLoading(false);
      onExportOpenChange();
      setActionLead(null);
    }
  }, [actionLead, onExportOpenChange]);

  const handleEditLead = useCallback(async () => {
    if (!actionLead || !editData.name || !editData.email) return;

    setIsLoading(true);
    try {
      const leadId = resolveLeadId(actionLead);
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert("Failed to update lead");
      }
    } catch (error) {
      console.error("Error updating lead:", error);
      alert("Error updating lead");
    } finally {
      setIsLoading(false);
      onEditOpenChange();
      setActionLead(null);
      setEditData({ name: "", email: "", phone: "" });
    }
  }, [actionLead, editData, resolveLeadId, onEditOpenChange]);

  const openConfirmationModal = useCallback(
    (action, lead) => {
      setActionLead(lead);

      switch (action) {
        case "delete":
          onDeleteOpen();
          break;
        case "assign":
          setNewAssignee(lead.assignedTo || "");
          onAssignOpen();
          break;
        case "status":
          setNewStatus(lead.status || "New");
          onStatusOpen();
          break;
        case "export":
          onExportOpen();
          break;
        case "edit":
          setEditData({
            name: lead.name || "",
            email: lead.email || "",
            phone: lead.phone || "",
          });
          onEditOpen();
          break;
      }
    },
    [onDeleteOpen, onAssignOpen, onStatusOpen, onExportOpen, onEditOpen],
  );

  const renderCell = useCallback(
    (lead, columnKey) => {
      const cellValue = lead[columnKey];
      const leadId = resolveLeadId(lead);

      switch (columnKey) {
        case "name":
          return (
            <div className="flex items-center gap-2 sm:gap-3">
              <img
                src={getUserAvatar(lead.email, lead.name)}
                alt={lead.name || "User"}
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex flex-col min-w-0">
                <p className="text-bold text-xs sm:text-sm capitalize truncate">
                  {lead.name || "Unnamed"}
                </p>
              </div>
            </div>
          );

        case "email":
          return (
            <div className="flex flex-col">
              <p className="text-bold text-sm">{lead.email}</p>
            </div>
          );

        case "phone":
          return (
            <div className="flex flex-col">
              <p className="text-bold text-sm">{lead.phone}</p>
            </div>
          );

        case "status":
          return (
            <Chip
              className="capitalize"
              color={statusColorMap[lead.status] || "default"}
              size="sm"
              variant="flat"
            >
              {cellValue || "New"}
            </Chip>
          );

        case "assignedTo":
          const assignedUser = lead.assignedTo || lead.userEmail;
          const assignedUserName = lead.assignedToName;
          return (
            <div className="flex flex-col gap-1">
              {assignedUser ? (
                <>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <img
                      src={getUserAvatar(assignedUser, assignedUserName)}
                      alt={assignedUserName || assignedUser}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <p className="text-bold text-xs truncate">
                        {assignedUserName || assignedUser.split("@")[0]}
                      </p>
                      <p className="text-xs text-gray-500 truncate hidden sm:block">
                        {assignedUser}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 rounded-full flex items-center justify-center opacity-50 flex-shrink-0">
                    <svg
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400"
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
                  <div className="flex flex-col min-w-0">
                    <p className="text-bold text-xs text-gray-500">
                      Unassigned
                    </p>
                    <p className="text-xs text-gray-400 hidden sm:block">
                      No user assigned
                    </p>
                  </div>
                </div>
              )}
            </div>
          );

        case "sourcePlatform":
          const sourceValue =
            lead.sourcePlatform || lead.source || lead.platform || "Unknown";
          return (
            <div className="flex flex-col">
              <p className="text-bold text-sm">{sourceValue}</p>
            </div>
          );

        case "engagements":
          const engagementCount = Array.isArray(lead.engagements)
            ? lead.engagements.length
            : 0;
          return (
            <div className="flex items-center gap-1">
              <Chip
                size="sm"
                variant={engagementCount > 0 ? "flat" : "light"}
                color={
                  engagementCount > 5
                    ? "success"
                    : engagementCount > 2
                      ? "primary"
                      : engagementCount > 0
                        ? "warning"
                        : "default"
                }
              >
                {engagementCount} engagement{engagementCount !== 1 ? "s" : ""}
              </Chip>
            </div>
          );

        case "meetings":
          const meetingCount = Array.isArray(lead.meetings)
            ? lead.meetings.length
            : 0;
          const upcomingMeetings = Array.isArray(lead.meetings)
            ? lead.meetings.filter(
                (meeting) => new Date(meeting.date) > new Date(),
              ).length
            : 0;
          return (
            <div className="flex flex-col gap-1">
              <Chip
                size="sm"
                variant={meetingCount > 0 ? "flat" : "light"}
                color={
                  upcomingMeetings > 0
                    ? "success"
                    : meetingCount > 0
                      ? "primary"
                      : "default"
                }
              >
                {meetingCount} meeting{meetingCount !== 1 ? "s" : ""}
              </Chip>
              {upcomingMeetings > 0 && (
                <p className="text-xs text-success-600">
                  {upcomingMeetings} upcoming
                </p>
              )}
            </div>
          );

        case "createdAt":
          const date = new Date(lead.createdAt || lead.timestamp);
          return (
            <div className="flex flex-col">
              <p className="text-bold text-sm">{date.toLocaleDateString()}</p>
              <p className="text-xs text-gray-500">
                {date.toLocaleTimeString()}
              </p>
            </div>
          );

        case "actions":
          return (
            <div className="relative flex justify-end items-center gap-2">
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => handleViewLead(lead)}
                className="text-default-400 hover:text-primary"
              >
                <EyeIcon className="w-4 h-4" />
              </Button>
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly size="sm" variant="light">
                    <VerticalDotsIcon className="text-default-300 w-4 h-4" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu>
                  <DropdownItem key="view" onPress={() => handleViewLead(lead)}>
                    <div className="flex items-center gap-2">
                      <ClipboardDocumentListIcon className="w-4 h-4" />
                      View Details
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    key="assign"
                    className="text-primary"
                    color="primary"
                    onPress={() => openConfirmationModal("assign", lead)}
                  >
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      {lead.assignedTo ? "Reassign Lead" : "Assign Lead"}
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    key="status"
                    className="text-secondary"
                    color="secondary"
                    onPress={() => openConfirmationModal("status", lead)}
                  >
                    <div className="flex items-center gap-2">
                      <TagIcon className="w-4 h-4" />
                      Change Status
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    key="export"
                    className="text-success"
                    color="success"
                    onPress={() => openConfirmationModal("export", lead)}
                  >
                    <div className="flex items-center gap-2">
                      <ArrowUpTrayIcon className="w-4 h-4" />
                      Export Data
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    key="edit"
                    className="text-warning"
                    color="warning"
                    onPress={() => openConfirmationModal("edit", lead)}
                  >
                    <div className="flex items-center gap-2">
                      <PencilIcon className="w-4 h-4" />
                      Edit Lead
                    </div>
                  </DropdownItem>
                  <DropdownItem
                    key="delete"
                    className="text-danger"
                    color="danger"
                    onPress={() => openConfirmationModal("delete", lead)}
                  >
                    <div className="flex items-center gap-2">
                      <TrashIcon className="w-4 h-4" />
                      Delete Lead
                    </div>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          );

        default:
          return cellValue;
      }
    },
    [resolveLeadId, handleViewLead],
  );

  const onNextPage = useCallback(() => {
    if (page < pages) {
      setPage(page + 1);
    }
  }, [page, pages]);

  const onPreviousPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);

  const onRowsPerPageChange = useCallback((e) => {
    setRowsPerPage(Number(e.target.value));
    setPage(1);
  }, []);

  const topContent = useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between gap-3 items-end">
          <div className="flex gap-3">
            <Dropdown>
              <DropdownTrigger className="sm:flex">
                <Button
                  endContent={
                    <ChevronDownIcon className="text-small w-4 h-4" />
                  }
                  variant="flat"
                >
                  Status
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection
                aria-label="Status Filter"
                selectedKeys={[statusFilter]}
                selectionMode="single"
                onSelectionChange={(keys) =>
                  setStatusFilter(Array.from(keys)[0])
                }
              >
                {statusOptions.map((status) => (
                  <DropdownItem key={status.uid} className="capitalize">
                    {status.name}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
            <Dropdown>
              <DropdownTrigger className="sm:flex">
                <Button
                  endContent={
                    <ChevronDownIcon className="text-small w-4 h-4" />
                  }
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
                    {column.name}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-default-400 text-small">
            Total {filteredItems.length} leads
          </span>
          <label className="flex items-center text-default-400 text-small">
            Rows per page:
            <select
              className="bg-transparent outline-none text-default-400 text-small ml-2"
              onChange={onRowsPerPageChange}
              value={rowsPerPage}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
              <option value="20">20</option>
            </select>
          </label>
        </div>
      </div>
    );
  }, [
    statusFilter,
    visibleColumns,
    onRowsPerPageChange,
    filteredItems.length,
    rowsPerPage,
  ]);

  const bottomContent = useMemo(() => {
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
  }, [
    selectedKeys,
    filteredItems.length,
    page,
    pages,
    onPreviousPage,
    onNextPage,
  ]);

  return (
    <>
      <Table
        isHeaderSticky
        aria-label="Leads management table"
        bottomContent={bottomContent}
        bottomContentPlacement="outside"
        classNames={{
          wrapper: "max-h-[600px]",
          th: "bg-transparent text-default-500",
          td: "cursor-pointer",
        }}
        selectedKeys={selectedKeys}
        selectionMode="none"
        sortDescriptor={sortDescriptor}
        topContent={topContent}
        topContentPlacement="outside"
        onSelectionChange={setSelectedKeys}
        onSortChange={setSortDescriptor}
      >
        <TableHeader columns={headerColumns}>
          {(column) => (
            <TableColumn
              key={column.uid}
              align={
                column.uid === "actions" || column.uid === "favorite"
                  ? "center"
                  : "start"
              }
              allowsSorting={column.sortable}
            >
              {column.name}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody emptyContent={"No leads found"} items={sortedItems}>
          {(item) => (
            <TableRow
              key={resolveLeadId(item)}
              className="hover:bg-default-100 cursor-pointer"
              onClick={() => handleViewLead(item)}
            >
              {(columnKey) => (
                <TableCell
                  onClick={
                    columnKey === "favorite" || columnKey === "actions"
                      ? (e) => e.stopPropagation()
                      : undefined
                  }
                >
                  {renderCell(item, columnKey)}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Lead Detail Modal */}
      <AdminLeadDetailModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        lead={selectedLead}
        onStatusChange={onStatusChange}
        onMeetingsChange={onMeetingsChange}
        onEngagementsChange={onEngagementsChange}
      />

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onOpenChange={onDeleteOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Confirm Delete Lead
              </ModalHeader>
              <ModalBody>
                <p>
                  Are you sure you want to delete the lead{" "}
                  <strong>{actionLead?.name || "Unnamed"}</strong>?
                </p>
                <p className="text-danger text-sm">
                  This action cannot be undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="danger"
                  onPress={handleDeleteLead}
                  isLoading={isLoading}
                >
                  Delete Lead
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Assign Lead Modal */}
      <Modal isOpen={isAssignOpen} onOpenChange={onAssignOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {actionLead?.assignedTo ? "Reassign Lead" : "Assign Lead"}
              </ModalHeader>
              <ModalBody>
                <p>
                  Lead: <strong>{actionLead?.name || "Unnamed"}</strong>
                </p>
                <Input
                  label="Assign to (Email)"
                  placeholder="Enter user email"
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
                  type="email"
                />
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onPress={handleAssignLead}
                  isLoading={isLoading}
                  isDisabled={!newAssignee}
                >
                  {actionLead?.assignedTo ? "Reassign" : "Assign"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Change Status Modal */}
      <Modal isOpen={isStatusOpen} onOpenChange={onStatusOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Change Lead Status
              </ModalHeader>
              <ModalBody>
                <p>
                  Lead: <strong>{actionLead?.name || "Unnamed"}</strong>
                </p>
                <p>
                  Current Status: <strong>{actionLead?.status || "New"}</strong>
                </p>
                <Select
                  label="New Status"
                  placeholder="Select new status"
                  selectedKeys={newStatus ? [newStatus] : []}
                  onSelectionChange={(keys) =>
                    setNewStatus(Array.from(keys)[0])
                  }
                >
                  <SelectItem key="New">New</SelectItem>
                  <SelectItem key="Interested">Interested</SelectItem>
                  <SelectItem key="Not Interested">Not Interested</SelectItem>
                  <SelectItem key="Deal">Deal</SelectItem>
                </Select>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="secondary"
                  onPress={handleStatusChange}
                  isLoading={isLoading}
                  isDisabled={!newStatus}
                >
                  Update Status
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Export Confirmation Modal */}
      <Modal isOpen={isExportOpen} onOpenChange={onExportOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Export Lead Data
              </ModalHeader>
              <ModalBody>
                <p>
                  Export data for lead:{" "}
                  <strong>{actionLead?.name || "Unnamed"}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  This will download a JSON file with the lead's information.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="success"
                  onPress={handleExportData}
                  isLoading={isLoading}
                >
                  Export Data
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Edit Lead Modal */}
      <Modal isOpen={isEditOpen} onOpenChange={onEditOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                Edit Lead Information
              </ModalHeader>
              <ModalBody className="space-y-4">
                <Input
                  label="Name"
                  placeholder="Enter lead name"
                  value={editData.name}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <Input
                  label="Email"
                  placeholder="Enter email address"
                  value={editData.email}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  type="email"
                />
                <Input
                  label="Phone"
                  placeholder="Enter phone number"
                  value={editData.phone}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="warning"
                  onPress={handleEditLead}
                  isLoading={isLoading}
                  isDisabled={!editData.name || !editData.email}
                >
                  Update Lead
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
}
