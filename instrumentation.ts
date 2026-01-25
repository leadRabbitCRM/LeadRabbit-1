// instrumentation.ts
// This file runs IMMEDIATELY when Next.js server starts (before any other code)
// It's the earliest hook available in Next.js

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log("\n" + "█".repeat(80));
    console.log("█" + " ".repeat(15) + "🎬 NEXT.JS SERVER INSTRUMENTATION" + " ".repeat(30) + "█");
    console.log("█".repeat(80));
    console.log("⚡ Location: instrumentation.ts");
    console.log("⚡ Execution: IMMEDIATE on server startup (earliest possible hook)");
    console.log("⚡ Runtime: Node.js");
    console.log("⚡ Timestamp:", new Date().toISOString());
    console.log("█".repeat(80) + "\n");
    
    // Import and initialize scheduler immediately
    const { startCron } = await import('./lib/scheduler');
    
    console.log("🔥 [INSTRUMENTATION] Calling startCron() from instrumentation.ts...\n");
    startCron();
    
    console.log("\n🎉 [INSTRUMENTATION] Scheduler initialization completed from instrumentation.ts");
    console.log("█".repeat(80) + "\n");
  }
}
