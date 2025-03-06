/**
 * @file Error handling utilities for server actions
 * @description 
 * Provides standardized error handling functions for use in server actions.
 * Centralizes logging, error formatting, and consistent response generation.
 * 
 * Key features:
 * - Standardized error handling for all server actions
 * - Consistent error logging with context information
 * - Type-safe response generation for action results
 * - Support for both expected and unexpected errors
 * 
 * @dependencies
 * - ActionState type: For consistent error response structure
 * 
 * @notes
 * - Used by all server actions to ensure consistent error handling
 * - Preserves original error details for debugging while providing clean user messages
 * - Includes context information in logs to aid troubleshooting
 */

import { ActionState } from "@/types"

/**
 * Standard error handler for server actions
 * Provides consistent error handling, logging, and response formatting
 * 
 * @param error The caught error
 * @param context Object containing context information about the action
 * @param userMessage Optional custom message to display to the user
 * @returns ActionState with isSuccess: false and appropriate error message
 */
export function handleActionError(
  error: unknown,
  context: {
    actionName: string;
    entityName?: string;
    operation?: 'create' | 'read' | 'update' | 'delete' | string;
    entityId?: string;
  },
  userMessage?: string
): ActionState<never> {
  // Destructure context for easier access
  const { actionName, entityName, operation, entityId } = context
  
  // Determine error message and details
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined
  
  // Log the error with context
  console.error(
    `Error in ${actionName}:`,
    {
      error: errorMessage,
      entity: entityName,
      operation,
      entityId,
      stack: errorStack
    }
  )
  
  // Return standardized action state with appropriate message
  return { 
    isSuccess: false, 
    message: userMessage || getDefaultErrorMessage(operation, entityName)
  }
}

/**
 * Generates a default user-friendly error message based on the operation and entity
 * 
 * @param operation The operation being performed (create, read, update, delete)
 * @param entityName The name of the entity being operated on
 * @returns A user-friendly error message
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
    default:
      return `Operation failed`
  }
}

/**
 * Wraps an action function with standardized error handling
 * 
 * @param actionFn The action function to wrap
 * @param context Object containing context information about the action
 * @returns A wrapped function with standardized error handling
 */
export function withErrorHandling<T, Args extends any[]>(
  actionFn: (...args: Args) => Promise<ActionState<T>>,
  context: {
    actionName: string;
    entityName?: string;
    operation?: 'create' | 'read' | 'update' | 'delete' | string;
  }
): (...args: Args) => Promise<ActionState<T>> {
  return async (...args: Args) => {
    try {
      return await actionFn(...args)
    } catch (error) {
      return handleActionError(
        error,
        context
      ) as ActionState<T> // Type assertion needed for compatibility
    }
  }
}

/**
 * Create a standardized success response
 * 
 * @param data The data to include in the response
 * @param message Optional success message (defaults to operation-specific message)
 * @param context Optional context information for generating the default message
 * @returns ActionState with isSuccess: true and the provided data and message
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  context?: {
    operation?: 'create' | 'read' | 'update' | 'delete' | string;
    entityName?: string;
  }
): ActionState<T> {
  return {
    isSuccess: true,
    message: message || getDefaultSuccessMessage(
      context?.operation,
      context?.entityName
    ),
    data
  }
}

/**
 * Generates a default success message based on the operation and entity
 * 
 * @param operation The operation being performed (create, read, update, delete)
 * @param entityName The name of the entity being operated on
 * @returns A user-friendly success message
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
    default:
      return `Operation completed successfully`
  }
}