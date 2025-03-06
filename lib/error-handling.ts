/**
 * @file Error handling utilities
 * @description
 * Provides standardized error handling functions for server actions and other operations.
 * Implements consistent patterns for error reporting, logging, and response formatting.
 * 
 * Key features:
 * - Standardized error handling for server actions
 * - Context-aware error messages
 * - Success response formatting
 * - Higher-order function for wrapping actions with error handling
 * 
 * @dependencies
 * - ActionState: Type for action response structure
 * - ActionContext: Type for error context information
 * 
 * @notes
 * - All server actions should use these utilities for consistent error handling
 * - Error messages are customized based on operation and entity type
 * - Error details are logged to console for debugging
 */

import { ActionContext, ActionState } from "@/types"

/**
 * Handles errors in server actions with consistent formatting and logging
 * 
 * @param error The error that occurred
 * @param context Context information about the action and entity
 * @returns Standardized ActionState with error information
 */
export function handleActionError(
  error: unknown,
  context: ActionContext
): ActionState<never> {
  // Extract error details
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined
  
  // Log error with context details for debugging
  console.error(`Error in ${context.actionName}:`, {
    message: errorMessage,
    stack: errorStack,
    context
  })

  // Generate user-friendly error message
  const userMessage = getDefaultErrorMessage(
    context.operation,
    context.entityName
  )
  
  // Return standardized error response
  return {
    isSuccess: false,
    message: userMessage
  }
}

/**
 * Generate a default user-friendly error message based on operation and entity
 * 
 * @param operation The operation being performed (create, read, update, delete)
 * @param entityName The name of the entity being operated on
 * @returns User-friendly error message
 */
function getDefaultErrorMessage(
  operation?: string,
  entityName?: string
): string {
  const entity = entityName || 'item'
  
  switch (operation) {
    case 'create':
      return `Failed to create ${entity}`
    case 'read':
      return `Failed to retrieve ${entity}`
    case 'update':
      return `Failed to update ${entity}`
    case 'delete':
      return `Failed to delete ${entity}`
    case 'process':
      return `Failed to process ${entity}`
    default:
      return `An error occurred while working with ${entity}`
  }
}

/**
 * Higher-order function to wrap an action with standardized error handling
 * 
 * @param actionFn The action function to wrap
 * @param context Context information about the action and entity
 * @returns Wrapped function with error handling
 */
export function withErrorHandling<T, Args extends any[]>(
  actionFn: (...args: Args) => Promise<ActionState<T>>,
  context: ActionContext
): (...args: Args) => Promise<ActionState<T>> {
  return async (...args: Args) => {
    try {
      return await actionFn(...args)
    } catch (error) {
      return handleActionError(error, context)
    }
  }
}

/**
 * Creates a standardized success response for actions
 * 
 * @param data The data to include in the response
 * @param message Optional custom success message
 * @param context Optional context for generating default message
 * @returns Standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  context?: {
    operation?: string
    entityName?: string
  }
): ActionState<T> {
  // Use provided message or generate default
  const responseMessage = message || getDefaultSuccessMessage(
    context?.operation,
    context?.entityName
  )
  
  return {
    isSuccess: true,
    message: responseMessage,
    data
  }
}

/**
 * Generate a default success message based on operation and entity
 * 
 * @param operation The operation being performed (create, read, update, delete)
 * @param entityName The name of the entity being operated on
 * @returns User-friendly success message
 */
function getDefaultSuccessMessage(
  operation?: string,
  entityName?: string
): string {
  const entity = entityName || 'item'
  
  switch (operation) {
    case 'create':
      return `${entity} created successfully`
    case 'read':
      return `${entity} retrieved successfully`
    case 'update':
      return `${entity} updated successfully`
    case 'delete':
      return `${entity} deleted successfully`
    case 'process':
      return `${entity} processed successfully`
    default:
      return 'Operation completed successfully'
  }
}