// lib/initScheduler.ts
// This module initializes the cron scheduler when imported
import { startCron } from "./scheduler";

// Flag to ensure scheduler only starts once
let isSchedulerStarted = false;

export function initializeScheduler() {
  if (!isSchedulerStarted && typeof window === 'undefined') {
    // Only run on server side
    isSchedulerStarted = true;
    startCron();
  }
}

// Auto-initialize when module is imported
if (typeof window === 'undefined') {
  initializeScheduler();
}
