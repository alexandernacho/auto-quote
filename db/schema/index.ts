/**

@file Schema exports index file
@description
Central export point for all database schema definitions.
Aggregates all table definitions and types for use throughout the application.

This file has been optimized to make imports more efficient by:


Using named exports for all schemas




Including both table definitions and their related types




Organizing exports in a logical manner by related entities
*/



// Export profile-related schemas and types
export * from "./profiles-schema"
// Export client-related schemas and types
export * from "./clients-schema"
// Export product-related schemas and types
export * from "./products-schema"
// Export template-related schemas and types
export * from "./templates-schema"
// Export invoice-related schemas and types
export * from "./invoices-schema"
// Export quote-related schemas and types
export * from "./quotes-schema"