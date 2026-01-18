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

// CRON Job - runs every 15 mins from 9am to 6pm IST
export function startCron() {
  console.log("🚀 Starting lead assignment scheduler...");
  console.log(`⏰ Current time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`);
  
  // Run immediately on startup
  console.log("▶️  Running initial lead assignment...");
  assignLeads().then(() => {
    console.log("✅ Initial assignment complete");
  });
  
  // Schedule to run every 15 minutes from 9am to 6pm IST
  // Pattern breakdown:
  // - 0,15,30,45: at minutes 0, 15, 30, 45
  // - 9-18: between hours 9am and 6pm (inclusive)
  // - * * *: every day, month, day of week
  // - timezone: 'Asia/Kolkata' for IST
  const task = cron.schedule("0,15,30,45 9-18 * * *", () => {
    const now = new Date();
    const istTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`\n⏰ [CRON TRIGGERED] Running scheduled lead assignment at: ${istTime} IST`);
    assignLeads().then(() => {
      const completedTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      console.log(`✅ [CRON COMPLETE] Assignment finished at: ${completedTime} IST`);
    }).catch((err) => {
      console.error("❌ [CRON ERROR] Assignment failed:", err);
    });
  }, {
    timezone: "Asia/Kolkata"
  });
  
  console.log("✅ Lead assignment cron started");
  console.log("📅 Schedule: Every 15 minutes (at :00, :15, :30, :45) from 9am to 6pm IST");
  console.log("🌏 Timezone: Asia/Kolkata (Indian Standard Time)");
  console.log("🔄 Next runs: 9:00, 9:15, 9:30, 9:45, 10:00, 10:15... until 6:45pm IST");
  
  // Log cron status
  if (task) {
    console.log("✅ Cron task created successfully");
  } else {
    console.error("❌ Failed to create cron task");
  }
  
  return task;
}
