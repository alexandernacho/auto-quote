/**
 * @file Templates schema definition
 * @description 
 * Defines the database schema for invoice and quote templates.
 * Stores customization options and styling preferences for generated documents.
 * 
 * @dependencies
 * - drizzle-orm: ORM for type-safe database interactions
 * 
 * @notes
 * - Each template is associated with a user through userId
 * - Uses UUID for primary key
 * - Includes styling options like colors, fonts, and logo position
 * - Supports custom HTML for header and footer sections
 * - Uses pgEnum for template type (invoice/quote)
 */

import { boolean, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

// Define template types as a PostgreSQL enum
export const templateTypeEnum = pgEnum("template_type", ["invoice", "quote"])

// Define the templates table schema
export const templatesTable = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  type: templateTypeEnum("type").notNull(),
  logoPosition: text("logo_position").notNull().default("top-left"),
  primaryColor: text("primary_color").notNull().default("#000000"),
  secondaryColor: text("secondary_color").notNull().default("#ffffff"),
  font: text("font").notNull().default("Inter"),
  headerHtml: text("header_html"),
  footerHtml: text("footer_html"),
  paymentTerms: text("payment_terms"),
  notes: text("notes"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date())
})

// Export types for use in application code
export type InsertTemplate = typeof templatesTable.$inferInsert
export type SelectTemplate = typeof templatesTable.$inferSelect