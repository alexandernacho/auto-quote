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

// Define schema object with all tables for use in Drizzle
const schema = {
  profiles: profilesTable,
  clients: clientsTable,
  products: productsTable,
  templates: templatesTable,
  invoices: invoicesTable,
  invoiceItems: invoiceItemsTable,
  quotes: quotesTable,
  quoteItems: quoteItemsTable
}

// Validate database connection URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

// Initialize postgres client with the database URL from environment variables
const client = postgres(process.env.DATABASE_URL)

// Export configured Drizzle instance with schema
export const db = drizzle(client, { schema })