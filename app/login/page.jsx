"use client";
import React, { Suspense } from "react";
import { Form, Input, Button, addToast, Spinner } from "@heroui/react";
import { InputOtp } from "@heroui/input-otp";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { EnvelopeIcon, LockClosedIcon, ExclamationCircleIcon, KeyIcon, QrCodeIcon } from "@heroicons/react/24/outline";
import axios from "@/lib/axios";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";
import { TotpSetupForm, TotpVerifyForm } from "@/components/TotpSetup";

function LoginContent() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isProcessingGoogleAuth, setIsProcessingGoogleAuth] =
    React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [emailError, setEmailError] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  
  // TOTP states
  const [loginStep, setLoginStep] = React.useState('credentials'); // 'credentials' | 'totp-setup' | 'totp-verify'
  const [loginEmail, setLoginEmail] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [totpToken, setTotpToken] = React.useState("");
  const [totpSecret, setTotpSecret] = React.useState("");
  const [qrCodeUrl, setQrCodeUrl] = React.useState("");
  const [userRole, setUserRole] = React.useState("");
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const toggleVisibility = () => setIsVisible(!isVisible);

  // Generate QR code when TOTP secret is set
  React.useEffect(() => {
    if (totpSecret && loginEmail) {
      const otpauthUrl = `otpauth://totp/LeadRabbit:${encodeURIComponent(loginEmail)}?secret=${totpSecret}&issuer=LeadRabbit`;
      QRCode.toDataURL(otpauthUrl, { 
        width: 250, 
        margin: 1,
        errorCorrectionLevel: 'M'
      })
        .then((url) => {
          setQrCodeUrl(url);
        })
        .catch((err) => {
          console.error("Error generating QR code:", err);
        });
    }
  }, [totpSecret, loginEmail]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const clearErrors = () => {
    setEmailError("");
    setPasswordError("");
  };

  // Handle Google Calendar OAuth redirect
  React.useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const userEmail = searchParams.get("user_email");
    const userName = searchParams.get("user_name");

    if (accessToken && userEmail) {
      setIsProcessingGoogleAuth(true);

      // Store the auth data in session storage
      sessionStorage.setItem(
        "googleAuth",
        JSON.stringify({
          accessToken,
          email: userEmail,
          name: userName,
        }),
      );

      // Check for pending meeting data
      const pendingData = sessionStorage.getItem("pendingMeetingData");
      if (pendingData) {
        const meetingData = JSON.parse(pendingData);
        sessionStorage.removeItem("pendingMeetingData");

        // Auto-create the meeting with Google Calendar event
        handleCreateMeetingWithGoogle(meetingData, accessToken);
      } else {
        // No pending meeting, redirect back to where user came from
        const returnUrl =
          sessionStorage.getItem("googleAuthReturnUrl") || "/user";
        sessionStorage.removeItem("googleAuthReturnUrl");

        // Clean URL and redirect
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
        setTimeout(() => {
          router.push(returnUrl);
        }, 1000);
      }
    }
  }, [searchParams, router]);

  const convertTo24Hour = (time12h) => {
    const [time, modifier] = time12h.split(" ");
    let [hours, minutes] = time.split(":");
    if (hours === "12") hours = "00";
    if (modifier === "PM") hours = parseInt(hours, 10) + 12;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  };

  const handleCreateMeetingWithGoogle = async (meetingData, accessToken) => {
    try {
      // Create Google Calendar event
      const eventResponse = await fetch("/api/calendar/create-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken,
          event: {
            summary: meetingData.title,
            description: meetingData.description,
            location: meetingData.location,
            start: {
              dateTime: `${meetingData.date}T${convertTo24Hour(meetingData.startTime)}:00`,
              timeZone: meetingData.timeZone,
            },
            end: {
              dateTime: `${meetingData.date}T${convertTo24Hour(meetingData.endTime)}:00`,
              timeZone: meetingData.timeZone,
            },
            attendees: meetingData.attendeeEmail
              ? [{ email: meetingData.attendeeEmail }]
              : [],
          },
        }),
      });

      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        addToast({
          title: "Success",
          description: "Google Calendar event created successfully!",
          color: "success",
        });
      } else {
        const errorData = await eventResponse.json();
        console.error("Google Calendar API error:", errorData);
        addToast({
          title: "Warning",
          description: `Meeting created but Google Calendar event failed: ${errorData.error || "Unknown error"}`,
          color: "warning",
        });
      }
    } catch (error) {
      console.error("Error creating meeting with Google Calendar:", error);
      addToast({
        title: "Error",
        description: `Error creating Google Calendar event: ${error.message}`,
        color: "danger",
      });
    } finally {
      // Redirect back
      const returnUrl =
        sessionStorage.getItem("googleAuthReturnUrl") || "/user";
      sessionStorage.removeItem("googleAuthReturnUrl");

      // Clean URL and redirect
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => {
        router.push(returnUrl);
      }, 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();
    const formData = Object.fromEntries(new FormData(e.currentTarget));
    const { email, password } = formData;

    // Validate inputs
    let hasError = false;
    if (!email || !email.trim()) {
      setEmailError("Email is required");
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Password is required");
      hasError = true;
    }

    if (hasError) {
      addToast({
        title: "Validation Error",
        description: "Please check your input fields",
        color: "warning",
        classNames: {
          closeButton:
            "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
        },
      });
      return;
    }

    setIsLoading(true);
    setLoginEmail(email.trim());
    setLoginPassword(password);

    try {
      const response = await axios.post(`authenticate`, {
        email: email.trim(),
        password,
      });

      if (response.data.requiresTotpSetup) {
        // First time login - show QR code
        setTotpSecret(response.data.totpSecret);
        setUserRole(response.data.role);
        setLoginStep('totp-setup');
        setIsLoading(false);
        addToast({
          title: "Setup Required",
          description: "Please set up two-factor authentication",
          color: "warning",
          classNames: {
            closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
          },
        });
        return;
      }

      if (response.data.requiresTotp) {
        // TOTP already setup - ask for token
        setUserRole(response.data.role);
        setLoginStep('totp-verify');
        setIsLoading(false);
        return;
      }

      if (response.status === 200 && response.data.success) {
        addToast({
          title: "Login Successful",
          description: "Welcome back! Redirecting...",
          color: "success",
          classNames: {
            closeButton:
              "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
          },
        });
        // Wait a moment for toast to display before redirecting
        setTimeout(() => {
          router.push("/");
        }, 500);
      }
    } catch (error) {
      const status = error?.response?.status;
      let errorMsg = "An error occurred during login. Please try again.";

      if (status === 401) {
        errorMsg = "Invalid email or password. Please check your credentials.";
      } else if (status === 400) {
        errorMsg = "Invalid input. Please check your email and password.";
      } else if (status === 404) {
        errorMsg = "User account not found. Please check your email or sign up.";
      } else if (status === 429) {
        errorMsg = "Too many login attempts. Please try again later.";
      } else if (status === 500) {
        errorMsg = "Server error. Please try again later.";
      } else if (!error?.response) {
        errorMsg = "Network error. Please check your connection and try again.";
      }

      addToast({
        title: "Login Failed",
        description: errorMsg,
        color: "danger",
        classNames: {
          closeButton:
            "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTotpSetup = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(`authenticate`, {
        email: loginEmail,
        password: loginPassword,
        totpToken,
        setupTotp: true,
      });

      if (response.data.success) {
        addToast({
          title: "Success!",
          description: "Two-factor authentication enabled",
          color: "success",
          classNames: {
            closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
          },
        });
        setTimeout(() => {
          router.push("/");
        }, 500);
      }
    } catch (error) {
      addToast({
        title: "Verification Failed",
        description: error.response?.data?.message || "Invalid code",
        color: "danger",
        classNames: {
          closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
        },
      });
      setTotpToken("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTotpVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await axios.post(`authenticate`, {
        email: loginEmail,
        password: loginPassword,
        totpToken,
      });

      if (response.data.success) {
        addToast({
          title: "Login Successful",
          description: "Welcome back!",
          color: "success",
          classNames: {
            closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
          },
        });
        setTimeout(() => {
          router.push("/");
        }, 500);
      }
    } catch (error) {
      addToast({
        title: "Verification Failed",
        description: error.response?.data?.message || "Invalid code",
        color: "danger",
        classNames: {
          closeButton: "opacity-100 absolute right-4 top-1/2 -translate-y-1/2",
        },
      });
      setTotpToken("");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state when processing Google auth
  if (isProcessingGoogleAuth) {
    return (
      <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#5B62E3] via-[#6B72F3] to-[#7C82F0] items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-gradient-to-r from-[#5B62E3] to-[#7C82F0] rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute inset-2 animate-spin rounded-full border-4 border-gray-200 border-t-[#5B62E3]"></div>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Setting Up Calendar
          </h2>
          <p className="text-gray-600 text-sm">
            Creating your Google Calendar event...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#5B62E3] via-[#6B72F3] to-[#7C82F0] py-4">  
      {/* Logo and Welcome Text - Centered */}
      <div className="flex-grow flex flex-col items-center justify-center">
        {/* Logo Section */}
        <div className="flex items-center justify-center py-2 sm:py-4 md:py-6 px-4 md:px-8 relative z-10">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-10 sm:p-3 md:p-6 shadow-2xl hover:shadow-3xl transition-shadow duration-300">
            <Image
              src="/logo.svg"
              alt="LeadRabbit Logo"
              width={120}
              height={120}
              priority
              className="w-32 h-auto sm:w-20 md:w-28 transition-transform duration-300"
            />
          </div>
        </div>

        {/* Welcome Text */}
        <div className="text-center px-4 relative z-10 pb-5">
          <h1 className="text-3xl sm:text-2xl md:text-3xl font-bold text-white mb-0.5 tracking-tight leading-tight">
            Welcome Back
          </h1>
          <p className="text-white/90 text-xs sm:text-sm md:text-base font-light leading-snug">
            Sign in to your account
          </p>
        </div>
      </div>

      {/* Login Form */}
      <div className="mt-auto mb-4">
      <div className="md:items-center md:justify-center bg-white rounded-3xl md:rounded-3xl shadow-2xl relative z-10 mx-2 sm:mx-4 md:mx-auto md:w-full md:max-w-md md:mb-0 overflow-y-auto py-4">
        <div className="w-full p-4 sm:p-6 md:p-10">
          
          {/* Step 1: Credentials Form */}
          {loginStep === 'credentials' && (
            <Form className="flex flex-col gap-4 sm:gap-6" onSubmit={handleSubmit}>
              {/* Email Input */}
              <div className="flex flex-col gap-2 w-full">
                <label
                  htmlFor="email"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-1"
                >
                  Email Address
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  startContent={<EnvelopeIcon className="w-5 h-5 text-gray-400" />}
                  isInvalid={!!emailError}
                  errorMessage={emailError}
                  onFocus={() => setEmailError("")}
                  onInput={(e) => {
                    if (e.target.value && validateEmail(e.target.value)) {
                      setEmailError("");
                    }
                  }}
                  classNames={{
                    base: "w-full",
                    input: [
                      "bg-transparent",
                      "text-gray-900",
                      "placeholder:text-gray-400",
                      "text-sm sm:text-base",
                    ],
                    innerWrapper: "bg-transparent",
                    inputWrapper: [
                      "bg-gray-50",
                      "border-2 border-gray-200",
                      "hover:bg-gray-100",
                      "group-data-[focus=true]:bg-white",
                      "group-data-[focus=true]:border-[#5B62E3]",
                      "group-data-[invalid=true]:border-red-300",
                      "!cursor-text",
                      "h-10 sm:h-12 md:h-14",
                      "w-full",
                      "transition-all duration-200",
                    ],
                  }}
                  isRequired
                  radius="lg"
                  size="lg"
                  variant="bordered"
                  fullWidth
                  disabled={isLoading}
                />
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-2 w-full">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-1"
                >
                  Password
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  id="password"
                  name="password"
                  type={isVisible ? "text" : "password"}
                  placeholder="Enter your password"
                  startContent={
                    <LockClosedIcon className="w-5 h-5 text-gray-400" />
                  }
                  endContent={
                    <button
                      aria-label="toggle password visibility"
                      className="focus:outline-none p-1 hover:bg-gray-100 rounded-md transition-colors"
                      type="button"
                      onClick={toggleVisibility}
                      disabled={isLoading}
                    >
                      {isVisible ? (
                        <EyeSlashIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                      ) : (
                        <EyeIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  }
                  isInvalid={!!passwordError}
                  errorMessage={passwordError}
                  onFocus={() => setPasswordError("")}
                  onInput={() => {
                    if (passwordError) {
                      setPasswordError("");
                    }
                  }}
                  classNames={{
                    base: "w-full",
                    input: [
                      "bg-transparent",
                      "text-gray-900",
                      "placeholder:text-gray-400",
                      "text-sm sm:text-base",
                    ],
                    innerWrapper: "bg-transparent",
                    inputWrapper: [
                      "bg-gray-50",
                      "border-2 border-gray-200",
                      "hover:bg-gray-100",
                      "group-data-[focus=true]:bg-white",
                      "group-data-[focus=true]:border-[#5B62E3]",
                      "group-data-[invalid=true]:border-red-300",
                      "!cursor-text",
                      "h-10 sm:h-12 md:h-14",
                      "w-full",
                      "transition-all duration-200",
                    ],
                  }}
                  isRequired
                  radius="lg"
                  size="lg"
                  variant="bordered"
                  fullWidth
                  disabled={isLoading}
                />
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                color="primary"
                size="lg"
                radius="lg"
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full h-10 sm:h-12 md:h-14 bg-gradient-to-r from-[#5B62E3] to-[#7C82F0] hover:from-[#4A51D1] hover:to-[#6B72E0] text-white font-semibold text-sm sm:text-base md:text-lg mt-2 sm:mt-4 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-75"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </Form>
          )}

          {/* Step 2: TOTP Setup */}
          {loginStep === 'totp-setup' && (
            <TotpSetupForm
              email={loginEmail}
              totpSecret={totpSecret}
              qrCodeUrl={qrCodeUrl}
              totpToken={totpToken}
              setTotpToken={setTotpToken}
              onSubmit={handleTotpSetup}
              isLoading={isLoading}
            />
          )}

          {/* Step 3: TOTP Verify */}
          {loginStep === 'totp-verify' && (
            <TotpVerifyForm
              totpToken={totpToken}
              setTotpToken={setTotpToken}
              onSubmit={handleTotpVerify}
              onBack={() => {
                setLoginStep('credentials');
                setTotpToken("");
                setLoginEmail("");
                setLoginPassword("");
              }}
              isLoading={isLoading}
            />
          )}

        </div>
      </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-4 sm:pb-6 md:pb-8 px-4 text-white/70 text-xs sm:text-sm relative z-10 hidden sm:block">
        <p>© 2026 LeadRabbit. All rights reserved.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#5B62E3] via-[#6B72F3] to-[#7C82F0] items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl text-center max-w-md">
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 bg-gradient-to-r from-[#5B62E3] to-[#7C82F0] rounded-full opacity-20 animate-pulse"></div>
                <div className="absolute inset-2 animate-spin rounded-full border-4 border-gray-200 border-t-[#5B62E3]"></div>
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Loading
            </h2>
            <p className="text-gray-600 text-sm">
              Please wait while we prepare your login page...
            </p>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
