import React, {
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  useDisclosure,
  DateRangePicker,
  Autocomplete,
  AutocompleteItem,
  Input,
  Select,
  SelectItem,
  Chip,
  Avatar,
} from "@heroui/react";
import {
  FunnelIcon,
  UserGroupIcon,
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/solid";
import { I18nProvider } from "@react-aria/i18n";
import { getLocalTimeZone, today, parseDate } from "@internationalized/date";
import axios from "@/lib/axios";

const STATUS_OPTIONS = [
  { key: "all", label: "All Statuses" },
  { key: "New", label: "New" },
  { key: "Interested", label: "Interested" },
  { key: "Not Interested", label: "Not Interested" },
  { key: "Deal", label: "Deal" },
];

const TIME_FILTER_OPTIONS = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom Range" },
];

const Filter = forwardRef(
  (
    { leads = [], onFiltersChange, currentFilters = {}, isAdmin = false },
    ref,
  ) => {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();

    // Expose onOpen function to parent via ref
    useImperativeHandle(ref, () => ({
      openFilter: onOpen,
    }));

    // Filter states
    const [nameSearch, setNameSearch] = useState(
      currentFilters.nameSearch || "",
    );
    const [emailSearch, setEmailSearch] = useState(
      currentFilters.emailSearch || "",
    );
    const [phoneSearch, setPhoneSearch] = useState(
      currentFilters.phoneSearch || "",
    );
    const [statusFilter, setStatusFilter] = useState(
      currentFilters.statusFilter || "all",
    );
    const [timeFilter, setTimeFilter] = useState(
      currentFilters.timeFilter || "all",
    );
    const [dateRange, setDateRange] = useState(
      currentFilters.dateRange || null,
    );
    const [sourceFilter, setSourceFilter] = useState(
      currentFilters.sourceFilter || "all",
    );
    const [assignedUserSearch, setAssignedUserSearch] = useState(
      currentFilters.assignedUserSearch || "",
    );

    // User data state for admin
    const [allUsers, setAllUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // Fetch users when component mounts (admin only)
    useEffect(() => {
      if (isAdmin) {
        fetchUsers();
      }
    }, [isAdmin]);

    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const response = await axios.get("admin/employees");
        setAllUsers(response.data.users || []);
      } catch (error) {
        console.error("Error fetching users:", error);
        setAllUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    // Helper function to get user avatar
    const getUserAvatar = (user) => {
      if (user?.avatar && user.avatar.startsWith("data:image/")) {
        return user.avatar;
      }
      // Fallback to generated avatar
      const displayName = user?.name || user?.email?.split("@")[0] || "User";
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3b82f6&color=ffffff&size=32&bold=true`;
    };

    // Extract unique options from leads data
    const nameOptions = useMemo(() => {
      const names = leads
        .map((lead) => lead.name)
        .filter((name) => name && typeof name === "string")
        .filter((name, index, arr) => arr.indexOf(name) === index)
        .sort();
      return names.map((name) => ({ key: name, label: name }));
    }, [leads]);

    const emailOptions = useMemo(() => {
      const emails = leads
        .map((lead) => lead.email)
        .filter((email) => email && typeof email === "string")
        .filter((email, index, arr) => arr.indexOf(email) === index)
        .sort();
      return emails.map((email) => ({ key: email, label: email }));
    }, [leads]);

    const phoneOptions = useMemo(() => {
      const phones = leads
        .map((lead) => lead.phone || lead.phoneNumber)
        .filter((phone) => phone && typeof phone === "string")
        .filter((phone, index, arr) => arr.indexOf(phone) === index)
        .sort();
      return phones.map((phone) => ({ key: phone, label: phone }));
    }, [leads]);

    const sourceOptions = useMemo(() => {
      const sources = leads
        .map((lead) => lead.source)
        .filter((source) => source && typeof source === "string")
        .filter((source, index, arr) => arr.indexOf(source) === index)
        .sort();
      return [
        { key: "all", label: "All Sources" },
        ...sources.map((source) => ({ 
          key: source, 
          label: source.charAt(0).toUpperCase() + source.slice(1) 
        })),
      ];
    }, [leads]);

    const userOptions = useMemo(() => {
      if (isAdmin && allUsers.length > 0) {
        // For admin, use enhanced user data with avatar and name
        const filteredUsers = allUsers.filter((user) => {
          if (!assignedUserSearch.trim()) return true;
          // Search by email ID only
          const searchTerm = assignedUserSearch.toLowerCase().trim();
          const userEmail = (user.email || "").toLowerCase();
          return userEmail.includes(searchTerm);
        });

        return filteredUsers
          .map((user) => ({
            key: user.email, // Use email as key since that's what we filter by
            label: user.email, // Display only email ID
            email: user.email,
            name: user.name,
            avatar: getUserAvatar(user),
            searchText: (user.email || "").toLowerCase().trim(), // Search only by email ID
          }))
          .sort((a, b) => (a.label || "").localeCompare(b.label || ""));
      } else {
        // For regular users, fallback to the existing logic using leads data
        const users = leads
          .map((lead) => lead.assignedTo || lead.userEmail)
          .filter((user) => user && typeof user === "string")
          .filter((user, index, arr) => arr.indexOf(user) === index)
          .sort();
        return users.map((user) => ({ key: user, label: user }));
      }
    }, [leads, isAdmin, allUsers, assignedUserSearch]);

    const handleApplyFilters = () => {
      const filters = {
        nameSearch: nameSearch.trim(),
        emailSearch: emailSearch.trim(),
        phoneSearch: phoneSearch.trim(),
        statusFilter,
        timeFilter,
        dateRange,
        sourceFilter,
        ...(isAdmin && { assignedUserSearch: assignedUserSearch.trim() }),
      };

      if (onFiltersChange) {
        onFiltersChange(filters);
      }

      onOpenChange(false);
    };

    const handleClearFilters = () => {
      // Reset all filter states
      setNameSearch("");
      setEmailSearch("");
      setPhoneSearch("");
      setStatusFilter("all");
      setTimeFilter("all");
      setDateRange(null);
      setSourceFilter("all");
      if (isAdmin) {
        setAssignedUserSearch("");
      }

      // Create a completely clean filter object with explicit reset signal
      const clearedFilters = {
        nameSearch: "",
        emailSearch: "",
        phoneSearch: "",
        statusFilter: "all",
        timeFilter: "all",
        dateRange: null,
        sourceFilter: "all",
        ...(isAdmin && { assignedUserSearch: "" }),
        // Add a timestamp to force parent component re-evaluation
        _cleared: Date.now(),
      };

      if (onFiltersChange) {
        onFiltersChange(clearedFilters);
      }

      // Close modal immediately
      onOpenChange(false);
    };

    const hasActiveFilters = useMemo(() => {
      const baseFilters =
        nameSearch.trim() ||
        emailSearch.trim() ||
        phoneSearch.trim() ||
        statusFilter !== "all" ||
        timeFilter !== "all" ||
        dateRange ||
        (sourceFilter && sourceFilter !== "all");

      const adminFilters = isAdmin ? assignedUserSearch.trim() : false;

      return baseFilters || adminFilters;
    }, [
      nameSearch,
      emailSearch,
      phoneSearch,
      statusFilter,
      timeFilter,
      dateRange,
      sourceFilter,
      assignedUserSearch,
      isAdmin,
    ]);

    const activeFilterCount = useMemo(() => {
      const filters = [
        nameSearch.trim(),
        emailSearch.trim(),
        phoneSearch.trim(),
        statusFilter !== "all",
        timeFilter !== "all",
        sourceFilter && sourceFilter !== "all",
        ...(isAdmin ? [assignedUserSearch.trim()] : []),
      ];
      return filters.filter(Boolean).length;
    }, [
      nameSearch,
      emailSearch,
      phoneSearch,
      statusFilter,
      timeFilter,
      sourceFilter,
      assignedUserSearch,
      isAdmin,
    ]);

    return (
      <div className="flex">
        <div
          role="button"
          onClick={onOpen}
          className={`px-4 py-2 flex items-center justify-center rounded-xl relative transition-all duration-200 ${
            hasActiveFilters
              ? "bg-blue-500 text-white shadow-lg hover:bg-blue-600"
              : "bg-white text-gray-700 border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200"
          } cursor-pointer`}
        >
          <FunnelIcon className="w-5" />
          {hasActiveFilters && (
            <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold shadow-md">
              {activeFilterCount}
            </div>
          )}
        </div>

        <Modal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          placement="center"
          backdrop="blur"
          size="full"
          hideCloseButton
          scrollBehavior="inside"
          motionProps={{
            variants: {
              enter: {
                y: 0,
                opacity: 1,
                transition: {
                  duration: 0.3,
                  ease: "easeOut",
                },
              },
              exit: {
                y: "100%",
                opacity: 0,
                transition: {
                  duration: 0.2,
                  ease: "easeIn",
                },
              },
            },
          }}
          classNames={{
            base: "m-0 h-screen max-h-screen w-screen max-w-screen overflow-visible",
            wrapper:
              "h-screen w-screen items-center justify-center p-0 overflow-visible",
            backdrop: "bg-black/50 backdrop-blur-md",
            body: "p-0 overflow-visible h-full",
            header: "p-0",
            footer: "p-0",
          }}
        >
          <ModalContent className="h-screen max-h-screen w-screen bg-white rounded-none shadow-none overflow-visible">
            {(onClose) => (
              <div className="relative h-full w-full">
                {/* Fixed Header */}
                <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 pt-4 pb-4 px-4">
                  <div className="absolute inset-0 bg-black/20"></div>

                  <div className="relative z-10">
                    {/* Active Filters Count at Top */}
                    {hasActiveFilters && (
                      <div className="text-center mb-2">
                        <div className="inline-flex items-center gap-2 bg-white/25 backdrop-blur-md rounded-full px-3 py-1 border border-white/20">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-white text-xs font-semibold">
                            {activeFilterCount} Active Filter
                            {activeFilterCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={onClose}
                        className="p-2 bg-white/20 backdrop-blur-md rounded-lg text-white hover:bg-white/30 transition-all duration-200 active:scale-95"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                      <div className="text-center">
                        <h1 className="text-base font-bold text-white">
                          Filters
                        </h1>
                        <p className="text-white/80 text-xs">Find your leads</p>
                      </div>
                      <div className="w-8"></div>
                    </div>
                  </div>
                </div>

                {/* Scrollable Content with padding for fixed header/footer */}
                <div className="pt-24 pb-20 h-full overflow-y-auto bg-gray-50 overscroll-contain">
                  <div className="p-4 space-y-5">
                    {/* Search Section */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                          <UserGroupIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-gray-900">
                            Quick Search
                          </h2>
                          <p className="text-xs text-gray-500">
                            Search by lead information
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Search by Name */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            👤 Lead Name
                          </label>
                          <Autocomplete
                            placeholder="Enter lead name..."
                            className="w-full"
                            inputValue={nameSearch}
                            onInputChange={setNameSearch}
                            allowsCustomValue
                            size="md"
                            variant="bordered"
                            radius="lg"
                            classNames={{
                              inputWrapper:
                                "border-2 border-gray-200 hover:border-blue-400 focus-within:border-blue-500 h-12 bg-gray-50/50",
                              input: "text-sm px-3 placeholder:text-gray-400",
                            }}
                            startContent={
                              <UserGroupIcon className="w-4 h-4 text-gray-400 ml-2" />
                            }
                          >
                            {nameOptions.map((option) => (
                              <AutocompleteItem
                                key={option.key}
                                className="text-sm py-3 px-3"
                              >
                                {option.label}
                              </AutocompleteItem>
                            ))}
                          </Autocomplete>
                        </div>

                        {/* Search by Email */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            📧 Email Address
                          </label>
                          <Autocomplete
                            placeholder="Enter email address..."
                            className="w-full"
                            inputValue={emailSearch}
                            onInputChange={setEmailSearch}
                            allowsCustomValue
                            size="md"
                            variant="bordered"
                            radius="lg"
                            classNames={{
                              inputWrapper:
                                "border-2 border-gray-200 hover:border-blue-400 focus-within:border-blue-500 h-12 bg-gray-50/50",
                              input: "text-sm px-3 placeholder:text-gray-400",
                            }}
                            startContent={
                              <EnvelopeIcon className="w-4 h-4 text-gray-400 ml-2" />
                            }
                          >
                            {emailOptions.map((option) => (
                              <AutocompleteItem
                                key={option.key}
                                className="text-sm py-3 px-3"
                              >
                                {option.label}
                              </AutocompleteItem>
                            ))}
                          </Autocomplete>
                        </div>

                        {/* Search by Phone */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            📱 Phone Number
                          </label>
                          <Autocomplete
                            placeholder="Enter phone number..."
                            className="w-full"
                            inputValue={phoneSearch}
                            onInputChange={setPhoneSearch}
                            allowsCustomValue
                            size="md"
                            variant="bordered"
                            radius="lg"
                            classNames={{
                              inputWrapper:
                                "border-2 border-gray-200 hover:border-blue-400 focus-within:border-blue-500 h-12 bg-gray-50/50",
                              input: "text-sm px-3 placeholder:text-gray-400",
                            }}
                            startContent={
                              <PhoneIcon className="w-4 h-4 text-gray-400 ml-2" />
                            }
                          >
                            {phoneOptions.map((option) => (
                              <AutocompleteItem
                                key={option.key}
                                className="text-sm py-3 px-3"
                              >
                                {option.label}
                              </AutocompleteItem>
                            ))}
                          </Autocomplete>
                        </div>

                        {/* Admin-only: Search by Assigned User */}
                        {isAdmin && (
                          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-100">
                            <label className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-3">
                              <UserGroupIcon className="w-4 h-4" />
                              👥 Assigned User
                            </label>
                            <Autocomplete
                              placeholder="Search by email ID..."
                              className="w-full"
                              inputValue={(() => {
                                // If assignedUserSearch is an email, try to display the user's name
                                if (
                                  assignedUserSearch.includes("@") &&
                                  allUsers.length > 0
                                ) {
                                  const user = allUsers.find(
                                    (u) => u.email === assignedUserSearch,
                                  );
                                  return user
                                    ? user.name || user.email
                                    : assignedUserSearch;
                                }
                                return assignedUserSearch;
                              })()}
                              onInputChange={setAssignedUserSearch}
                              allowsCustomValue
                              size="md"
                              variant="bordered"
                              radius="lg"
                              isLoading={isLoadingUsers}
                              items={userOptions}
                              classNames={{
                                inputWrapper:
                                  "border-2 border-blue-200 hover:border-blue-400 focus-within:border-blue-500 h-12 bg-white",
                                input: "text-sm px-3 placeholder:text-blue-400",
                              }}
                              startContent={
                                <UserGroupIcon className="w-4 h-4 text-blue-400 ml-2" />
                              }
                              onSelectionChange={(key) => {
                                if (key && allUsers.length > 0) {
                                  const selectedUser = userOptions.find(
                                    (user) => user.key === key,
                                  );
                                  if (selectedUser) {
                                    // Store the email for filtering but display the name in the input
                                    setAssignedUserSearch(selectedUser.email);
                                  }
                                }
                              }}
                            >
                              {allUsers.length > 0
                                ? userOptions.map((user) => (
                                    <AutocompleteItem
                                      key={user.key}
                                      value={user.key}
                                      textValue={user.searchText || user.label}
                                      className="py-3 px-3"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Avatar
                                          src={user.avatar}
                                          name={user.name || user.email}
                                          size="md"
                                          className="flex-shrink-0 ring-2 ring-blue-100"
                                        />
                                        <div className="flex flex-col min-w-0 flex-1">
                                          <span className="text-sm font-bold text-gray-900 truncate">
                                            {user.name || "No Name"}
                                          </span>
                                          <span className="text-xs text-blue-600 truncate font-medium">
                                            {user.email}
                                          </span>
                                        </div>
                                      </div>
                                    </AutocompleteItem>
                                  ))
                                : userOptions.map((option) => (
                                    <AutocompleteItem
                                      key={option.key}
                                      className="text-sm py-3 px-3"
                                    >
                                      {option.label}
                                    </AutocompleteItem>
                                  ))}
                            </Autocomplete>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Filters Section */}
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                          <FunnelIcon className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-gray-900">
                            Advanced Filters
                          </h2>
                          <p className="text-xs text-gray-500">
                            Narrow down your results
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {/* Status Filter */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            🔄 Lead Status
                          </label>
                          <Select
                            selectedKeys={[statusFilter]}
                            onSelectionChange={(keys) =>
                              setStatusFilter(Array.from(keys)[0])
                            }
                            size="md"
                            variant="bordered"
                            radius="lg"
                            placeholder="Select status"
                            classNames={{
                              trigger:
                                "border-2 border-gray-200 hover:border-purple-400 focus:border-purple-500 h-12 bg-gray-50/50",
                              value: "text-sm px-3",
                            }}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.key}
                                value={option.key}
                                className="text-sm py-3 px-3"
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>

                        {/* Time Filter */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            📅 Time Period
                          </label>
                          <Select
                            selectedKeys={[timeFilter]}
                            onSelectionChange={(keys) =>
                              setTimeFilter(Array.from(keys)[0])
                            }
                            size="md"
                            variant="bordered"
                            radius="lg"
                            placeholder="Select time period"
                            classNames={{
                              trigger:
                                "border-2 border-gray-200 hover:border-purple-400 focus:border-purple-500 h-12 bg-gray-50/50",
                              value: "text-sm px-3",
                            }}
                          >
                            {TIME_FILTER_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.key}
                                value={option.key}
                                className="text-sm py-3 px-3"
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>

                        {/* Lead Source Filter */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            🔗 Lead Source
                          </label>
                          <Select
                            selectedKeys={[sourceFilter]}
                            onSelectionChange={(keys) =>
                              setSourceFilter(Array.from(keys)[0])
                            }
                            size="md"
                            variant="bordered"
                            radius="lg"
                            placeholder="Select source"
                            classNames={{
                              trigger:
                                "border-2 border-gray-200 hover:border-purple-400 focus:border-purple-500 h-12 bg-gray-50/50",
                              value: "text-sm px-3",
                            }}
                          >
                            {sourceOptions.map((option) => (
                              <SelectItem
                                key={option.key}
                                value={option.key}
                                className="text-sm py-3 px-3"
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>



                        {/* Custom Date Range */}
                        {timeFilter === "custom" && (
                          <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-orange-100">
                            <label className="block text-sm font-semibold text-orange-900 mb-3">
                              📆 Custom Date Range
                            </label>
                            <I18nProvider locale="en-GB">
                              <DateRangePicker
                                value={dateRange}
                                onChange={setDateRange}
                                maxValue={today(getLocalTimeZone())}
                                size="md"
                                variant="bordered"
                                radius="lg"
                                visibleMonths={1}
                                classNames={{
                                  base: "w-full",
                                  inputWrapper:
                                    "border-2 border-orange-200 hover:border-orange-400 focus-within:border-orange-500 h-12 bg-white",
                                }}
                              />
                            </I18nProvider>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active Filters */}
                    {hasActiveFilters && (
                      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="text-white text-xs font-bold">
                                {activeFilterCount}
                              </span>
                            </div>
                            <div>
                              <h2 className="text-base font-bold text-gray-900">
                                Active Filters
                              </h2>
                              <p className="text-xs text-gray-500">
                                {activeFilterCount} filter
                                {activeFilterCount !== 1 ? "s" : ""} applied
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleClearFilters}
                            className="px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200"
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {nameSearch.trim() && (
                            <Chip
                              color="primary"
                              size="md"
                              variant="flat"
                              radius="md"
                              onClose={() => setNameSearch("")}
                              className="text-xs font-semibold px-3 py-1"
                            >
                              👤 {nameSearch}
                            </Chip>
                          )}
                          {emailSearch.trim() && (
                            <Chip
                              color="primary"
                              size="md"
                              variant="flat"
                              radius="md"
                              onClose={() => setEmailSearch("")}
                              className="text-xs font-semibold px-3 py-1"
                            >
                              📧 {emailSearch}
                            </Chip>
                          )}
                          {phoneSearch.trim() && (
                            <Chip
                              color="primary"
                              size="md"
                              variant="flat"
                              radius="md"
                              onClose={() => setPhoneSearch("")}
                              className="text-xs font-semibold px-3 py-1"
                            >
                              📱 {phoneSearch}
                            </Chip>
                          )}
                          {statusFilter !== "all" && (
                            <Chip
                              color="secondary"
                              size="md"
                              variant="flat"
                              radius="md"
                              onClose={() => setStatusFilter("all")}
                              className="text-xs font-semibold px-3 py-1"
                            >
                              🔄{" "}
                              {
                                STATUS_OPTIONS.find(
                                  (s) => s.key === statusFilter,
                                )?.label
                              }
                            </Chip>
                          )}
                          {timeFilter !== "all" && (
                            <Chip
                              color="warning"
                              size="md"
                              variant="flat"
                              radius="md"
                              onClose={() => {
                                setTimeFilter("all");
                                setDateRange(null);
                              }}
                              className="text-xs font-semibold px-3 py-1"
                            >
                              📅{" "}
                              {
                                TIME_FILTER_OPTIONS.find(
                                  (t) => t.key === timeFilter,
                                )?.label
                              }
                            </Chip>
                          )}

                          {isAdmin && assignedUserSearch.trim() && (
                            <Chip
                              color="default"
                              size="md"
                              variant="flat"
                              radius="md"
                              onClose={() => setAssignedUserSearch("")}
                              className="text-xs font-semibold px-3 py-1"
                            >
                              👥{" "}
                              {(() => {
                                const user = allUsers.find(
                                  (u) => u.email === assignedUserSearch.trim(),
                                );
                                return user
                                  ? user.name || user.email
                                  : assignedUserSearch;
                              })()}
                            </Chip>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Fixed Footer */}
                <div className="fixed bottom-20 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="flex-1 bg-gray-200 text-gray-800 text-sm font-bold py-3 rounded-lg hover:bg-gray-300 active:scale-[0.98] transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplyFilters}
                      className="flex-1 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white text-sm font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.01] active:scale-[0.98] transition-all duration-200"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </ModalContent>
        </Modal>
      </div>
    );
  },
);

Filter.displayName = "Filter";

export default Filter;
