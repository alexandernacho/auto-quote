/**
 * @file UI component type definitions
 * @description 
 * Type definitions for UI components used throughout the application.
 * This centralizes UI-specific types to ensure consistency across the codebase.
 * 
 * Key types:
 * - BaseProps: Common properties shared by many components
 * - ToastProps and ToastActionElement: For toast notification components
 * - PageProps: For Next.js page components
 * - Various event handler types
 * 
 * @dependencies
 * - React: For React-specific types
 * 
 * @notes
 * - When adding new UI components, add their types here if they're used in multiple places
 * - Keep types focused on UI concerns rather than business logic
 */

import { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react"

/**
 * Base props interface that can be extended by other component props
 */
export interface BaseProps {
  className?: string
  children?: ReactNode
}

/**
 * Common properties for form-related components
 */
export interface FormComponentProps extends BaseProps {
  id?: string
  label?: string
  description?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

/**
 * For components that can be rendered in different style variants
 */
export interface VariantProps<T> {
  variant?: T
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Toast notification component properties
 */
export interface ToastProps {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  variant?: "default" | "destructive" | "success"
  duration?: number
}

/**
 * Toast action element component properties
 */
export type ToastActionElement = React.ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>

/**
 * Page component properties with searchParams
 */
export interface PageProps {
  params: Record<string, string>
  searchParams: Record<string, string | string[] | undefined>
}

/**
 * Event handler type for form submission
 */
export type FormSubmitHandler<T> = (data: T) => void | Promise<void>

/**
 * Props for components that can be asynchronously loaded
 */
export interface AsyncComponentProps {
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
}

/**
 * Common dialog/modal properties
 */
export interface DialogProps extends BaseProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: ReactNode
  description?: ReactNode
}

/**
 * Props for components that have selectable items
 */
export interface SelectableProps<T> {
  items: T[]
  selectedItem?: T
  onSelect: (item: T) => void
}