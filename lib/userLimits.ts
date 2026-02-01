import clientPromise from "@/lib/mongodb";

export async function checkUserLimit(customerId: string, customerDbName: string): Promise<{ allowed: boolean; current: number; limit: number; message: string }> {
  try {
    const client = await clientPromise;
    if (!client) {
      return { allowed: true, current: 0, limit: Infinity, message: "Database unavailable" };
    }

    // Get master database
    const masterDb = client.db("leadrabbit_superadmin");
    const customersCollection = masterDb.collection("customers");

    // Get customer limits
    const customer = await customersCollection.findOne({ customerId });
    if (!customer) {
      return { allowed: false, current: 0, limit: 0, message: "Customer not found" };
    }

    const maxUsers = customer.maxUsers || Infinity;
    
    // Get customer database
    const customerDb = client.db(customerDbName);
    const usersCollection = customerDb.collection("users");

    // Count users (exclude admins)
    const currentUsers = await usersCollection.countDocuments({ role: "user" });

    return {
      allowed: currentUsers < maxUsers,
      current: currentUsers,
      limit: maxUsers,
      message: currentUsers >= maxUsers 
        ? `You can only create ${maxUsers} user(s). Current: ${currentUsers}. If you want to create more, contact LeadRabbit.`
        : ""
    };
  } catch (error) {
    console.error("Error checking user limit:", error);
    return { allowed: true, current: 0, limit: Infinity, message: "" };
  }
}

export async function checkAdminLimit(customerId: string, customerDbName: string): Promise<{ allowed: boolean; current: number; limit: number; message: string }> {
  try {
    const client = await clientPromise;
    if (!client) {
      return { allowed: true, current: 0, limit: Infinity, message: "Database unavailable" };
    }

    // Get master database
    const masterDb = client.db("leadrabbit_superadmin");
    const customersCollection = masterDb.collection("customers");

    // Get customer limits
    const customer = await customersCollection.findOne({ customerId });
    if (!customer) {
      return { allowed: false, current: 0, limit: 0, message: "Customer not found" };
    }

    const maxAdmins = customer.maxAdmins || Infinity;
    
    // Get customer database
    const customerDb = client.db(customerDbName);
    const usersCollection = customerDb.collection("users");

    // Count admins
    const currentAdmins = await usersCollection.countDocuments({ role: "admin" });

    return {
      allowed: currentAdmins < maxAdmins,
      current: currentAdmins,
      limit: maxAdmins,
      message: currentAdmins >= maxAdmins 
        ? `You can only create ${maxAdmins} admin(s). Current: ${currentAdmins}. If you want to create more, contact LeadRabbit.`
        : ""
    };
  } catch (error) {
    console.error("Error checking admin limit:", error);
    return { allowed: true, current: 0, limit: Infinity, message: "" };
  }
}
