// lib/multitenancy.ts
import { MongoClient, Db } from "mongodb";
import clientPromise from "./mongodb";

/**
 * Multi-tenancy helper functions
 * Each customer gets their own database
 */

export interface Customer {
  _id?: any;
  customerId: string;
  customerName: string;
  databaseName: string;
  adminEmail: string;
  adminId?: string; // MongoDB ObjectId of admin user in customer database
  maxUsers?: number;
  maxAdmins?: number;
  status: "active" | "inactive" | "suspended";
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    companyName?: string;
    phone?: string;
    address?: string;
  };
}

/**
 * Get the super admin database (main database for managing customers)
 */
export async function getSuperAdminDb(): Promise<Db | null> {
  try {
    const client = await clientPromise;
    if (!client) {
      console.error("MongoDB client unavailable");
      return null;
    }
    // Super admin database name
    return client.db("leadrabbit_superadmin");
  } catch (error) {
    console.error("Error getting super admin database:", error);
    return null;
  }
}

/**
 * Get a customer's database by customer ID
 */
export async function getCustomerDb(customerId: string): Promise<Db | null> {
  try {
    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) return null;

    const customersCollection = superAdminDb.collection<Customer>("customers");
    const customer = await customersCollection.findOne({ customerId });

    if (!customer) {
      console.error(`Customer not found: ${customerId}`);
      return null;
    }

    if (customer.status !== "active") {
      console.error(`Customer is not active: ${customerId}`);
      return null;
    }

    const client = await clientPromise;
    if (!client) return null;

    return client.db(customer.databaseName);
  } catch (error) {
    console.error("Error getting customer database:", error);
    return null;
  }
}

/**
 * Get a customer's database by admin/user email
 */
export async function getCustomerDbByEmail(email: string): Promise<{ db: Db; customer: Customer } | null> {
  try {
    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) return null;

    const customersCollection = superAdminDb.collection<Customer>("customers");
    
    // Convert email to lowercase for case-insensitive comparison
    const lowerEmail = email.toLowerCase().trim();
    
    // First, try to find customer by admin email
    let customer = await customersCollection.findOne({ adminEmail: lowerEmail, status: "active" });

    // If not found as admin, search in customer databases for user email
    if (!customer) {
      const allCustomers = await customersCollection.find({ status: "active" }).toArray();
      const client = await clientPromise;
      if (!client) return null;

      for (const cust of allCustomers) {
        const customerDb = client.db(cust.databaseName);
        const usersCollection = customerDb.collection("users");
        const user = await usersCollection.findOne({ email: lowerEmail });
        
        if (user) {
          customer = cust;
          break;
        }
      }
    }

    if (!customer) {
      console.error(`No customer found for email: ${email}`);
      return null;
    }

    const client = await clientPromise;
    if (!client) return null;

    const db = client.db(customer.databaseName);
    return { db, customer };
  } catch (error) {
    console.error("Error getting customer database by email:", error);
    return null;
  }
}

/**
 * Initialize a new customer database with required collections
 */
export async function initializeCustomerDatabase(databaseName: string): Promise<boolean> {
  try {
    const client = await clientPromise;
    if (!client) return false;

    const db = client.db(databaseName);

    // Create required collections with initial structure
    const collections = [
      "users",
      "employees",
      "leads",
      "meta_pages",
      "meta_leads",
      "meetings",
      "settings",
    ];

    for (const collectionName of collections) {
      // Create collection if it doesn't exist
      const existingCollections = await db.listCollections({ name: collectionName }).toArray();
      if (existingCollections.length === 0) {
        await db.createCollection(collectionName);
        console.log(`Created collection: ${collectionName}`);
      }
    }

    // Create indexes for better performance
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("leads").createIndex({ email: 1 });
    await db.collection("leads").createIndex({ assignedTo: 1 });
    await db.collection("leads").createIndex({ createdAt: -1 });
    await db.collection("meta_pages").createIndex({ pageId: 1 });
    
    // Initialize default settings
    await db.collection("settings").updateOne(
      { name: "leadAssignment" },
      {
        $setOnInsert: {
          name: "leadAssignment",
          lastAssignedIndex: -1,
          lastAssignedUser: null,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    console.log(`Customer database initialized: ${databaseName}`);
    return true;
  } catch (error) {
    console.error("Error initializing customer database:", error);
    return false;
  }
}

/**
 * Check if email exists in any customer database
 */
export async function isEmailTaken(email: string): Promise<boolean> {
  try {
    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) return false;

    const customersCollection = superAdminDb.collection<Customer>("customers");
    
    // Convert email to lowercase for case-insensitive comparison
    const lowerEmail = email.toLowerCase().trim();
    
    // Check if email is used as admin email
    const adminExists = await customersCollection.findOne({ adminEmail: lowerEmail });
    if (adminExists) return true;

    // Check all customer databases
    const allCustomers = await customersCollection.find({ status: "active" }).toArray();
    const client = await clientPromise;
    if (!client) return false;

    for (const customer of allCustomers) {
      const customerDb = client.db(customer.databaseName);
      const usersCollection = customerDb.collection("users");
      const user = await usersCollection.findOne({ email: lowerEmail });
      if (user) return true;
    }

    return false;
  } catch (error) {
    console.error("Error checking email:", error);
    return false;
  }
}

/**
 * Create a new customer
 */
export async function createCustomer(
  customerName: string,
  adminEmail: string,
  adminPassword: string,
  metadata?: Customer["metadata"],
  maxUsers?: number,
  maxAdmins?: number
): Promise<{ success: boolean; customerId?: string; error?: string }> {
  try {
    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) {
      return { success: false, error: "Super admin database unavailable" };
    }

    const customersCollection = superAdminDb.collection<Customer>("customers");
    
    // Convert email to lowercase for case-insensitive storage and comparison
    const lowerEmail = adminEmail.toLowerCase().trim();

    // Check if email is already taken globally
    const emailTaken = await isEmailTaken(lowerEmail);
    if (emailTaken) {
      return { success: false, error: "This email is already in use. Please use a different email." };
    }

    // Generate unique customer ID and database name
    const customerId = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const databaseName = `leadrabbit_${customerName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${customerId.split("_")[1]}`;

    // Create customer record
    const customer: Customer = {
      customerId,
      customerName,
      databaseName,
      adminEmail: lowerEmail,
      maxUsers: maxUsers || 10,
      maxAdmins: maxAdmins || 2,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
    };

    await customersCollection.insertOne(customer);

    // Initialize customer database
    const initialized = await initializeCustomerDatabase(databaseName);
    if (!initialized) {
      // Rollback customer creation
      await customersCollection.deleteOne({ customerId });
      return { success: false, error: "Failed to initialize customer database" };
    }

    // Create admin user in customer database
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const client = await clientPromise;
    if (!client) {
      return { success: false, error: "MongoDB client unavailable" };
    }

    const customerDb = client.db(databaseName);
    const usersCollection = customerDb.collection("users");

    const adminUserResult = await usersCollection.insertOne({
      email: lowerEmail,
      password: hashedPassword,
      name: customerName,
      role: "admin",
      totpEnabled: false,
      isFreshAccount: true,
      passwordResetRequired: true,
      isOnline: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Store the admin user ID in the customer record
    const adminId = adminUserResult.insertedId.toString();
    await customersCollection.updateOne(
      { customerId },
      { $set: { adminId } }
    );

    console.log(`Customer created successfully: ${customerId}`);
    return { success: true, customerId };
  } catch (error) {
    console.error("Error creating customer:", error);
    return { success: false, error: "Failed to create customer" };
  }
}

/**
 * Get all customers
 */
export async function getAllCustomers(): Promise<Customer[]> {
  try {
    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) return [];

    const customersCollection = superAdminDb.collection<Customer>("customers");
    const customers = await customersCollection.find({}).sort({ createdAt: -1 }).toArray();

    return customers;
  } catch (error) {
    console.error("Error getting all customers:", error);
    return [];
  }
}

/**
 * Update customer status
 */
export async function updateCustomerStatus(
  customerId: string,
  status: Customer["status"]
): Promise<boolean> {
  try {
    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) return false;

    const customersCollection = superAdminDb.collection<Customer>("customers");
    const result = await customersCollection.updateOne(
      { customerId },
      { $set: { status, updatedAt: new Date() } }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error("Error updating customer status:", error);
    return false;
  }
}

/**
 * Update customer information
 */
export async function updateCustomer(
  customerId: string,
  updateData: {
    customerName?: string;
    adminEmail?: string;
    metadata?: {
      companyName?: string;
      phone?: string;
      address?: string;
    };
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) {
      return { success: false, error: "Database unavailable" };
    }

    const customersCollection = superAdminDb.collection<Customer>("customers");
    
    // If email is being changed, check if new email is already taken
    if (updateData.adminEmail) {
      const customer = await customersCollection.findOne({ customerId });
      if (!customer) {
        return { success: false, error: "Customer not found" };
      }
      
      // Convert to lowercase and check if email is actually changing
      const lowerEmail = updateData.adminEmail.toLowerCase().trim();
      if (customer.adminEmail !== lowerEmail) {
        const emailTaken = await isEmailTaken(lowerEmail);
        if (emailTaken) {
          return { success: false, error: "This email is already in use. Please use a different email." };
        }
      }
    }

    const result = await customersCollection.updateOne(
      { customerId },
      { $set: { ...updateData, adminEmail: updateData.adminEmail?.toLowerCase().trim(), updatedAt: new Date() } }
    );

    if (result.modifiedCount === 0) {
      return { success: false, error: "No changes made or customer not found" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating customer:", error);
    return { success: false, error: "Failed to update customer" };
  }
}

/**
 * Delete customer and their database
 * WARNING: This is a destructive operation!
 */
export async function deleteCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const superAdminDb = await getSuperAdminDb();
    if (!superAdminDb) {
      return { success: false, error: "Database unavailable" };
    }

    const customersCollection = superAdminDb.collection<Customer>("customers");
    const customer = await customersCollection.findOne({ customerId });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    // Delete the customer's database
    const client = await clientPromise;
    if (client) {
      await client.db(customer.databaseName).dropDatabase();
      console.log(`Dropped database: ${customer.databaseName}`);
    }

    // Remove customer record from super admin DB
    await customersCollection.deleteOne({ customerId });
    console.log(`Deleted customer record: ${customerId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting customer:", error);
    return { success: false, error: "Failed to delete customer" };
  }
}
