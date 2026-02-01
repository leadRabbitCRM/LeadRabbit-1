"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Spinner,
  Select,
  SelectItem,
  addToast,
} from "@heroui/react";
import { Input } from "@heroui/input";
import { useState } from "react";

export const role = [
  { key: "admin", label: "Admin" },
  { key: "user", label: "User" },
];

export default function CustomModal({ isOpen, onOpenChange, onUserAdded }) {
  const DEFAULT_PASSWORD = "LeadRabbit@123";
  
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    status: "inActive",
    email: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Check if form is valid
  const isFormValid =
    formData.name &&
    formData.role &&
    formData.email;

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    setMessage("");

    setLoading(true);
    try {
      const response = await fetch("/api/admin/addUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          status: formData.status,
          email: formData.email,
          password: DEFAULT_PASSWORD,
        }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok) {
        setMessage("✅ User added successfully!");
        addToast({
          title: "User Added",
          description: `${formData.name} has been added successfully!`,
          color: "success",
          classNames: {
            closeButton:
              "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
          },
        });

        setFormData({
          name: "",
          role: "",
          status: "inActive",
          email: "",
        });

        // Call the refresh callback
        if (onUserAdded && typeof onUserAdded === "function") {
          onUserAdded();
        }

        // Close modal after success
        setTimeout(() => {
          onOpenChange(false);
        }, 500);
      } else {
        setMessage(`❌ ${data.error || "Something went wrong."}`);
        addToast({
          title: "Error",
          description: data.error || "Failed to add user. Try again.",
          color: "danger",
        });
      }
    } catch (error) {
      setLoading(false);
      setMessage("❌ Failed to add user. Try again.");
      addToast({
        title: "Error",
        description: "Network error. Please try again.",
        color: "danger",
      });
    }
  };

  return (
    <Modal
      backdrop="opaque"
      isOpen={isOpen}
      motionProps={{
        variants: {
          enter: { y: 0, opacity: 1, transition: { duration: 0.3 } },
          exit: { y: -20, opacity: 0, transition: { duration: 0.2 } },
        },
      }}
      onOpenChange={onOpenChange}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 font-semibold">
              Add New User
              <p className="text-xs text-gray-500">
                Fill in the details below to create a new user account.
              </p>
            </ModalHeader>
            <ModalBody>
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-medium">
                    ℹ️ Default Password: <span className="font-semibold">LeadRabbit@123</span>
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    The new user will receive this default password. They should change it on their first login.
                  </p>
                </div>

                <Input
                  id="name"
                  name="name"
                  label="Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  size="sm"
                />

                <Select
                  label="Select a role"
                  size="sm"
                  selectedKeys={formData.role ? [formData.role] : []}
                  onSelectionChange={(keys) => {
                    const selected = Array.from(keys)[0];
                    setFormData((prev) => ({ ...prev, role: selected }));
                  }}
                >
                  {role.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.label}
                    </SelectItem>
                  ))}
                </Select>

                <Input
                  type="email"
                  id="email"
                  name="email"
                  label="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  size="sm"
                />
              </form>

              {message && (
                <p
                  className={`text-center text-xs mt-2 ${
                    message.startsWith("✅") ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {message}
                </p>
              )}
            </ModalBody>
            <ModalFooter className="flex items-center gap-2">
              <Button
                color="danger"
                variant="light"
                onPress={onClose}
                size="sm"
              >
                Close
              </Button>
              <Button
                type="button"
                color="primary"
                className="w-full text-xs"
                isDisabled={loading || !isFormValid}
                onPress={handleSubmit}
              >
                {loading ? <Spinner size="sm" color="white" /> : "Add User"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
