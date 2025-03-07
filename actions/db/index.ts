/**
@file Database actions index
@description
Central export point for all database-related server actions.
This file aggregates all actions for easier importing across the application.

Optimizations:


Provides a single import point for database actions




Organizes actions by entity type




Improves code organization and maintainability



@notes


Import from "@/actions/db" to access all database actions




Actions are grouped by entity type in the export statements
*/



// Client-related actions
export * from "./clients-actions"
// Invoice-related actions
export * from "./invoices-actions"
// Profile-related actions
export * from "./profiles-actions"
// Product-related actions
export * from "./products-actions"
// Quote-related actions
export * from "./quotes-actions"
// Template-related actions
export * from "./templates-actions"