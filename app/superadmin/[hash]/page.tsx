"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Form, Input, Button, Card, CardBody, CardHeader, addToast, Spinner } from "@heroui/react";
import { InputOtp } from "@heroui/input-otp";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { EnvelopeIcon, LockClosedIcon, ShieldCheckIcon, KeyIcon, QrCodeIcon } from "@heroicons/react/24/outline";
import axios from "@/lib/axios";
import QRCode from "qrcode";

type LoginStep = 'credentials' | 'totp-setup' | 'totp-verify';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const params = useParams();
  const hash = params.hash as string;

  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // TOTP Setup
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const toggleVisibility = () => setIsVisible(!isVisible);

  // Generate QR code when TOTP secret is set
  useEffect(() => {
    if (totpSecret && email) {
      console.log('useEffect triggered - Generating QR code');
      console.log('Email:', email);
      console.log('Secret:', totpSecret);
      console.log('Step:', step);
      
      const otpauthUrl = `otpauth://totp/LeadRabbit:${encodeURIComponent(email)}?secret=${totpSecret}&issuer=LeadRabbit`;
      console.log('OTPAuth URL:', otpauthUrl);
      
      QRCode.toDataURL(otpauthUrl, { 
        width: 250, 
        margin: 1,
        errorCorrectionLevel: 'M'
      })
        .then((url) => {
          console.log('QR code generated successfully, length:', url.length);
          setQrCodeUrl(url);
        })
        .catch((err) => {
          console.error("Error generating QR code:", err);
          addToast({
            title: "QR Code Error",
            description: "Failed to generate QR code. Use manual code entry.",
            color: "danger",
            classNames: {
              closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
            },
          });
        });
    } else {
      console.log('QR code generation skipped - totpSecret:', !!totpSecret, 'email:', !!email);
    }
  }, [totpSecret, email]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await axios.post("superadmin/auth", {
        email,
        password,
      });

      if (response.data.requiresTotpSetup) {
        // First time login - show QR code
        console.log('TOTP Setup required, secret received:', response.data.totpSecret);
        console.log('Email:', email);
        setTotpSecret(response.data.totpSecret);
        setStep('totp-setup');
        // Generate QR immediately
        setTimeout(() => {
          console.log('State after update - step:', 'totp-setup', 'secret:', response.data.totpSecret);
        }, 100);
        addToast({
          title: "Setup Required",
          description: "Please set up two-factor authentication",
          color: "warning",
          classNames: {
            closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
          },
        });
      } else if (response.data.requiresTotp) {
        // TOTP already setup - ask for token
        setStep('totp-verify');
      } else if (response.data.success) {
        // Should not happen, but redirect if successful
        addToast({
          title: "Success!",
          description: "Super admin login successful",
          color: "success",
          classNames: {
            closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
          },
        });
        setTimeout(() => {
          router.push(`/superadmin/${hash}/dashboard`);
        }, 500);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Login failed";
      setError(errorMessage);
      addToast({
        title: "Login Failed",
        description: errorMessage,
        color: "danger",
        classNames: {
          closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTotpSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await axios.post("superadmin/auth", {
        email,
        password,
        totpToken,
        setupTotp: true,
      });

      if (response.data.success) {
        addToast({
          title: "Success!",
          description: "Two-factor authentication enabled successfully",
          color: "success",
          classNames: {
            closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
          },
        });
        setTimeout(() => {
          router.push(`/superadmin/${hash}/dashboard`);
        }, 500);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Verification failed";
      setError(errorMessage);
      addToast({
        title: "Verification Failed",
        description: errorMessage,
        color: "danger",
        classNames: {
          closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTotpVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await axios.post("superadmin/auth", {
        email,
        password,
        totpToken,
      });

      if (response.data.success) {
        addToast({
          title: "Success!",
          description: "Super admin login successful",
          color: "success",
          classNames: {
            closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
          },
        });
        setTimeout(() => {
          router.push(`/superadmin/${hash}/dashboard`);
        }, 500);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "Verification failed";
      setError(errorMessage);
      setTotpToken(""); // Clear the token
      addToast({
        title: "Verification Failed",
        description: errorMessage,
        color: "danger",
        classNames: {
          closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700">
      <div className="w-full max-w-md p-6">
        <Card className="shadow-2xl">
          <CardHeader className="flex flex-col items-center gap-3 pb-6 pt-8">
            <div className="p-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
              <ShieldCheckIcon className="w-12 h-12 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Super Admin Portal
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {step === 'credentials' && 'Secure access for system administrators'}
                {step === 'totp-setup' && 'Set up two-factor authentication'}
                {step === 'totp-verify' && 'Enter your authentication code'}
              </p>
            </div>
          </CardHeader>
          <CardBody className="px-8 pb-8">
            {/* Step 1: Credentials */}
            {step === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="superadmin@example.com"
                  startContent={
                    <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                  }
                  variant="bordered"
                  required
                  classNames={{
                    input: "text-base",
                    label: "text-sm font-medium",
                  }}
                />

                <Input
                  label="Password"
                  type={isVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  startContent={
                    <LockClosedIcon className="w-5 h-5 text-gray-400" />
                  }
                  endContent={
                    <button
                      className="focus:outline-none"
                      type="button"
                      onClick={toggleVisibility}
                    >
                      {isVisible ? (
                        <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  }
                  variant="bordered"
                  required
                  classNames={{
                    input: "text-base",
                    label: "text-sm font-medium",
                  }}
                />

                <Button
                  type="submit"
                  color="primary"
                  size="lg"
                  className="w-full font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  isLoading={isLoading}
                >
                  {isLoading ? "Authenticating..." : "Continue"}
                </Button>
              </form>
            )}

            {/* Step 2: TOTP Setup (First Time) */}
            {step === 'totp-setup' && (
              <div className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium mb-2">
                      📱 Setup Authenticator App
                    </p>
                    <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                      <li>Install Google Authenticator or Authy on your phone</li>
                      <li>Use one of the options below to add your account</li>
                      <li>Enter the 6-digit code from the app</li>
                    </ol>
                  </div>

                  {/* Mobile: Direct Link Button */}
                  {totpSecret && (
                    <Button
                      color="primary"
                      size="lg"
                      className="w-full bg-gradient-to-r from-green-600 to-green-500"
                      startContent={
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      }
                      as="a"
                      href={`otpauth://totp/LeadRabbit:${encodeURIComponent(email)}?secret=${totpSecret}&issuer=LeadRabbit`}
                      target="_blank"
                    >
                      Open in Authenticator App
                    </Button>
                  )}

                  {qrCodeUrl ? (
                    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg border-2 border-gray-200">
                      <QrCodeIcon className="w-6 h-6 text-gray-600" />
                      <p className="text-xs text-gray-500 font-medium">Scan with another device</p>
                      <img
                        src={qrCodeUrl}
                        alt="TOTP QR Code"
                        className="w-48 h-48 rounded"
                      />
                      <div className="text-center">
                        <p className="text-xs text-gray-500 mb-1">Or enter this code manually:</p>
                        <code className="text-xs bg-gray-100 px-3 py-1 rounded font-mono select-all">
                          {totpSecret}
                        </code>
                      </div>
                    </div>
                  ) : totpSecret ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-12 bg-white rounded-lg border-2 border-gray-200">
                      <Spinner size="lg" color="primary" />
                      <p className="text-sm text-gray-600">Generating QR code...</p>
                      <div className="text-center mt-4">
                        <p className="text-xs text-gray-500 mb-1">Manual entry code:</p>
                        <code className="text-xs bg-gray-100 px-3 py-1 rounded font-mono select-all">
                          {totpSecret}
                        </code>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 p-12 bg-white rounded-lg border-2 border-gray-200">
                      <Spinner size="lg" color="primary" />
                      <p className="text-sm text-gray-600">Loading...</p>
                    </div>
                  )}
                </div>

                <form onSubmit={handleTotpSetupSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Verification Code</label>
                    <InputOtp
                      length={6}
                      value={totpToken}
                      onValueChange={setTotpToken}
                      variant="bordered"
                      classNames={{
                        base: "justify-center",
                        segmentWrapper: "gap-2",
                        segment: "w-12 h-14 text-xl font-mono data-[active=true]:border-purple-500",
                      }}
                    />
                  </div>

                  <Button
                    type="submit"
                    color="primary"
                    size="lg"
                    className="w-full font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                    isLoading={isLoading}
                    isDisabled={totpToken.length !== 6}
                  >
                    {isLoading ? "Verifying..." : "Verify & Enable 2FA"}
                  </Button>
                </form>
              </div>
            )}

            {/* Step 3: TOTP Verification (Subsequent Logins) */}
            {step === 'totp-verify' && (
              <form onSubmit={handleTotpVerifySubmit} className="space-y-6">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <KeyIcon className="w-4 h-4 inline mr-1" />
                    Open your authenticator app and enter the 6-digit code
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Authentication Code</label>
                  <InputOtp
                    length={6}
                    value={totpToken}
                    onValueChange={setTotpToken}
                    variant="bordered"
                    classNames={{
                      base: "justify-center",
                      segmentWrapper: "gap-2",
                      segment: "w-12 h-14 text-xl font-mono data-[active=true]:border-purple-500",
                    }}
                  />
                </div>

                <Button
                  type="submit"
                  color="primary"
                  size="lg"
                  className="w-full font-semibold bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  isLoading={isLoading}
                  isDisabled={totpToken.length !== 6}
                >
                  {isLoading ? "Verifying..." : "Verify & Login"}
                </Button>

                <Button
                  variant="flat"
                  size="sm"
                  className="w-full"
                  onPress={() => {
                    setStep('credentials');
                    setTotpToken("");
                    setError("");
                  }}
                >
                  ← Back to login
                </Button>
              </form>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-center text-gray-500">
                This portal is for authorized super administrators only.
                <br />
                All access attempts are logged and monitored.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
