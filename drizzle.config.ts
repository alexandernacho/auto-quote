/**
 * @file Drizzle ORM configuration file
 * @description 
 * Configures Drizzle ORM for schema generation and migrations.
 * Sets up database connection details for schema operations.
 * 
 * @dependencies
 * - drizzle-kit: Schema management toolkit for Drizzle ORM
 * - dotenv: For loading environment variables
 * 
 * @notes
 * - Uses DATABASE_URL from .env.local file
 * - Specifies schema location and migration output directory
 * - Configures PostgreSQL as the database dialect
 */

import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

// Load environment variables from .env.local
config({ path: ".env.local" })

// Export Drizzle configuration
export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
})