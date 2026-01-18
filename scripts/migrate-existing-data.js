// scripts/migrate-existing-data.js
/**
 * Migrate Existing Single-Tenant Data to Multi-Tenant
 * 
 * This script helps you migrate your existing single-tenant database
 * to a customer database in the new multi-tenant system.
 * 
 * Prerequisites:
 * 1. Super admin must be created
 * 2. Customer must be created via super admin dashboard
 * 
 * Run: node scripts/migrate-existing-data.js
 */

const { MongoClient } = require("mongodb");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function migrateData() {
  console.log("\n🔄 LeadRabbit Data Migration Tool\n");
  console.log("=" .repeat(60));
  console.log("This tool migrates data from your old single-tenant database");
  console.log("to a customer database in the new multi-tenant system.");
  console.log("=" .repeat(60));

  // Get MongoDB URI
  const MONGODB_URI = process.env.MONGODB_URI || await question("\nEnter MongoDB URI: ");
  
  if (!MONGODB_URI) {
    console.error("❌ MongoDB URI is required");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    // Get old database name
    console.log("\n📋 Step 1: Source Database");
    const oldDbName = await question("Enter OLD database name (e.g., 'leadRabbit'): ");
    
    if (!oldDbName) {
      console.error("❌ Old database name is required");
      rl.close();
      await client.close();
      return;
    }

    const oldDb = client.db(oldDbName);

    // Verify old database has data
    const oldCollections = await oldDb.listCollections().toArray();
    console.log(`\n✅ Found ${oldCollections.length} collections in ${oldDbName}`);
    oldCollections.forEach((col) => console.log(`   - ${col.name}`));

    // Get new customer database name
    console.log("\n📋 Step 2: Destination Customer Database");
    console.log("To find your customer database name:");
    console.log("  1. Login to super admin dashboard");
    console.log("  2. Find your customer in the table");
    console.log("  3. Copy the 'DATABASE' value");
    
    const newDbName = await question("\nEnter CUSTOMER database name: ");
    
    if (!newDbName) {
      console.error("❌ Customer database name is required");
      rl.close();
      await client.close();
      return;
    }

    const newDb = client.db(newDbName);

    // Verify customer database exists
    try {
      await newDb.listCollections().toArray();
      console.log(`✅ Customer database exists: ${newDbName}`);
    } catch (error) {
      console.error(`❌ Customer database not found: ${newDbName}`);
      console.error("Please create the customer first via super admin dashboard");
      rl.close();
      await client.close();
      return;
    }

    // Confirm migration
    console.log("\n⚠️  WARNING: This will copy data from:");
    console.log(`   FROM: ${oldDbName}`);
    console.log(`   TO:   ${newDbName}`);
    
    const confirm = await question("\nAre you sure you want to proceed? (yes/no): ");
    
    if (confirm.toLowerCase() !== "yes") {
      console.log("❌ Migration cancelled");
      rl.close();
      await client.close();
      return;
    }

    // Collections to migrate
    const collectionsToMigrate = [
      "users",
      "employees",
      "leads",
      "meta_pages",
      "meta_leads",
      "meetings",
      "settings",
    ];

    console.log("\n🔄 Starting migration...\n");

    let totalMigrated = 0;
    const migrationSummary = [];

    for (const collectionName of collectionsToMigrate) {
      try {
        const sourceCollection = oldDb.collection(collectionName);
        const destCollection = newDb.collection(collectionName);

        // Count existing documents
        const existingCount = await destCollection.countDocuments();
        
        // Get all documents from old collection
        const documents = await sourceCollection.find({}).toArray();

        if (documents.length === 0) {
          console.log(`⚪ ${collectionName}: No data to migrate`);
          migrationSummary.push({
            collection: collectionName,
            status: "empty",
            count: 0,
          });
          continue;
        }

        if (existingCount > 0) {
          console.log(`⚠️  ${collectionName}: Already has ${existingCount} documents`);
          const overwrite = await question(`   Append ${documents.length} new documents? (yes/no): `);
          
          if (overwrite.toLowerCase() !== "yes") {
            console.log(`   ⏭️  Skipped ${collectionName}`);
            migrationSummary.push({
              collection: collectionName,
              status: "skipped",
              count: 0,
            });
            continue;
          }
        }

        // Insert documents into new collection
        await destCollection.insertMany(documents);
        totalMigrated += documents.length;

        console.log(`✅ ${collectionName}: Migrated ${documents.length} documents`);
        migrationSummary.push({
          collection: collectionName,
          status: "success",
          count: documents.length,
        });

      } catch (error) {
        console.error(`❌ ${collectionName}: Migration failed - ${error.message}`);
        migrationSummary.push({
          collection: collectionName,
          status: "failed",
          count: 0,
          error: error.message,
        });
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Migration Summary");
    console.log("=".repeat(60));
    
    console.log("\n✅ Successfully migrated:");
    migrationSummary
      .filter((m) => m.status === "success")
      .forEach((m) => {
        console.log(`   - ${m.collection}: ${m.count} documents`);
      });

    console.log("\n⚪ Empty collections:");
    migrationSummary
      .filter((m) => m.status === "empty")
      .forEach((m) => {
        console.log(`   - ${m.collection}`);
      });

    if (migrationSummary.some((m) => m.status === "skipped")) {
      console.log("\n⏭️  Skipped collections:");
      migrationSummary
        .filter((m) => m.status === "skipped")
        .forEach((m) => {
          console.log(`   - ${m.collection}`);
        });
    }

    if (migrationSummary.some((m) => m.status === "failed")) {
      console.log("\n❌ Failed migrations:");
      migrationSummary
        .filter((m) => m.status === "failed")
        .forEach((m) => {
          console.log(`   - ${m.collection}: ${m.error}`);
        });
    }

    console.log("\n" + "=".repeat(60));
    console.log(`Total documents migrated: ${totalMigrated}`);
    console.log("=".repeat(60));

    console.log("\n✅ Migration completed!");
    console.log("\n📝 Next steps:");
    console.log("   1. Login as the customer admin");
    console.log("   2. Verify all data is visible");
    console.log("   3. Test creating new leads/users");
    console.log("   4. Once verified, you can delete the old database");

  } catch (error) {
    console.error("\n❌ Migration error:", error);
  } finally {
    rl.close();
    await client.close();
  }
}

migrateData();
