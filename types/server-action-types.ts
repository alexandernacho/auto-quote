/**
 * @file Server action type definitions
 * @description 
 * Type definitions for server actions used throughout the application.
 * Provides consistent types for action responses, pagination, and filtering.
 * 
 * Key types:
 * - ActionState: Standard response format for all server actions
 * - PaginationParams: For paginated requests
 * - SortParams: For sorting results
 * - FilterParams: For filtering results
 * 
 * @notes
 * - All server actions should return ActionState<T> for consistent error handling
 * - ActionState is a discriminated union type based on the isSuccess flag
 * - Successful actions include data of the specified type
 * - Failed actions include an error message but no data
 */

/**
 * Standard response type for all server actions
 * Discriminated union type based on isSuccess flag
 * 
 * @template T Type of data returned by the action
 */
export type ActionState<T> =
  | { isSuccess: true; message: string; data: T }
  | { isSuccess: false; message: string; data?: never }

/**
 * Parameters for paginated requests
 */
export interface PaginationParams {
  page: number
  perPage: number
}

/**
 * Parameters for sorting results
 */
export interface SortParams {
  field: string
  direction: 'asc' | 'desc'
}

/**
 * Parameters for filtering results
 */
export interface FilterParams {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith'
  value: string | number | boolean | null
}

/**
 * Common query parameters for list endpoints
 */
export interface QueryParams {
  pagination?: PaginationParams
  sort?: SortParams
  filters?: FilterParams[]
  search?: string
}

/**
 * Response type for paginated results
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

/**
 * Action context for error handling
 */
export interface ActionContext {
  actionName: string
  entityName: string
  operation: 'create' | 'read' | 'update' | 'delete' | 'process'
  entityId?: string
}

/**
 * Bulk operation response
 */
export interface BulkActionResponse {
  successCount: number
  errorCount: number
  errors?: Array<{ id: string; message: string }>
}