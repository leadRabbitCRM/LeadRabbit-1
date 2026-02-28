"use client";

import { InactivityWarning } from "@/components/InactivityWarning";
import { HEARTBEAT_INTERVAL, INACTIVITY_TIME, WARNING_BEFORE_LOGOUT } from "@/config/inactivity";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import axios from "@/lib/axios";

// Pages where inactivity tracking should NOT run
const PUBLIC_PATHS = ["/login", "/403", "/offline"];

export function InactivityLogoutProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isPublicPage = PUBLIC_PATHS.some((p) => pathname === p || pathname?.startsWith(p + "/"));

  // Per-customer inactivity config (fetched from DB, falls back to static defaults)
  const [inactivityMs, setInactivityMs] = useState(INACTIVITY_TIME);
  const [warningBeforeMs, setWarningBeforeMs] = useState(WARNING_BEFORE_LOGOUT);
  const [configReady, setConfigReady] = useState(false);

  const fetchInactivityConfig = useCallback(() => {
    fetch("/api/settings/inactivity", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.inactivityMinutes) {
          const ms = data.inactivityMinutes * 60 * 1000;
          setInactivityMs(ms);
          setWarningBeforeMs(Math.min(WARNING_BEFORE_LOGOUT, ms - 1000));
        }
      })
      .catch(() => {
        // Keep static defaults on error
      })
      .finally(() => {
        setConfigReady(true);
      });
  }, []);

  // Fetch on mount + re-fetch when tab regains focus (e.g. after changing config)
  useEffect(() => {
    if (isPublicPage) return;

    fetchInactivityConfig();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchInactivityConfig();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isPublicPage, fetchInactivityConfig]);

  useEffect(() => {
    if (isPublicPage) return;

    // --- Heartbeat: periodically tell the server we're still here ---
    const sendHeartbeat = () => {
      axios.post("heartbeat").catch(() => {});
    };

    sendHeartbeat();
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // --- beforeunload: notify server when tab/browser closes ---
    // Use mark-offline (NOT logout) so page refreshes don't destroy the session.
    // The stale-user cron cleanup handles truly disconnected users.
    const handleBeforeUnload = () => {
      const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api").replace(/\/$/, "");
      navigator.sendBeacon(`${apiBase}/mark-offline`);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [isPublicPage]);

  return (
    <>
      {!isPublicPage && configReady && (
        <InactivityWarning
          key={`inactivity-${inactivityMs}-${warningBeforeMs}`}
          inactivityTime={inactivityMs}
          warningBefore={warningBeforeMs}
        />
      )}
      {children}
    </>
  );
}
