/**
 * @file Clients schema definition
 * @description 
 * Defines the database schema for client information.
 * Stores client contact details and related information.
 * 
 * @dependencies
 * - drizzle-orm: ORM for type-safe database interactions
 * 
 * @notes
 * - Each client is associated with a user through userId
 * - Uses UUID for primary key
 * - Includes timestamps for record keeping
 */

import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

// Define the clients table schema
export const clientsTable = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  taxNumber: text("tax_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

// Export types for use in application code
export type InsertClient = typeof clientsTable.$inferInsert
export type SelectClient = typeof clientsTable.$inferSelect