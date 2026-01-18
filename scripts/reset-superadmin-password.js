// scripts/reset-superadmin-password.js
/**
 * Reset Super Admin Password
 * 
 * Use this if you're having login issues
 * 
 * Run: node scripts/reset-superadmin-password.js
 */

const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const speakeasy = require("speakeasy");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function resetPassword() {
  console.log("\n🔐 Reset Super Admin Password\n");
  console.log("=" .repeat(50));

  const MONGODB_URI = process.env.MONGODB_URI || await question("Enter MongoDB URI: ");
  const DB_NAME = process.env.DB_NAME || "leadrabbit";
  
  if (!MONGODB_URI) {
    console.error("❌ MongoDB URI is required");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const superAdminDbName = `${DB_NAME}_superadmin`;
    const superAdminDb = client.db(superAdminDbName);
    const superAdminsCollection = superAdminDb.collection("super_admins");

    // List existing super admins
    const superAdmins = await superAdminsCollection.find({}).toArray();
    
    if (superAdmins.length === 0) {
      console.log("\n❌ No super admin users found!");
      console.log("Run: node scripts/init-superadmin.js to create one");
      rl.close();
      await client.close();
      return;
    }

    console.log("\n📋 Existing Super Admins:");
    superAdmins.forEach((admin, index) => {
      console.log(`   ${index + 1}. ${admin.email} (${admin.name})`);
    });

    const email = await question("\nEnter email of super admin to reset: ");
    
    const superAdmin = await superAdminsCollection.findOne({ email });
    
    if (!superAdmin) {
      console.error(`❌ Super admin not found: ${email}`);
      rl.close();
      await client.close();
      return;
    }

    const newPassword = await question("Enter NEW password (min 6 chars): ");
    
    if (newPassword.length < 6) {
      console.error("❌ Password must be at least 6 characters");
      rl.close();
      await client.close();
      return;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Check if TOTP secret exists, if not generate one
    let updateFields = { 
      password: hashedPassword, 
      updatedAt: new Date() 
    };

    if (!superAdmin.totpSecret) {
      console.log("\n🔑 Generating new TOTP secret for 2FA...");
      const totpSecret = speakeasy.generateSecret({
        name: `LeadRabbit Super Admin (${email})`,
        issuer: 'LeadRabbit'
      });
      updateFields.totpSecret = totpSecret.base32;
      updateFields.totpEnabled = false;
      console.log("✅ TOTP secret generated");
    }

    // Update the password and TOTP if needed
    await superAdminsCollection.updateOne(
      { email },
      { $set: updateFields }
    );

    console.log("\n✅ Password updated successfully!");
    console.log("\n📋 New Login Details:");
    console.log("-".repeat(50));
    console.log(`Email: ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log("\n🔗 Super Admin Login URL:");
    console.log(`http://localhost:4000/superadmin/$2b$12$Q9q2XQ1HqQw8J5HqJ8GZFez0M5vYkF1n1m4ZrYqXzZB9Zz7mZC9b2`);
    
    if (!superAdmin.totpSecret) {
      console.log("\n🔑 2FA will need to be set up on next login.");
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
  } finally {
    rl.close();
    await client.close();
  }
}

resetPassword();
