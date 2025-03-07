/**
 * @file Database connection configuration
 * @description
 * This file initializes the database connection using Drizzle ORM and postgres.js.
 * It exports the configured database client for use throughout the application.
 * 
 * @dependencies
 * - drizzle-orm: ORM for type-safe database interactions
 * - postgres: PostgreSQL client for Node.js
 * 
 * @notes
 * - Uses environment variable DATABASE_URL for connection string
 * - Imports all schema tables and makes them available through the db object
 * - Schema object provides a central reference to all database tables
 */

import {
  profilesTable,
  clientsTable,
  productsTable,
  templatesTable,
  invoicesTable,
  invoiceItemsTable,
  quotesTable,
  quoteItemsTable
} from "@/db/schema"
import { config } from "dotenv"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

// Load environment variables from .env.local
config({ path: ".env.local" })

// Validate database connection URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

// Initialize postgres client with the database URL from environment variables
// Using connection pooling with reasonable defaults
const client = postgres(process.env.DATABASE_URL, {
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Connection timeout after 20 seconds of inactivity
  connect_timeout: 10 // Timeout after 10 seconds when connecting
})

// Define schema object with all tables for use in Drizzle
// Organized by entity types for better code organization
const schema = {
  // User-related tables
  profiles: profilesTable,
  // Business entity tables
  clients: clientsTable,
  products: productsTable,
  // Document definition tables
  templates: templatesTable,
  // Transaction tables - invoices
  invoices: invoicesTable,
  invoiceItems: invoiceItemsTable,
  // Transaction tables - quotes
  quotes: quotesTable,
  quoteItems: quoteItemsTable
}

// Export configured Drizzle instance with schema
export const db = drizzle(client, { schema })

// Export a function to close the database connection when needed
// This is important for serverless environments to prevent connection leaks
export const closeDbConnection = async () => {
  await client.end()
}