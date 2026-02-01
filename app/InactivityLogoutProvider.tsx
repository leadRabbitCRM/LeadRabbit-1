"use client";

import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { InactivityWarning } from "@/components/InactivityWarning";
import { ReactNode } from "react";

export function InactivityLogoutProvider({ children }: { children: ReactNode }) {
  // Initialize inactivity logout hook
  useInactivityLogout();

  return (
    <>
      <InactivityWarning />
      {children}
    </>
  );
}
