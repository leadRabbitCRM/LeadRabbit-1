import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";

// Inactivity timeout in milliseconds
// Change INACTIVITY_TIME to 1800000 (30 minutes) for production
const INACTIVITY_TIME = 60000; // 1 minute for testing

export function useInactivityLogout() {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Function to handle logout
  const handleLogout = useCallback(async () => {
    try {
      console.log("⏱️ Inactivity timeout - Logging out user");
      
      // Call logout API to clear server-side session
      await axios.post("logout");
    } catch (error) {
      console.error("Error during logout:", error);
    } finally {
      // Clear any stored data
      localStorage.removeItem("leadRabbit_favorites");
      
      // Redirect to login
      router.push("/login");
    }
  }, [router]);

  // Function to reset the inactivity timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      console.log("⏱️ Inactivity timer triggered - User inactive for", INACTIVITY_TIME / 1000, "seconds");
      handleLogout();
    }, INACTIVITY_TIME);
  }, [handleLogout]);

  // Setup activity listeners
  useEffect(() => {
    // List of events that reset the inactivity timer
    const activityEvents = [
      "mousedown",
      "mouseup",
      "keydown",
      "keyup",
      "scroll",
      "touchstart",
      "touchend",
      "click",
    ];

    // Event handler
    const handleActivity = () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      // Only reset timer if more than 1 second has passed since last activity
      // This prevents excessive timer resets
      if (timeSinceLastActivity > 1000) {
        console.log("👤 User activity detected - resetting inactivity timer");
        resetTimer();
      }
    };

    // Add event listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize timer on mount
    resetTimer();

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimer]);

  return {
    resetTimer,
    logout: handleLogout,
  };
}
