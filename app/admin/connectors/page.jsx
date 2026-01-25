"use client";
import { Button } from "@heroui/button";
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserCircleIcon,
  UserGroupIcon,
  LinkIcon,
} from "@heroicons/react/24/solid";
import { Chip, Switch, Tab, Tabs, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, DateRangePicker, Checkbox, addToast } from "@heroui/react";
import Image from "next/image";
import { useState, useEffect } from "react";
import CustomModal from "./components/CustomModal";
import NinetyNineAcresModal from "./components/NinetyNineAcresModal";
import { parseDate } from "@internationalized/date";

export default function ConnectorsPage() {
  const [isFacebookEnabled, setIsFacebookEnabled] = useState(false);
  const [facebookPages, setFacebookPages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStats, setSyncStats] = useState({
    totalLeads: 0,
    activePage: null,
  });
  const [selectedTab, setSelectedTab] = useState("available");
  const [hasEverConnected, setHasEverConnected] = useState(false);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange } = useDisclosure();
  const { isOpen: isToggleOpen, onOpen: onToggleOpen, onOpenChange: onToggleOpenChange } = useDisclosure();
  const { isOpen: isToggleAllOpen, onOpen: onToggleAllOpen, onOpenChange: onToggleAllOpenChange } = useDisclosure();
  const [instanceToDelete, setInstanceToDelete] = useState(null);
  const [instanceToToggle, setInstanceToToggle] = useState(null);
  const [toggleAction, setToggleAction] = useState(null);
  const [toggleAllAction, setToggleAllAction] = useState(null);
  const [ninetyNineAcresAccounts, setNinetyNineAcresAccounts] = useState([]);
  const { isOpen: is99AcresOpen, onOpen: on99AcresOpen, onOpenChange: on99AcresOpenChange } = useDisclosure();
  const { isOpen: isSyncDateOpen, onOpen: onSyncDateOpen, onOpenChange: onSyncDateOpenChange } = useDisclosure();
  const [syncPageId, setSyncPageId] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  const [isAllTime, setIsAllTime] = useState(true);

  useEffect(() => {
    fetchFacebookPages();
    fetch99AcresAccounts();

    // Handle Facebook auth success callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("facebook_auth") === "success") {
      // Refresh the page to remove the parameter and reload data
      window.history.replaceState({}, "", "/admin/connectors");
      fetchFacebookPages();
    }
  }, []);

  const fetchFacebookPages = async () => {
    try {
      const response = await fetch("/api/facebook/pages");
      const pages = await response.json();
      setFacebookPages(pages);

      // Check if any pages exist (ever connected)
      if (pages && pages.length > 0) {
        setHasEverConnected(true);
      }

      const activePage = pages.find((page) => page.isActive);
      if (activePage) {
        setIsFacebookEnabled(true);
        setSyncStats((prev) => ({ ...prev, activePage: activePage.name }));
      }

      // Count total leads from ALL pages (both enabled and disabled)
      const totalLeads = pages.reduce((total, page) => {
        const pageLeads = page.leadForms?.reduce(
          (sum, form) => sum + (form.leads?.length || 0),
          0,
        ) || 0;
        return total + pageLeads;
      }, 0);
      setSyncStats((prev) => ({ ...prev, totalLeads }));
    } catch (error) {
      console.error("Error fetching Facebook pages:", error);
    }
  };

  const fetch99AcresAccounts = async () => {
    try {
      const response = await fetch("/api/99acres/accounts");
      if (!response.ok) {
        console.error("Error fetching 99acres accounts:", response.statusText);
        return;
      }
      const accounts = await response.json();
      setNinetyNineAcresAccounts(accounts);

      // Count total leads from 99acres by querying the database through the accounts
      const totalLeads99 = accounts.reduce((total, account) => {
        return total + (account.totalLeads || 0);
      }, 0);
      
      setSyncStats((prev) => ({ 
        ...prev, 
        totalLeads: prev.totalLeads + totalLeads99
      }));
    } catch (error) {
      console.error("Error fetching 99acres accounts:", error);
      setNinetyNineAcresAccounts([]); // Set empty array on error
    }
  };

  const handleFacebookAuth = () => {
    window.location.href = "/api/facebook/auth";
  };

  const toggleFacebookIntegration = async () => {
    if (!facebookPages.length) {
      // Need to authenticate first
      handleFacebookAuth();
      return;
    }

    setIsLoading(true);
    try {
      const firstPage = facebookPages[0];
      const action = isFacebookEnabled ? "disable" : "enable";

      const response = await fetch("/api/facebook/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: firstPage.pageId, action }),
      });

      const result = await response.json();

      if (result.success) {
        setIsFacebookEnabled(!isFacebookEnabled);
        await fetchFacebookPages(); // Refresh page data
        onOpen(); // Show success modal
      } else {
        console.error("Error toggling Facebook integration:", result.error);
      }
    } catch (error) {
      console.error("Error toggling Facebook integration:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openSyncDateModal = (pageId) => {
    setSyncPageId(pageId);
    setDateRange(null);
    setIsAllTime(true);
    onSyncDateOpen();
  };

  const syncMetaLeads = async () => {
    setIsLoading(true);
    onSyncDateOpenChange(false);
    
    try {
      const payload = { pageId: syncPageId };
      
      // Add date range if not all time
      if (!isAllTime && dateRange) {
        payload.startDate = `${dateRange.start.year}-${String(dateRange.start.month).padStart(2, '0')}-${String(dateRange.start.day).padStart(2, '0')}`;
        payload.endDate = `${dateRange.end.year}-${String(dateRange.end.month).padStart(2, '0')}-${String(dateRange.end.day).padStart(2, '0')}`;
      }

      const response = await fetch("/api/facebook/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        await fetchFacebookPages(); // Refresh data
        
        if (result.leadsSynced === 0) {
          addToast({
            title: "Sync Complete",
            description: "No new leads found. All leads are already synced!",
            type: "info",
            duration: 5000,
          });
        } else {
          addToast({
            title: "Sync Successful",
            description: `Successfully synced ${result.leadsSynced} new ${result.leadsSynced === 1 ? 'lead' : 'leads'}!`,
            type: "success",
            duration: 5000,
          });
        }
      } else {
        addToast({
          title: "Sync Failed",
          description: result.error || "Failed to sync leads",
          type: "error",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error syncing Meta leads:", error);
      addToast({
        title: "Sync Error",
        description: "An unexpected error occurred while syncing leads",
        type: "error",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
      setSyncPageId(null);
    }
  };

  const sync99AcresLeads = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/99acres/sync", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        await fetch99AcresAccounts();
        
        if (result.leadsSynced === 0) {
          addToast({
            title: "Sync Complete",
            description: "No new leads found from 99acres. All leads are already synced!",
            type: "info",
            duration: 5000,
          });
        } else {
          addToast({
            title: "Sync Successful",
            description: `Successfully synced ${result.leadsSynced} new ${result.leadsSynced === 1 ? 'lead' : 'leads'} from 99acres!`,
            type: "success",
            duration: 5000,
          });
        }
      } else {
        addToast({
          title: "Sync Failed",
          description: result.error || "Failed to sync 99acres leads",
          type: "error",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error("Error syncing 99acres leads:", error);
      addToast({
        title: "Sync Error",
        description: "An unexpected error occurred while syncing 99acres leads",
        type: "error",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggle99AcresAccount = async (account, action) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/99acres/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account._id, action }),
      });

      const result = await response.json();
      if (result.success) {
        await fetch99AcresAccounts();
      }
    } catch (error) {
      console.error("Error toggling 99acres account:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const delete99AcresAccount = async (account) => {
    if (!account) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/99acres/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account._id }),
      });

      const result = await response.json();
      if (result.success) {
        await fetch99AcresAccounts();
        onDeleteOpenChange();
        setInstanceToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting 99acres account:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmToggleInstance = async () => {
    if (!instanceToToggle || !toggleAction) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/facebook/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: instanceToToggle.pageId, action: toggleAction }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchFacebookPages(); // Refresh page data
        onToggleOpenChange(); // Close confirmation modal
        setInstanceToToggle(null);
        setToggleAction(null);
      } else {
        alert("Error toggling instance: " + result.error);
      }
    } catch (error) {
      console.error("Error toggling instance:", error);
      alert("Error toggling instance");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmToggleAllInstances = async () => {
    if (!toggleAllAction) return;

    setIsLoading(true);
    const relevantPages = toggleAllAction === "enable" 
      ? facebookPages.filter(p => !p.isActive)
      : facebookPages.filter(p => p.isActive);

    try {
      for (const page of relevantPages) {
        await fetch("/api/facebook/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pageId: page.pageId, action: toggleAllAction }),
        });
      }
      await fetchFacebookPages(); // Refresh page data
      onToggleAllOpenChange(); // Close confirmation modal
      setToggleAllAction(null);
    } catch (error) {
      console.error(`Error ${toggleAllAction}ing all instances:`, error);
      alert(`Error ${toggleAllAction}ing all instances`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInstance = async () => {
    if (!instanceToDelete) return;

    // Check if it's a 99acres account or Facebook page
    if (instanceToDelete.username) {
      // It's a 99acres account
      await delete99AcresAccount(instanceToDelete);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/facebook/pages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: instanceToDelete.pageId }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchFacebookPages(); // Refresh page data
        onDeleteOpenChange(); // Close modal
        setInstanceToDelete(null);
      } else {
        alert("Error deleting instance: " + result.error);
      }
    } catch (error) {
      console.error("Error deleting instance:", error);
      alert("Error deleting instance");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-xs font-medium mb-1">
                System Management 🔗
              </p>
              <h1 className="text-xl font-bold text-white mb-1">
                Integrations
              </h1>
              <p className="text-blue-100 text-xs">Manage system connectors</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 text-white">
              <LinkIcon className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="px-3 py-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-3">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-2 sm:p-3 text-center shadow-sm">
            <div className="text-lg sm:text-xl font-bold text-green-600">
              {facebookPages.filter(p => p.isActive).length + ninetyNineAcresAccounts.filter(a => a.isActive).length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Enabled</div>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-2 sm:p-3 text-center shadow-sm">
            <div className="text-lg sm:text-xl font-bold text-orange-600">
              {facebookPages.filter(p => !p.isActive).length + ninetyNineAcresAccounts.filter(a => !a.isActive).length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Disabled</div>
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-lg p-2 sm:p-3 text-center shadow-sm col-span-2 sm:col-span-1">
            <div className="text-lg sm:text-xl font-bold text-purple-600">
              {syncStats.totalLeads}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Total leads</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pb-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              All Integrations
            </h3>
            <p className="text-sm text-gray-600">Manage your integrations</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <Tabs
              aria-label="Integration filters"
              color="primary"
              radius="lg"
              size="sm"
              variant="underlined"
              selectedKey={selectedTab}
              onSelectionChange={setSelectedTab}
              classNames={{
                tabList:
                  "gap-2 sm:gap-4 w-full relative rounded-none p-0 border-b border-divider",
                cursor: "w-full bg-gradient-to-r from-blue-500 to-purple-500",
                tab: "max-w-fit px-1 sm:px-0 h-7 sm:h-8 min-w-fit",
                tabContent:
                  "group-data-[selected=true]:text-blue-600 font-medium text-xs sm:text-sm",
              }}
            >
              <Tab key="available" title="Available" />
              <Tab key="enabled" title="Enabled" />
              <Tab key="disabled" title="Disabled" />
              <Tab key="upcoming" title="Soon" />
            </Tabs>
          </div>

          {/* Integration Cards Grid */}
          <div className="space-y-4">
            {/* Meta Lead Ads - Available Tab */}
            {selectedTab === "available" && (
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-2 pb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex items-center gap-1 bg-white rounded-lg p-1.5 sm:p-2 shadow-sm flex-shrink-0">
                    <Image
                      src="/icons/facebookIcon.svg"
                      alt="Facebook"
                      width={24}
                      height={24}
                    />
                    <span className="text-gray-400 text-xs sm:text-sm font-bold">+</span>
                    <Image
                      src="/icons/instagramIcon.svg"
                      alt="Instagram"
                      width={24}
                      height={24}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm sm:text-base text-gray-900">
                      Meta Lead Ads
                    </h4>
                    <p className="text-[10px] sm:text-xs text-gray-500">Facebook + Instagram</p>
                  </div>
                </div>
                <Button
                  color="primary"
                  variant="solid"
                  size="sm"
                  radius="md"
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-xs sm:text-sm px-3 sm:px-4 py-1 h-7 sm:h-8 whitespace-nowrap"
                  onClick={handleFacebookAuth}
                  isDisabled={isLoading}
                >
                  + Add
                </Button>
              </div>

              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Auto-fetch leads from Facebook and Instagram Lead Ads in real-time and sync
                with your CRM.
              </p>
            </div>
            )}

            {/* Meta Lead Ads - Enabled Tab */}
            {selectedTab === "enabled" && facebookPages.filter(p => p.isActive).length > 0 && (
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="flex items-center gap-1 bg-white rounded-lg p-1.5 sm:p-2 shadow-sm flex-shrink-0">
                    <Image
                      src="/icons/facebookIcon.svg"
                      alt="Facebook"
                      width={24}
                      height={24}
                    />
                    <span className="text-gray-400 text-xs sm:text-sm font-bold">+</span>
                    <Image
                      src="/icons/instagramIcon.svg"
                      alt="Instagram"
                      width={24}
                      height={24}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm sm:text-base text-gray-900">
                      Meta Lead Ads
                    </h4>
                    <p className="text-[10px] sm:text-xs text-gray-500">Facebook + Instagram</p>
                  </div>
                </div>
                <Button
                  color="warning"
                  variant="flat"
                  size="sm"
                  radius="md"
                  className="text-xs sm:text-sm px-3 sm:px-4 py-1 h-7 sm:h-8 whitespace-nowrap"
                  onClick={() => {
                    setToggleAllAction("disable");
                    onToggleAllOpen();
                  }}
                  isDisabled={isLoading}
                >
                  Disable All
                </Button>
              </div>

              <div className="space-y-2">
                {facebookPages.filter(page => page.isActive).map((page) => (
                  <div
                    key={page.pageId}
                    className="bg-white rounded-lg p-2 sm:p-3 border border-green-200 shadow-sm space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="bg-green-100 rounded-md p-1 flex-shrink-0">
                          <UserCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base text-gray-900 truncate">
                            {page.name}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Active since {new Date(page.lastUpdated).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Chip
                        color="primary"
                        startContent={<UserGroupIcon className="w-3 sm:w-3.5" />}
                        variant="flat"
                        size="md"
                        className="text-xs sm:text-sm flex-shrink-0"
                      >
                        {page.leadForms?.reduce(
                          (sum, form) => sum + (form.leads?.length || 0),
                          0,
                        ) || 0}
                      </Chip>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                        <Button
                          color="secondary"
                          variant="flat"
                          size="sm"
                          radius="md"
                          className="text-xs sm:text-sm px-2.5 py-1 h-7 sm:h-8"
                          onClick={() => openSyncDateModal(page.pageId)}
                          isDisabled={isLoading}
                        >
                          Sync
                        </Button>
                        <Button
                          color="warning"
                          variant="flat"
                          size="sm"
                          radius="md"
                          className="text-xs sm:text-sm px-2.5 py-1 h-7 sm:h-8"
                          onClick={() => {
                            setInstanceToToggle(page);
                            setToggleAction("disable");
                            onToggleOpen();
                          }}
                          isDisabled={isLoading}
                        >
                          Disable
                        </Button>
                        <Button
                          color="danger"
                          variant="flat"
                          size="sm"
                          radius="md"
                          className="text-xs sm:text-sm px-2.5 py-1 h-7 sm:h-8"
                          onClick={() => {
                            setInstanceToDelete(page);
                            onDeleteOpen();
                          }}
                          isDisabled={isLoading}
                        >
                          Delete
                        </Button>
                      </div>

                    {page.leadForms?.length > 0 && (
                      <div className="border-t border-gray-100 pt-2">
                        <p className="text-xs sm:text-sm text-gray-600 mb-2">
                          Active Lead Forms ({page.leadForms.length}):
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {page.leadForms.map((form) => (
                            <div
                              key={form.formId}
                              className="bg-white rounded-lg p-2 border border-gray-200 hover:border-blue-300 transition-colors"
                            >
                              <p className="text-xs font-medium text-gray-900 truncate mb-1" title={form.name}>
                                {form.name}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-500">Form ID: {form.formId.slice(0, 8)}...</span>
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  color="primary"
                                  className="text-[10px] h-5"
                                >
                                  {form.leads?.length || 0} leads
                                </Chip>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* Meta Lead Ads - Disabled Tab */}
            {selectedTab === "disabled" && facebookPages.filter(p => !p.isActive).length > 0 && (
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="flex items-center gap-1 bg-white rounded-lg p-1.5 sm:p-2 shadow-sm flex-shrink-0">
                    <Image
                      src="/icons/facebookIcon.svg"
                      alt="Facebook"
                      width={24}
                      height={24}
                    />
                    <span className="text-gray-400 text-xs sm:text-sm font-bold">+</span>
                    <Image
                      src="/icons/instagramIcon.svg"
                      alt="Instagram"
                      width={24}
                      height={24}
                    />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm sm:text-base text-gray-900">
                      Meta Lead Ads
                    </h4>
                    <p className="text-[10px] sm:text-xs text-gray-500">Facebook + Instagram</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {facebookPages.filter(page => !page.isActive).map((page) => (
                  <div
                    key={page.pageId}
                    className="bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-200 shadow-sm space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="bg-gray-200 rounded-md p-1 flex-shrink-0">
                          <UserCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base text-gray-900 truncate">
                            {page.name}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Disabled
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          color="success"
                          variant="flat"
                          size="sm"
                          radius="md"
                          className="text-xs sm:text-sm px-2.5 py-1 h-7 sm:h-8"
                          onClick={() => {
                            setInstanceToToggle(page);
                            setToggleAction("enable");
                            onToggleOpen();
                          }}
                          isDisabled={isLoading}
                        >
                          Enable
                        </Button>
                        <Button
                          color="danger"
                          variant="flat"
                          size="sm"
                          radius="md"
                          className="text-xs sm:text-sm px-2.5 py-1 h-7 sm:h-8"
                          onClick={() => {
                            setInstanceToDelete(page);
                            onDeleteOpen();
                          }}
                          isDisabled={isLoading}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* 99acres Integration - Available Tab */}
            {selectedTab === "available" && (
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-green-50 hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-2 pb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="bg-white rounded-lg p-1.5 sm:p-2 shadow-sm flex-shrink-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-emerald-600 to-green-600 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold text-xs">99</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm sm:text-base text-gray-900">
                      99acres
                    </h4>
                    <p className="text-[10px] sm:text-xs text-gray-500">Real Estate Leads</p>
                  </div>
                </div>
                <Button
                  color="primary"
                  variant="solid"
                  size="sm"
                  radius="md"
                  className="bg-gradient-to-r from-emerald-500 to-green-500 text-xs sm:text-sm px-3 sm:px-4 py-1 h-7 sm:h-8 whitespace-nowrap"
                  onClick={on99AcresOpen}
                  isDisabled={isLoading}
                >
                  + Add
                </Button>
              </div>

              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Auto-sync real estate leads from 99acres property inquiries and contact forms.
              </p>
            </div>
            )}

            {/* 99acres - Enabled Tab */}
            {selectedTab === "enabled" && ninetyNineAcresAccounts.filter(a => a.isActive).length > 0 && (
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-green-50 hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="bg-white rounded-lg p-1.5 sm:p-2 shadow-sm flex-shrink-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-emerald-600 to-green-600 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold text-xs">99</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm sm:text-base text-gray-900">99acres</h4>
                    <p className="text-[10px] sm:text-xs text-gray-500">Real Estate Leads</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {ninetyNineAcresAccounts.filter(acc => acc.isActive).map((account) => (
                  <div
                    key={account._id}
                    className="bg-white rounded-lg p-2 sm:p-3 border border-green-200 shadow-sm space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="bg-green-100 rounded-md p-1 flex-shrink-0">
                          <UserCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base text-gray-900 truncate">
                            {account.username}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Active since {new Date(account.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <Button
                        color="secondary"
                        variant="flat"
                        size="sm"
                        radius="md"
                        className="text-xs sm:text-sm px-2.5 py-1 h-7 sm:h-8"
                        onClick={sync99AcresLeads}
                        isDisabled={isLoading}
                      >
                        Sync
                      </Button>
                      <Button
                        color="warning"
                        variant="flat"
                        size="sm"
                        radius="md"
                        className="text-xs sm:text-sm px-2.5 py-1 h-7 sm:h-8"
                        onClick={() => toggle99AcresAccount(account, "disable")}
                        isDisabled={isLoading}
                      >
                        Disable
                      </Button>
                      <Button
                        color="danger"
                        variant="flat"
                        size="sm"
                        radius="md"
                        className="text-xs sm:text-sm px-2.5 py-1 h-7 sm:h-8"
                        onClick={() => {
                          setInstanceToDelete(account);
                          onDeleteOpen();
                        }}
                        isDisabled={isLoading}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* 99acres - Disabled Tab */}
            {selectedTab === "disabled" && ninetyNineAcresAccounts.filter(a => !a.isActive).length > 0 && (
            <div className="border border-gray-200 rounded-xl p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 mb-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="bg-white rounded-lg p-1.5 sm:p-2 shadow-sm flex-shrink-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-emerald-600 to-green-600 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold text-xs">99</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm sm:text-base text-gray-900">99acres</h4>
                    <p className="text-[10px] sm:text-xs text-gray-500">Real Estate Leads</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {ninetyNineAcresAccounts.filter(acc => !acc.isActive).map((account) => (
                  <div
                    key={account._id}
                    className="bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-200 shadow-sm space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="bg-gray-200 rounded-md p-1 flex-shrink-0">
                          <UserCircleIcon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base text-gray-900 truncate">
                            {account.username}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-500">Disabled</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          color="success"
                          variant="flat"
                          size="sm"
                          radius="md"
                          className="text-xs sm:text-sm px-2.5 py-1 h-7 sm:h-8"
                          onClick={() => toggle99AcresAccount(account, "enable")}
                          isDisabled={isLoading}
                        >
                          Enable
                        </Button>
                        <Button
                          color="danger"
                          variant="flat"
                          size="sm"
                          radius="md"
                          className="text-xs sm:text-sm px-2.5 py-1 h-7 sm:h-8"
                          onClick={() => {
                            setInstanceToDelete(account);
                            onDeleteOpen();
                          }}
                          isDisabled={isLoading}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* MagicBricks Integration Card */}
            {selectedTab === "upcoming" && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gradient-to-r from-orange-50 to-yellow-50 hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start pb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold text-xs">MB</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-gray-900">
                      MagicBricks
                    </h4>
                    <Chip
                      color="warning"
                      startContent={<ShieldExclamationIcon className="w-3" />}
                      variant="flat"
                      size="sm"
                      className="mt-1 text-sm"
                    >
                      Coming Soon
                    </Chip>
                  </div>
                </div>
                <Switch
                  isSelected={false}
                  isDisabled={true}
                  color="primary"
                  size="sm"
                  aria-label="MagicBricks integration"
                />
              </div>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                Connect with MagicBricks to capture property leads and buyer
                inquiries automatically.
              </p>
              <div className="bg-orange-100 rounded-lg p-3 border border-orange-200">
                <p className="text-sm text-orange-700 text-center font-medium">
                  🏢 Property portal integration coming soon!
                </p>
              </div>
            </div>
            )}

            {/* Housing.com Integration Card */}
            {selectedTab === "upcoming" && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gradient-to-r from-teal-50 to-cyan-50 hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start pb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="w-8 h-8 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold text-xs">H</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-gray-900">
                      Housing.com
                    </h4>
                    <Chip
                      color="warning"
                      startContent={<ShieldExclamationIcon className="w-3" />}
                      variant="flat"
                      size="sm"
                      className="mt-1 text-sm"
                    >
                      Coming Soon
                    </Chip>
                  </div>
                </div>
                <Switch
                  isSelected={false}
                  isDisabled={true}
                  color="primary"
                  size="sm"
                  aria-label="Housing.com integration"
                />
              </div>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                Sync leads from Housing.com property searches and rental
                inquiries seamlessly.
              </p>
              <div className="bg-teal-100 rounded-lg p-3 border border-teal-200">
                <p className="text-sm text-teal-700 text-center font-medium">
                  🏘️ Housing integration in pipeline!
                </p>
              </div>
            </div>
            )}

            {/* OLX Homes Integration Card */}
            {selectedTab === "upcoming" && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gradient-to-r from-violet-50 to-purple-50 hover:shadow-md transition-all duration-300">
              <div className="flex justify-between items-start pb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="w-8 h-8 bg-gradient-to-r from-violet-600 to-purple-600 rounded-md flex items-center justify-center">
                      <span className="text-white font-bold text-xs">OLX</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-gray-900">
                      OLX Homes
                    </h4>
                    <Chip
                      color="warning"
                      startContent={<ShieldExclamationIcon className="w-3" />}
                      variant="flat"
                      size="sm"
                      className="mt-1 text-sm"
                    >
                      Coming Soon
                    </Chip>
                  </div>
                </div>
                <Switch
                  isSelected={false}
                  isDisabled={true}
                  color="primary"
                  size="sm"
                  aria-label="OLX Homes integration"
                />
              </div>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                Capture leads from OLX property listings and home buyer/seller
                interactions.
              </p>
              <div className="bg-violet-100 rounded-lg p-3 border border-violet-200">
                <p className="text-sm text-violet-700 text-center font-medium">
                  🔑 Marketplace integration coming soon!
                </p>
              </div>
            </div>
            )}

            {/* Empty State for Filters */}
            {((selectedTab === "enabled" && facebookPages.filter(p => p.isActive).length === 0 && ninetyNineAcresAccounts.filter(a => a.isActive).length === 0) ||
              (selectedTab === "disabled" && facebookPages.filter(p => !p.isActive).length === 0 && ninetyNineAcresAccounts.filter(a => !a.isActive).length === 0)) && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LinkIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  No {selectedTab} integrations
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedTab === "enabled" 
                    ? "Enable an integration to get started"
                    : "No integrations have been disabled yet"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <CustomModal isOpen={isOpen} onOpenChange={onOpenChange} />
      <NinetyNineAcresModal 
        isOpen={is99AcresOpen} 
        onOpenChange={on99AcresOpenChange}
        onSuccess={fetch99AcresAccounts}
      />
      
      {/* Delete Confirmation Modal */}
      <CustomModal 
        isOpen={isDeleteOpen} 
        onOpenChange={onDeleteOpenChange}
        title="Delete Instance"
        message={`Are you sure you want to delete "${instanceToDelete?.name || instanceToDelete?.username}"? This action cannot be undone.`}
        onConfirm={handleDeleteInstance}
        confirmText="Delete"
        confirmColor="danger"
      />

      {/* Enable/Disable Instance Confirmation Modal */}
      <CustomModal 
        isOpen={isToggleOpen} 
        onOpenChange={onToggleOpenChange}
        title={toggleAction === "enable" ? "Enable Instance" : "Disable Instance"}
        message={toggleAction === "enable" 
          ? `Are you sure you want to enable "${instanceToToggle?.name}"? This will start accepting leads from this page.`
          : `Are you sure you want to disable "${instanceToToggle?.name}"? This will stop accepting leads from this page.`}
        onConfirm={confirmToggleInstance}
        confirmText={toggleAction === "enable" ? "Enable" : "Disable"}
        confirmColor={toggleAction === "enable" ? "success" : "warning"}
      />

      {/* Enable/Disable All Instances Confirmation Modal */}
      <CustomModal 
        isOpen={isToggleAllOpen} 
        onOpenChange={onToggleAllOpenChange}
        title={toggleAllAction === "enable" ? "Enable All Instances" : "Disable All Instances"}
        message={toggleAllAction === "enable" 
          ? `Are you sure you want to enable all ${facebookPages.filter(p => !p.isActive).length} disabled instance(s)? This will start accepting leads from all pages.`
          : `Are you sure you want to disable all ${facebookPages.filter(p => p.isActive).length} enabled instance(s)? This will stop accepting leads from all pages.`}
        onConfirm={confirmToggleAllInstances}
        confirmText={toggleAllAction === "enable" ? "Enable All" : "Disable All"}
        confirmColor={toggleAllAction === "enable" ? "success" : "warning"}
      />

      {/* Sync Date Range Modal */}
      <Modal 
        isOpen={isSyncDateOpen} 
        onOpenChange={onSyncDateOpenChange}
        size="lg"
        backdrop="blur"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h3 className="text-xl font-semibold">Select Sync Date Range</h3>
                <p className="text-sm text-gray-500 font-normal">
                  Choose the date range for syncing leads from Facebook
                </p>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Checkbox
                    isSelected={isAllTime}
                    onValueChange={(checked) => {
                      setIsAllTime(checked);
                      if (checked) {
                        setDateRange(null);
                      }
                    }}
                  >
                    <span className="text-sm font-medium">All Time</span>
                    <span className="text-xs text-gray-500 block">
                      Sync all available leads regardless of date
                    </span>
                  </Checkbox>

                  {!isAllTime && (
                    <div className="pt-2">
                      <DateRangePicker
                        label="Date Range"
                        labelPlacement="outside"
                        value={dateRange}
                        onChange={setDateRange}
                        className="w-full"
                        variant="bordered"
                        description="Select the start and end date for syncing leads"
                      />
                    </div>
                  )}

                  {!isAllTime && !dateRange && (
                    <p className="text-sm text-warning-500">
                      Please select a date range or enable "All Time"
                    </p>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button 
                  color="danger" 
                  variant="light" 
                  onPress={onClose}
                >
                  Cancel
                </Button>
                <Button 
                  color="primary" 
                  onPress={syncMetaLeads}
                  isDisabled={!isAllTime && !dateRange}
                  isLoading={isLoading}
                >
                  Sync Leads
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
