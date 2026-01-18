// scripts/init-superadmin.js
/**
 * Initialize Super Admin Database
 * 
 * This script creates:
 * 1. Super admin database (leadrabbit_superadmin)
 * 2. Super admin user collection
 * 3. Customers collection
 * 4. First super admin user
 * 
 * Run: node scripts/init-superadmin.js
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

async function initializeSuperAdmin() {
  console.log("\n🚀 Super Admin Database Initialization\n");
  console.log("=" .repeat(50));

  // Get MongoDB URI and DB_NAME from environment or prompt
  const MONGODB_URI = process.env.MONGODB_URI || await question("\nEnter MongoDB URI: ");
  const DB_NAME = process.env.DB_NAME || "leadrabbit";
  
  if (!MONGODB_URI) {
    console.error("❌ MongoDB URI is required");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    // Create super admin database using DB_NAME from environment
    const superAdminDbName = `${DB_NAME}_superadmin`;
    const superAdminDb = client.db(superAdminDbName);
    console.log(`✅ Super admin database created/accessed: ${superAdminDbName}`);

    // Create collections
    const collections = await superAdminDb.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    if (!collectionNames.includes("super_admins")) {
      await superAdminDb.createCollection("super_admins");
      console.log("✅ Created super_admins collection");
    } else {
      console.log("ℹ️  super_admins collection already exists");
    }

    if (!collectionNames.includes("customers")) {
      await superAdminDb.createCollection("customers");
      console.log("✅ Created customers collection");
    } else {
      console.log("ℹ️  customers collection already exists");
    }

    // Create indexes
    await superAdminDb.collection("super_admins").createIndex({ email: 1 }, { unique: true });
    await superAdminDb.collection("customers").createIndex({ customerId: 1 }, { unique: true });
    await superAdminDb.collection("customers").createIndex({ adminEmail: 1 });
    console.log("✅ Created indexes");

    // Check if super admin already exists
    const superAdminsCollection = superAdminDb.collection("super_admins");
    const existingCount = await superAdminsCollection.countDocuments();

    if (existingCount > 0) {
      console.log("\n⚠️  Super admin users already exist:");
      const existingAdmins = await superAdminsCollection.find({}).toArray();
      existingAdmins.forEach((admin) => {
        console.log(`   - ${admin.email}`);
      });

      const createAnother = await question("\nDo you want to create another super admin? (y/n): ");
      if (createAnother.toLowerCase() !== "y") {
        console.log("\n✅ Initialization complete!");
        rl.close();
        await client.close();
        return;
      }
    }

    // Prompt for super admin details
    console.log("\n📝 Create Super Admin User");
    console.log("-".repeat(50));

    const email = await question("Email: ");
    const name = await question("Name: ");
    const password = await question("Password (min 6 chars): ");

    // Validation
    if (!email || !name || !password) {
      console.error("❌ All fields are required");
      rl.close();
      await client.close();
      return;
    }

    if (password.length < 6) {
      console.error("❌ Password must be at least 6 characters");
      rl.close();
      await client.close();
      return;
    }

    // Check if email already exists
    const existing = await superAdminsCollection.findOne({ email });
    if (existing) {
      console.error("❌ Super admin with this email already exists");
      rl.close();
      await client.close();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate TOTP secret for 2FA
    const totpSecret = speakeasy.generateSecret({
      name: `LeadRabbit Super Admin (${email})`,
      issuer: 'LeadRabbit'
    });

    // Create super admin user
    const superAdmin = {
      email,
      name,
      password: hashedPassword,
      totpSecret: totpSecret.base32,
      totpEnabled: false, // Will be enabled after first login setup
      createdAt: new Date(),
      lastLogin: null,
    };

    await superAdminsCollection.insertOne(superAdmin);

    console.log("\n✅ Super admin user created successfully!");
    console.log("\n📋 Login Details:");
    console.log("-".repeat(50));
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log("\n🔐 Super Admin Login URL:");
    console.log(`${process.env.URL || "http://localhost:4000"}/superadmin/$2b$12$Q9q2XQ1HqQw8J5HqJ8GZFez0M5vYkF1n1m4ZrYqXzZB9Zz7mZC9b2`);
    console.log("\n🔑 2FA Authentication:");
    console.log("You will be asked to set up 2FA (Authenticator App) on first login.");
    console.log("Use Google Authenticator, Authy, or any TOTP-compatible app.");
    console.log("\n⚠️  IMPORTANT: Save these credentials securely!");
    console.log("\n✅ Initialization complete!");

  } catch (error) {
    console.error("\n❌ Error during initialization:", error);
  } finally {
    rl.close();
    await client.close();
  }
}

initializeSuperAdmin();
