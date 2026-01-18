"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Textarea,
  useDisclosure,
  Spinner,
  addToast,
} from "@heroui/react";
import {
  ShieldCheckIcon,
  UserGroupIcon,
  PlusIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowRightStartOnRectangleIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import axios from "@/lib/axios";

interface Customer {
  _id: string;
  customerId: string;
  customerName: string;
  databaseName: string;
  adminEmail: string;
  status: "active" | "inactive" | "suspended";
  createdAt: string;
  metadata?: {
    companyName?: string;
    phone?: string;
    address?: string;
  };
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const params = useParams();
  const hash = (params?.hash as string) || "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    customerName: "",
    adminEmail: "",
    adminPassword: "",
    companyName: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("superadmin/customers/list");
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    try {
      setIsSaving(true);

      const payload = {
        customerName: formData.customerName,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        metadata: {
          companyName: formData.companyName || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
        },
      };

      const response = await axios.post("superadmin/customers", payload);

      if (response.data.success) {
        addToast({
          title: "Success!",
          description: `Customer created successfully! ID: ${response.data.customerId}`,
          color: "success",
          classNames: {
            closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
          },
        });
        onClose();
        resetForm();
        fetchCustomers();
      }
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create customer",
        color: "danger",
        classNames: {
          closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateCustomer = async () => {
    try {
      setIsSaving(true);

      if (!selectedCustomer) return;

      const payload = {
        customerId: selectedCustomer.customerId,
        customerName: formData.customerName,
        adminEmail: formData.adminEmail,
        metadata: {
          companyName: formData.companyName || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
        },
      };

      const response = await axios.put("superadmin/customers/list", payload);

      if (response.data.success) {
        addToast({
          title: "Success!",
          description: "Customer updated successfully!",
          color: "success",
          classNames: {
            closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
          },
        });
        onClose();
        resetForm();
        fetchCustomers();
      }
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update customer",
        color: "danger",
        classNames: {
          closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async () => {
    try {
      if (!selectedCustomer) return;

      await axios.delete(
        `superadmin/customers/list?customerId=${selectedCustomer.customerId}`
      );

      addToast({
        title: "Success!",
        description: "Customer and database deleted successfully",
        color: "success",
        classNames: {
          closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
        },
      });
      onDeleteClose();
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (error: any) {
      addToast({
        title: "Error",
        description: error.response?.data?.error || "Failed to delete customer",
        color: "danger",
        classNames: {
          closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
        },
      });
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    resetForm();
    onOpen();
  };

  const openEditModal = (customer: Customer) => {
    setModalMode('edit');
    setSelectedCustomer(customer);
    setFormData({
      customerName: customer.customerName,
      adminEmail: customer.adminEmail,
      adminPassword: '',
      companyName: customer.metadata?.companyName || '',
      phone: customer.metadata?.phone || '',
      address: customer.metadata?.address || '',
    });
    onOpen();
  };

  const openDeleteModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    onDeleteOpen();
  };

  const handleStatusChange = async (customerId: string, status: string) => {
    try {
      await axios.patch("superadmin/customers/list", {
        customerId,
        status,
      });
      addToast({
        title: "Success!",
        description: "Customer status updated successfully",
        color: "success",
        classNames: {
          closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
        },
      });
      fetchCustomers();
    } catch (error) {
      console.error("Error updating status:", error);
      addToast({
        title: "Error",
        description: "Failed to update customer status",
        color: "danger",
        classNames: {
          closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
        },
      });
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post("logout");
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: "",
      adminEmail: "",
      adminPassword: "",
      companyName: "",
      phone: "",
      address: "",
    });
    setShowPassword(false);
    setSelectedCustomer(null);
    setModalMode('create');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "warning";
      case "suspended":
        return "danger";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircleIcon className="w-4 h-4" />;
      case "inactive":
        return <ClockIcon className="w-4 h-4" />;
      case "suspended":
        return <XCircleIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg">
              <ShieldCheckIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                Super Admin Dashboard
              </h1>
              <p className="text-gray-600">Manage customers and organizations</p>
            </div>
          </div>
          <Button
            color="danger"
            variant="flat"
            startContent={<ArrowRightStartOnRectangleIcon className="w-5 h-5" />}
            onPress={handleLogout}
          >
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg">
            <CardBody className="flex flex-row items-center gap-4 p-6">
              <div className="p-3 rounded-xl bg-green-100">
                <UserGroupIcon className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-3xl font-bold text-gray-800">
                  {customers.length}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card className="shadow-lg">
            <CardBody className="flex flex-row items-center gap-4 p-6">
              <div className="p-3 rounded-xl bg-blue-100">
                <CheckCircleIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Customers</p>
                <p className="text-3xl font-bold text-gray-800">
                  {customers.filter((c) => c.status === "active").length}
                </p>
              </div>
            </CardBody>
          </Card>

          <Card className="shadow-lg">
            <CardBody className="flex flex-row items-center gap-4 p-6">
              <div className="p-3 rounded-xl bg-purple-100">
                <BuildingOfficeIcon className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Databases</p>
                <p className="text-3xl font-bold text-gray-800">
                  {customers.length}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Customers Table */}
        <Card className="shadow-lg">
          <CardHeader className="flex justify-between items-center p-6 border-b">
            <div className="flex items-center gap-3">
              <BuildingOfficeIcon className="w-6 h-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-800">
                Customer Organizations
              </h2>
            </div>
            <Button
              color="primary"
              startContent={<PlusIcon className="w-5 h-5" />}
              onPress={openCreateModal}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
            >
              Create New Customer
            </Button>
          </CardHeader>
          <CardBody className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center p-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <Table aria-label="Customers table" removeWrapper>
                <TableHeader>
                  <TableColumn>CUSTOMER NAME</TableColumn>
                  <TableColumn>ADMIN EMAIL</TableColumn>
                  <TableColumn>DATABASE</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn>CREATED</TableColumn>
                  <TableColumn>ACTIONS</TableColumn>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.customerId}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {customer.customerName}
                          </p>
                          {customer.metadata?.companyName && (
                            <p className="text-sm text-gray-500">
                              {customer.metadata.companyName}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-gray-700">{customer.adminEmail}</p>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {customer.databaseName}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Chip
                          color={getStatusColor(customer.status)}
                          variant="flat"
                          startContent={getStatusIcon(customer.status)}
                        >
                          {customer.status}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-600">
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            startContent={<PencilSquareIcon className="w-4 h-4" />}
                            onPress={() => openEditModal(customer)}
                          >
                            Edit
                          </Button>
                          {customer.status !== "active" && (
                            <Button
                              size="sm"
                              color="success"
                              variant="flat"
                              onPress={() =>
                                handleStatusChange(customer.customerId, "active")
                              }
                            >
                              Activate
                            </Button>
                          )}
                          {customer.status === "active" && (
                            <Button
                              size="sm"
                              color="warning"
                              variant="flat"
                              onPress={() =>
                                handleStatusChange(
                                  customer.customerId,
                                  "suspended"
                                )
                              }
                            >
                              Suspend
                            </Button>
                          )}
                          <Button
                            size="sm"
                            color="danger"
                            variant="flat"
                            startContent={<TrashIcon className="w-4 h-4" />}
                            onPress={() => openDeleteModal(customer)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Create/Edit Customer Modal */}
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          size="2xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">
                {modalMode === 'create' ? 'Create New Customer' : 'Edit Customer'}
              </h2>
              <p className="text-sm text-gray-500 font-normal">
                {modalMode === 'create'
                  ? 'Set up a new customer organization with dedicated database'
                  : 'Update customer information and details'}
              </p>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <Input
                  label="Customer Name *"
                  placeholder="Enter customer name"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  variant="bordered"
                  required
                />

                <Input
                  label="Admin Email *"
                  type="email"
                  placeholder="admin@customer.com"
                  value={formData.adminEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, adminEmail: e.target.value })
                  }
                  variant="bordered"
                  required
                />

                {modalMode === 'create' && (
                  <Input
                    label="Admin Password *"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    value={formData.adminPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, adminPassword: e.target.value })
                    }
                    variant="bordered"
                    required
                    endContent={
                      <button
                        className="focus:outline-none"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    }
                  />
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Additional Information (Optional)
                  </p>

                  <Input
                    label="Company Name"
                    placeholder="Official company name"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    variant="bordered"
                    className="mb-3"
                  />

                  <Input
                    label="Phone"
                    placeholder="Contact phone number"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    variant="bordered"
                    className="mb-3"
                  />

                  <Textarea
                    label="Address"
                    placeholder="Company address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    variant="bordered"
                    minRows={2}
                  />
                </div>

                {modalMode === 'create' && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> A new dedicated database will be
                      created for this customer with all required collections and
                      indexes. The admin user will have full access to manage their
                      organization.
                    </p>
                  </div>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={modalMode === 'create' ? handleCreateCustomer : handleUpdateCustomer}
                isLoading={isSaving}
                className="bg-gradient-to-r from-purple-600 to-blue-600"
              >
                {modalMode === 'create' ? 'Create Customer' : 'Update Customer'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={isDeleteOpen}
          onClose={onDeleteClose}
          size="md"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-danger">Delete Customer</h2>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div className="p-4 bg-danger-50 rounded-lg border border-danger-200">
                  <p className="text-sm text-danger-800">
                    <strong>⚠️ Warning:</strong> This action cannot be undone!
                  </p>
                </div>
                <p className="text-gray-700">
                  Are you sure you want to delete customer{' '}
                  <strong>{selectedCustomer?.customerName}</strong>?
                </p>
                <p className="text-sm text-gray-600">
                  This will permanently delete:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>Customer database ({selectedCustomer?.databaseName})</li>
                  <li>All users and employees</li>
                  <li>All leads and meetings</li>
                  <li>All customer data</li>
                </ul>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onDeleteClose}>
                Cancel
              </Button>
              <Button
                color="danger"
                onPress={handleDeleteCustomer}
                startContent={<TrashIcon className="w-5 h-5" />}
              >
                Delete Permanently
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
