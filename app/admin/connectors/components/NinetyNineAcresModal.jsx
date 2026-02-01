import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@heroui/react";
import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";

export default function NinetyNineAcresModal({ isOpen, onOpenChange, onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/99acres/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (result.success) {
        setUsername("");
        setPassword("");
        onOpenChange();
        onSuccess();
      } else {
        setError(result.error || "Authentication failed");
      }
    } catch (error) {
      setError("Error connecting to 99acres");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Connect 99acres Account
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-gray-600 mb-4">
                Enter your 99acres credentials to connect your account.
              </p>
              <Input
                label="Username"
                placeholder="Enter your 99acres username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                isDisabled={isLoading}
              />
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your 99acres password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                isDisabled={isLoading}
                endContent={
                  <button
                    className="focus:outline-none"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <EyeIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                }
              />
              {error && (
                <p className="text-sm text-danger">{error}</p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button color="default" variant="light" onPress={onClose}>
                Cancel
              </Button>
              <Button
                color="primary"
                onPress={handleSubmit}
                isDisabled={!username || !password || isLoading}
                isLoading={isLoading}
              >
                Connect
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
