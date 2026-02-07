import React, {
  useState,
  useMemo,
  forwardRef,
  useImperativeHandle,
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
} from "@heroui/react";
import {
  FunnelIcon,
  UserGroupIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { I18nProvider } from "@react-aria/i18n";
import { getLocalTimeZone, today, parseDate } from "@internationalized/date";

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
  ({ leads = [], onFiltersChange, currentFilters = {} }, ref) => {
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
    const [sourcePlatform, setSourcePlatform] = useState(
      currentFilters.sourcePlatform || "",
    );

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

    const platformOptions = useMemo(() => {
      const platforms = leads
        .map((lead) => lead.sourcePlatform)
        .filter((platform) => platform && typeof platform === "string")
        .filter((platform, index, arr) => arr.indexOf(platform) === index)
        .sort();
      return [
        { key: "all", label: "All Platforms" },
        ...platforms.map((platform) => ({ key: platform, label: platform })),
      ];
    }, [leads]);

    const handleApplyFilters = () => {
      const filters = {
        nameSearch: nameSearch.trim(),
        emailSearch: emailSearch.trim(),
        phoneSearch: phoneSearch.trim(),
        statusFilter,
        timeFilter,
        dateRange,
        sourcePlatform,
      };

      if (onFiltersChange) {
        onFiltersChange(filters);
      }

      onOpenChange(false);
    };

    const handleClearFilters = () => {
      setNameSearch("");
      setEmailSearch("");
      setPhoneSearch("");
      setStatusFilter("all");
      setTimeFilter("all");
      setDateRange(null);
      setSourcePlatform("all");

      if (onFiltersChange) {
        onFiltersChange({});
      }
    };

    const hasActiveFilters = useMemo(() => {
      return (
        nameSearch.trim() ||
        emailSearch.trim() ||
        phoneSearch.trim() ||
        statusFilter !== "all" ||
        timeFilter !== "all" ||
        dateRange ||
        (sourcePlatform && sourcePlatform !== "all")
      );
    }, [
      nameSearch,
      emailSearch,
      phoneSearch,
      statusFilter,
      timeFilter,
      dateRange,
      sourcePlatform,
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
              {
                [
                  nameSearch.trim(),
                  emailSearch.trim(),
                  phoneSearch.trim(),
                  statusFilter !== "all",
                  timeFilter !== "all",
                  sourcePlatform && sourcePlatform !== "all",
                ].filter(Boolean).length
              }
            </div>
          )}
        </div>

        <Modal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          placement="center"
          backdrop="blur"
          size="2xl"
          scrollBehavior="inside"
          classNames={{
            base: "bg-white max-h-[calc(100vh-150px)]",
            header: "border-b border-gray-100 sticky top-0 z-10",
            body: "py-6 overflow-y-auto",
            footer: "border-t border-gray-100 sticky bottom-0 z-20 bg-white",
          }}
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1 px-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FunnelIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        Filter Leads
                      </h3>
                      <p className="text-xs text-gray-500 font-normal">
                        Refine your lead list with filters
                      </p>
                    </div>
                    {hasActiveFilters && (
                      <Chip
                        color="primary"
                        size="sm"
                        variant="flat"
                        className="font-medium text-xs"
                      >
                        {
                          [
                            nameSearch.trim(),
                            emailSearch.trim(),
                            phoneSearch.trim(),
                            statusFilter !== "all",
                            timeFilter !== "all",
                            sourcePlatform && sourcePlatform !== "all",
                          ].filter(Boolean).length
                        }{" "}
                        Active
                      </Chip>
                    )}
                  </div>
                </ModalHeader>
                <ModalBody className="space-y-4 px-6">
                  {/* Search Fields Section */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                      Search
                    </h4>

                    {/* Search by Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700">
                        Name
                      </label>
                      <Autocomplete
                        placeholder="Search by name..."
                        value={nameSearch}
                        onInputChange={setNameSearch}
                        allowsCustomValue
                        size="sm"
                        variant="bordered"
                        classNames={{
                          base: "w-full",
                          listboxWrapper: "max-h-[200px]",
                        }}
                      >
                        {nameOptions.map((option) => (
                          <AutocompleteItem key={option.key} value={option.key}>
                            {option.label}
                          </AutocompleteItem>
                        ))}
                      </Autocomplete>
                    </div>

                    {/* Search by Email */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700">
                        Email
                      </label>
                      <Autocomplete
                        placeholder="Search by email..."
                        value={emailSearch}
                        onInputChange={setEmailSearch}
                        allowsCustomValue
                        size="sm"
                        variant="bordered"
                        classNames={{
                          base: "w-full",
                          listboxWrapper: "max-h-[200px]",
                        }}
                      >
                        {emailOptions.map((option) => (
                          <AutocompleteItem key={option.key} value={option.key}>
                            {option.label}
                          </AutocompleteItem>
                        ))}
                      </Autocomplete>
                    </div>

                    {/* Search by Phone */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-700">
                        Phone Number
                      </label>
                      <Input
                        placeholder="Search by phone number..."
                        value={phoneSearch}
                        onValueChange={setPhoneSearch}
                        size="sm"
                        variant="bordered"
                      />
                    </div>
                  </div>

                  {/* Filters Section */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                      Filters
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Status Filter */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700">
                          Status
                        </label>
                        <Select
                          selectedKeys={[statusFilter]}
                          onSelectionChange={(keys) =>
                            setStatusFilter(Array.from(keys)[0])
                          }
                          size="sm"
                          variant="bordered"
                          placeholder="Select status"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>

                      {/* Time Filter */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700">
                          Time Period
                        </label>
                        <Select
                          selectedKeys={[timeFilter]}
                          onSelectionChange={(keys) =>
                            setTimeFilter(Array.from(keys)[0])
                          }
                          size="sm"
                          variant="bordered"
                          placeholder="Select time period"
                        >
                          {TIME_FILTER_OPTIONS.map((option) => (
                            <SelectItem key={option.key} value={option.key}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>
                    </div>

                    {/* Custom Date Range */}
                    {timeFilter === "custom" && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-gray-700">
                          Custom Date Range
                        </label>
                        <I18nProvider locale="en-GB">
                          <DateRangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            maxValue={today(getLocalTimeZone())}
                            size="sm"
                            variant="bordered"
                            visibleMonths={1}
                          />
                        </I18nProvider>
                      </div>
                    )}
                  </div>

                  {/* Active Filters Summary */}
                  {hasActiveFilters && (
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                          Active Filters
                        </h4>
                        <button
                          onClick={handleClearFilters}
                          className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                        >
                          <XMarkIcon className="w-3 h-3" />
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {nameSearch.trim() && (
                          <Chip
                            color="primary"
                            size="sm"
                            variant="flat"
                            onClose={() => setNameSearch("")}
                            classNames={{
                              base: "text-xs",
                              content: "text-xs",
                            }}
                          >
                            Name: {nameSearch}
                          </Chip>
                        )}
                        {emailSearch.trim() && (
                          <Chip
                            color="primary"
                            size="sm"
                            variant="flat"
                            onClose={() => setEmailSearch("")}
                            classNames={{
                              base: "text-xs",
                              content: "text-xs",
                            }}
                          >
                            Email: {emailSearch}
                          </Chip>
                        )}
                        {phoneSearch.trim() && (
                          <Chip
                            color="primary"
                            size="sm"
                            variant="flat"
                            onClose={() => setPhoneSearch("")}
                            classNames={{
                              base: "text-xs",
                              content: "text-xs",
                            }}
                          >
                            Phone: {phoneSearch}
                          </Chip>
                        )}
                        {statusFilter !== "all" && (
                          <Chip
                            color="secondary"
                            size="sm"
                            variant="flat"
                            onClose={() => setStatusFilter("all")}
                            classNames={{
                              base: "text-xs",
                              content: "text-xs",
                            }}
                          >
                            Status:{" "}
                            {
                              STATUS_OPTIONS.find((s) => s.key === statusFilter)
                                ?.label
                            }
                          </Chip>
                        )}
                        {timeFilter !== "all" && (
                          <Chip
                            color="warning"
                            size="sm"
                            variant="flat"
                            onClose={() => {
                              setTimeFilter("all");
                              setDateRange(null);
                            }}
                            classNames={{
                              base: "text-xs",
                              content: "text-xs",
                            }}
                          >
                            Time:{" "}
                            {
                              TIME_FILTER_OPTIONS.find(
                                (t) => t.key === timeFilter,
                              )?.label
                            }
                          </Chip>
                        )}
                        {sourcePlatform && sourcePlatform !== "all" && (
                          <Chip
                            color="success"
                            size="sm"
                            variant="flat"
                            onClose={() => setSourcePlatform("all")}
                            classNames={{
                              base: "text-xs",
                              content: "text-xs",
                            }}
                          >
                            Platform: {sourcePlatform}
                          </Chip>
                        )}
                      </div>
                    </div>
                  )}
                </ModalBody>
                <ModalFooter className="px-6">
                  <Button
                    color="danger"
                    variant="light"
                    onPress={handleClearFilters}
                    startContent={<XMarkIcon className="w-4 h-4" />}
                    className="font-medium text-sm"
                    size="sm"
                  >
                    Clear All
                  </Button>
                  <div className="flex-1"></div>
                  <Button
                    color="default"
                    variant="bordered"
                    onPress={onClose}
                    className="font-medium text-sm"
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    color="primary"
                    onPress={handleApplyFilters}
                    className="font-medium bg-blue-600 hover:bg-blue-700 text-sm"
                    size="sm"
                  >
                    Apply Filters
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    );
  },
);

Filter.displayName = "Filter";

export default Filter;
