import cron from "node-cron";
import clientPromise from "@/lib/mongodb";
import { getSuperAdminDb } from "@/lib/multitenancy";

async function assignLeads() {
  try {
    const client = await clientPromise;
    if (!client) {
      console.error("MongoDB client unavailable for lead assignment");
      return;
    }

    // Get super admin database to fetch all active customers
    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) {
      console.error("Super admin database unavailable");
      return;
    }

    const customersCollection = superAdminDb.collection("customers");
    const activeCustomers = await customersCollection
      .find({ status: "active" })
      .toArray();

    if (activeCustomers.length === 0) {
      return;
    }

    // Process each customer's database
    for (const customer of activeCustomers) {
      const db = client.db(customer.databaseName);
      await assignLeadsForCustomer(db, customer.customerName);
    }
  } catch (err) {
    console.error("Error in lead assignment scheduler:", err);
  }
}

async function assignLeadsForCustomer(db, customerName) {
  try {
    const usersCollection = db.collection("users");
    const leadsCollection = db.collection("leads");
    const settingsCollection = db.collection("settings");

    // Fetch online users in stable order
    const onlineUsers = await usersCollection
      .find({ isOnline: true, isVerified: true })
      .sort({ email: 1 })
      .toArray();

    if (onlineUsers.length === 0) {
      return;
    }

    // Fetch unassigned leads
    const unassignedLeads = await leadsCollection
      .find({
        $or: [{ assignedTo: "" }, { assignedTo: null }],
      })
      .toArray();

    if (unassignedLeads.length === 0) {
      return;
    }

    // Calculate leads per user: unassigned leads / online users, max 4
    const leadsPerUser = Math.min(
      Math.ceil(unassignedLeads.length / onlineUsers.length),
      4
    );

    console.log(
      `[${customerName}] Assigning ${leadsPerUser} leads per user to ${onlineUsers.length} online users (${unassignedLeads.length} unassigned leads)`
    );

    // Get last assignment info
    const settings = await settingsCollection.findOne({
      name: "leadAssignment",
    });
    let lastIndex = settings?.lastAssignedIndex ?? -1;

    // Decide starting index
    let userIndex;
    const stillOnline = onlineUsers.find(
      (u) => u.email === settings?.lastAssignedUser,
    );

    if (settings?.lastAssignedUser && stillOnline) {
      userIndex = (lastIndex + 1) % onlineUsers.length;
    } else {
      userIndex = (lastIndex >= 0 ? lastIndex : 0) % onlineUsers.length;
    }

    // Assign leads in batches per user
    let assignedCount = 0;
    const totalToAssign = Math.min(
      leadsPerUser * onlineUsers.length,
      unassignedLeads.length
    );

    for (let i = 0; i < totalToAssign; i++) {
      const lead = unassignedLeads[i];
      const user = onlineUsers[userIndex];

      await leadsCollection.updateOne(
        { _id: lead._id },
        { $set: { assignedTo: user.email, assignedAt: new Date() } },
      );

      assignedCount++;

      // Move to next user after assigning leadsPerUser
      if ((i + 1) % leadsPerUser === 0) {
        userIndex = (userIndex + 1) % onlineUsers.length;
      }
    }

    // Update settings with new pointer
    const newLastIndex = userIndex;
    const newLastUser = onlineUsers[newLastIndex].email;

    await settingsCollection.updateOne(
      { name: "leadAssignment" },
      {
        $set: {
          lastAssignedIndex: newLastIndex,
          lastAssignedUser: newLastUser,
          lastAssignedAt: new Date(),
        },
      },
      { upsert: true },
    );

    console.log(
      `[${customerName}] ✅ Assigned ${assignedCount} leads successfully`
    );
  } catch (err) {
    console.error(`Error assigning leads for ${customerName}:`, err);
  }
}

// Export for manual triggering (testing/debugging)
export async function assignLeadsManually() {
  console.log("\n🔧 Manual lead assignment triggered");
  await assignLeads();
}

// CRON Job - runs every 10 minutes while app is running
export function startCron() {
  console.log("\n" + "╔" + "=".repeat(78) + "╗");
  console.log("║" + " ".repeat(20) + "🚀 LEAD ASSIGNMENT SCHEDULER" + " ".repeat(29) + "║");
  console.log("╚" + "=".repeat(78) + "╝\n");
  
  console.log("📅 Start Time:", new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }), "IST");
  console.log("📍 Function: startCron()");
  console.log("📂 File: lib/scheduler.js");
  console.log("🌎 Environment:", process.env.NODE_ENV || 'production');
  console.log("🔄 Schedule Pattern: */10 * * * * (Every 10 minutes)");
  console.log("\n" + "-".repeat(80) + "\n");
  
  // Run immediately on startup
  console.log("▶️  [INITIAL RUN] Executing first lead assignment immediately...");
  assignLeads().then(() => {
    console.log("✅ [INITIAL RUN] First assignment completed successfully\n");
    console.log("=".repeat(80));
  }).catch((err) => {
    console.error("❌ [INITIAL RUN] First assignment failed:", err);
  });
  
  // Schedule to run every 10 minutes
  // Pattern: */10 * * * * (every 10 minutes, every hour, every day)
  const task = cron.schedule("*/10 * * * *", () => {
    const now = new Date();
    const istTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log("\n" + "┌" + "─".repeat(78) + "┐");
    console.log("│ ⏰ [CRON TRIGGERED] Scheduled lead assignment starting");
    console.log("│ 🕒 Time: " + istTime + " IST");
    console.log("└" + "─".repeat(78) + "┘");
    
    assignLeads().then(() => {
      const completedTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      console.log("┌" + "─".repeat(78) + "┐");
      console.log("│ ✅ [CRON COMPLETE] Assignment finished successfully");
      console.log("│ 🕓 Completed at: " + completedTime + " IST");
      console.log("└" + "─".repeat(78) + "┘\n");
    }).catch((err) => {
      console.log("┌" + "─".repeat(78) + "┐");
      console.error("│ ❌ [CRON ERROR] Assignment failed:", err);
      console.log("└" + "─".repeat(78) + "┘\n");
    });
  });
  
  console.log("\n🎯 [CRON SETUP] Scheduler configuration:");
  console.log("   • Frequency: Every 10 minutes");
  console.log("   • Pattern: */10 * * * * (minute hour day month weekday)");
  console.log("   • Continuous: Yes (runs 24/7 while app is running)");
  console.log("   • Next execution: Within 10 minutes");
  console.log("   • Timezone: Asia/Kolkata (IST)");
  console.log("   • Status:", task ? "✅ Active" : "❌ Failed");
  
  if (task) {
    console.log("\n✅ [CRON READY] Lead assignment scheduler is now ACTIVE and RUNNING");
    console.log("📡 Waiting for next execution cycle...");
  } else {
    console.error("\n❌ [CRON ERROR] Failed to create cron task!");
  }
  
  console.log("\n" + "╔" + "=".repeat(78) + "╗");
  console.log("║" + " ".repeat(25) + "SCHEDULER ACTIVE" + " ".repeat(36) + "║");
  console.log("╚" + "=".repeat(78) + "╝\n");
  
  return task;
}
