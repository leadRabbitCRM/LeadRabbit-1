// lib/initScheduler.ts
// This module initializes the cron scheduler when imported
import { startCron } from "./scheduler";

// Flag to ensure scheduler only starts once
let isSchedulerStarted = false;

export function initializeScheduler() {
  if (!isSchedulerStarted && typeof window === 'undefined') {
    // Only run on server side
    console.log("\n" + "=".repeat(80));
    console.log("📦 [SCHEDULER INIT] Initializing Lead Assignment Scheduler");
    console.log("📁 Location: lib/initScheduler.ts");
    console.log("🔗 Triggered by: app/layout.tsx import");
    console.log("⏰ Timestamp:", new Date().toISOString());
    console.log("🌍 Environment:", process.env.NODE_ENV || 'unknown');
    console.log("=".repeat(80) + "\n");
    
    isSchedulerStarted = true;
    startCron();
    
    console.log("\n🎉 [SCHEDULER INIT] Initialization complete");
    console.log("🔄 Scheduler is now active and will run every minute");
    console.log("=".repeat(80) + "\n");
  } else if (isSchedulerStarted) {
    console.log("⚠️  [SCHEDULER INIT] Scheduler already started, skipping initialization");
  } else if (typeof window !== 'undefined') {
    console.log("💻 [SCHEDULER INIT] Skipping - running in browser context");
  }
}

// Auto-initialize when module is imported
if (typeof window === 'undefined') {
  console.log("🚀 [SCHEDULER INIT] Auto-initialization triggered (server-side import detected)");
  initializeScheduler();
}
