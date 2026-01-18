"use client";
import React from "react";
import { Button, Spinner } from "@heroui/react";
import { InputOtp } from "@heroui/input-otp";
import { QrCodeIcon, KeyIcon } from "@heroicons/react/24/outline";

export function TotpSetupForm({ 
  email, 
  totpSecret, 
  qrCodeUrl, 
  totpToken, 
  setTotpToken, 
  onSubmit, 
  isLoading 
}) {
  const otpauthUrl = totpSecret 
    ? `otpauth://totp/LeadRabbit:${encodeURIComponent(email)}?secret=${totpSecret}&issuer=LeadRabbit`
    : '';

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center mb-2">
        <h3 className="text-lg font-bold text-gray-800">Setup Two-Factor Authentication</h3>
        <p className="text-sm text-gray-600">Secure your account with 2FA</p>
      </div>

      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800 font-medium mb-1">
          📱 Setup Instructions
        </p>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Install Google Authenticator or Authy</li>
          <li>Click button below or scan QR code</li>
          <li>Enter the 6-digit code</li>
        </ol>
      </div>

      {/* Mobile: Direct Link Button */}
      {totpSecret && (
        <Button
          color="success"
          size="lg"
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          startContent={
            <QrCodeIcon className="w-5 h-5 text-white" />
          }
          as="a"
          href={otpauthUrl}
          target="_blank"
        >
          Open in Authenticator App
        </Button>
      )}

      {/* QR Code for Desktop/Another Device */}
      {qrCodeUrl ? (
        <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-lg border">
          <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 rounded" />
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Manual entry code:</p>
            <code className="text-xs bg-white px-2 py-1 rounded font-mono select-all border">
              {totpSecret}
            </code>
          </div>
        </div>
      ) : totpSecret ? (
        <div className="flex flex-col items-center justify-center gap-2 p-6 bg-gray-50 rounded-lg">
          <Spinner size="md" color="primary" />
          <p className="text-xs text-gray-600">Generating QR code...</p>
          <div className="text-center mt-2">
            <p className="text-xs text-gray-500 mb-1">Manual code:</p>
            <code className="text-xs bg-white px-2 py-1 rounded font-mono select-all border">
              {totpSecret}
            </code>
          </div>
        </div>
      ) : (
        <div className="flex justify-center p-6">
          <Spinner size="lg" />
        </div>
      )}

      {/* OTP Input */}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Enter 6-digit code
          </label>
          <div className="flex justify-center">

          <InputOtp
            length={6}
            value={totpToken}
            onValueChange={setTotpToken}
            variant="bordered"
            classNames={{
                base: "justify-center",
                segmentWrapper: "gap-2",
                segment: "w-10 h-12 text-lg font-mono data-[active=true]:border-[#5B62E3]",
            }}
            />
            </div>
        </div>

        <Button
          type="submit"
          color="primary"
          size="lg"
          isLoading={isLoading}
          isDisabled={totpToken.length !== 6}
          className="w-full bg-gradient-to-r from-[#5B62E3] to-[#7C82F0]"
        >
          {isLoading ? "Verifying..." : "Verify & Enable 2FA"}
        </Button>
      </form>
    </div>
  );
}

export function TotpVerifyForm({ 
  totpToken, 
  setTotpToken, 
  onSubmit, 
  onBack, 
  isLoading 
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center mb-2">
        <h3 className="text-lg font-bold text-gray-800">Enter Authentication Code</h3>
        <p className="text-sm text-gray-600">Open your authenticator app</p>
      </div>

      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <KeyIcon className="w-4 h-4 inline mr-1" />
          Enter the 6-digit code from your app
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Authentication Code
          </label>
          <div className="flex justify-center">

          <InputOtp
            length={6}
            value={totpToken}
            onValueChange={setTotpToken}
            variant="bordered"
            classNames={{
                base: "justify-center",
                segmentWrapper: "gap-2",
                segment: "w-10 h-12 text-lg font-mono data-[active=true]:border-[#5B62E3]",
            }}
            />
            </div>
        </div>

        <Button
          type="submit"
          color="primary"
          size="lg"
          isLoading={isLoading}
          isDisabled={totpToken.length !== 6}
          className="w-full bg-gradient-to-r from-[#5B62E3] to-[#7C82F0]"
        >
          {isLoading ? "Verifying..." : "Verify & Login"}
        </Button>

        <Button
          variant="flat"
          size="sm"
          onPress={onBack}
          className="w-full"
        >
          ← Back to login
        </Button>
      </form>
    </div>
  );
}
