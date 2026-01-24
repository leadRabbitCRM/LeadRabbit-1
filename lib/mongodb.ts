// lib/mongodb.ts
import { MongoClient, MongoClientOptions } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient | null> | undefined;
}

const uri = process.env.MONGODB_URI as string | undefined;

// Enhanced validation with early return for build time
if (!uri) {
  console.warn('MONGODB_URI not provided - database operations will be disabled');
} else if (!uri.startsWith('mongodb+srv://') && !uri.startsWith('mongodb://')) {
  console.error('Invalid MongoDB URI format. Use mongodb+srv:// for Atlas.');
  console.error('Received URI format:', uri.substring(0, 20) + '...');
}

// Environment-specific options for better cloud compatibility
const isProduction = process.env.NODE_ENV === 'production';

// Detect if using MongoDB Atlas (cloud) or local MongoDB
const isMongoAtlas = uri && uri.includes('mongodb+srv://');
const isLocalMongo = uri && (uri.includes('localhost') || uri.includes('127.0.0.1') || /mongodb:\/\/\d+\.\d+\.\d+\.\d+/.test(uri));

const options: MongoClientOptions = {
  // Only use TLS for MongoDB Atlas
  tls: isMongoAtlas ? true : false,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false,
  family: 4, // Prefer IPv4
  serverSelectionTimeoutMS: isProduction ? 30000 : 10000,
  connectTimeoutMS: isProduction ? 60000 : 20000,
  socketTimeoutMS: isProduction ? 60000 : 20000,
  maxPoolSize: isProduction ? 15 : 5,
  minPoolSize: isProduction ? 2 : 1,
  maxIdleTimeMS: 30000,
  retryWrites: isMongoAtlas ? true : false, // Only retry writes on Atlas
  retryReads: true,
  heartbeatFrequencyMS: 10000,
};

let clientPromise: Promise<MongoClient | null>;

if (!uri) {
  // Don't create a rejected promise — return a resolved null so consumers can handle absence
  clientPromise = Promise.resolve(null);
} else {
  // Create a single client instance in development to reuse connections
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      // Enhanced error logging for debugging TLS issues
      global._mongoClientPromise = client.connect().catch((err) => {
        console.error("MongoDB connection error:", {
          message: err.message,
          code: err.code,
          name: err.name,
          uri: uri.replace(/\/\/.*:.*@/, '//***:***@'), // Hide credentials in logs
          options: { ...options, tls: options.tls },
        });
        return null;
      });
    }

    clientPromise = global._mongoClientPromise as Promise<MongoClient | null>;
  } else {
    const client = new MongoClient(uri, options);
    clientPromise = client.connect().catch((err) => {
      console.error("MongoDB connection error in production:", {
        message: err.message,
        code: err.code,
        name: err.name,
        uri: uri.replace(/\/\/.*:.*@/, '//***:***@'), // Hide credentials in logs
        nodeEnv: process.env.NODE_ENV,
      });
      return null;
    });
  }
}

export default clientPromise;
