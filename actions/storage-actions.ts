/**
 * @file Storage actions for Supabase buckets
 * @description 
 * This file contains server actions for managing files in Supabase Storage.
 * It provides operations for uploading, downloading, and deleting files
 * such as business logos and generated documents.
 * 
 * Key features:
 * - Uploading files to Supabase storage buckets
 * - Getting public URLs for files
 * - Deleting files
 * - Validation of file uploads
 * - Standardized error handling
 * 
 * @dependencies
 * - Supabase: For storage operations
 * - ActionState type: For consistent return values
 * - handleActionError, createSuccessResponse: For standardized error handling
 * 
 * @notes
 * - Files are organized by user ID to maintain separation and security
 * - File size and type validation is performed before upload
 * - Public URLs can be generated for files that need to be accessed directly
 * - Uses standardized error handling patterns for consistency
 */

"use server"

import { handleActionError, createSuccessResponse } from "@/lib/error-handling"
import { ActionState } from "@/types"
import { createClient } from "@supabase/supabase-js"
import { auth } from "@clerk/nextjs/server"

// Constants for file upload validation
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf", 
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/msword" // doc
]

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Utility function to create Supabase client
const getSupabaseClient = async () => {
  // Get the auth session
  const session = await auth();
  
  // Use service role key for uploads to bypass RLS
  // This is more reliable but should be used carefully
  if (supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  
  // Fallback to anonymous key if service role key is not available
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    }
  });
}

/**
 * Validates a file based on size and type
 * 
 * @param file - The file to validate
 * @param allowedTypes - Array of allowed MIME types
 * @param maxSize - Maximum file size in bytes
 * @returns Error message if invalid, null if valid
 */
function validateFile(
  file: File, 
  allowedTypes: string[] = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES],
  maxSize: number = MAX_FILE_SIZE
): string | null {
  if (file.size > maxSize) {
    return `File size exceeds limit (${(maxSize / 1024 / 1024).toFixed(1)}MB)`
  }

  if (!allowedTypes.includes(file.type)) {
    return "File type not allowed"
  }

  return null
}

/**
 * Uploads a logo file to Supabase storage
 * 
 * @param file - The logo file to upload
 * @returns Promise resolving to an ActionState with the logo URL
 */
export async function uploadLogoStorage(
  file: File
): Promise<ActionState<{ url: string }>> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    
    // Validate file
    const validationError = validateFile(file, ALLOWED_IMAGE_TYPES)
    if (validationError) {
      return { isSuccess: false, message: validationError }
    }
    
    // Create a unique filename with timestamp to avoid collisions
    const timestamp = new Date().getTime()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}-logo.${fileExtension}`
    const path = `${userId}/logo/${fileName}`
    
    // Initialize Supabase client
    const supabase = await getSupabaseClient()
    
    // Upload file
    const { data, error } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_LOGOS_BUCKET || 'logos')
      .upload(path, file, {
        upsert: true,
        contentType: file.type
      })
    
    if (error) {
      throw error
    }
    
    // Get public URL
    const { data: urlData } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_LOGOS_BUCKET || 'logos')
      .createSignedUrl(path, 60 * 60 * 24 * 30) // URL valid for 30 days
    
    if (!urlData) {
      throw new Error('Failed to generate signed URL')
    }
    
    return createSuccessResponse(
      { url: urlData.signedUrl },
      "Logo uploaded successfully",
      { operation: 'create', entityName: 'logo' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'uploadLogoStorage',
      entityName: 'logo',
      operation: 'create'
    })
  }
}

/**
 * Uploads a document file to Supabase storage
 * 
 * @param file - The document file to upload
 * @param documentType - The type of document (invoice/quote)
 * @param documentId - The ID of the document
 * @returns Promise resolving to an ActionState with the document URL
 */
export async function uploadDocumentStorage(
  file: File,
  documentType: 'invoice' | 'quote',
  documentId: string
): Promise<ActionState<{ url: string }>> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    
    // Validate file
    const validationError = validateFile(file, ALLOWED_DOCUMENT_TYPES)
    if (validationError) {
      return { isSuccess: false, message: validationError }
    }
    
    // Create a path for the document
    const timestamp = new Date().getTime()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}.${fileExtension}`
    const path = `${userId}/${documentType}s/${documentId}/${fileName}`
    
    // Initialize Supabase client
    const supabase = await getSupabaseClient()
    
    // Upload file
    const { data, error } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || 'documents')
      .upload(path, file, {
        upsert: true,
        contentType: file.type
      })
    
    if (error) {
      throw error
    }
    
    // Get public URL
    const { data: urlData } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || 'documents')
      .createSignedUrl(path, 60 * 60 * 24 * 7) // URL valid for 7 days
    
    if (!urlData) {
      throw new Error('Failed to generate signed URL')
    }
    
    return createSuccessResponse(
      { url: urlData.signedUrl },
      "Document uploaded successfully",
      { operation: 'create', entityName: 'document' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'uploadDocumentStorage',
      entityName: 'document',
      operation: 'create',
      entityId: documentId
    })
  }
}

/**
 * Deletes a file from Supabase storage
 * 
 * @param bucket - The storage bucket name
 * @param path - The path to the file
 * @returns Promise resolving to an ActionState with void data
 */
export async function deleteFileStorage(
  bucket: string,
  path: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    
    // Ensure the path contains the user's ID to prevent deletion of other users' files
    if (!path.startsWith(`${userId}/`)) {
      return { 
        isSuccess: false, 
        message: "Unauthorized: Cannot delete files from another user" 
      }
    }
    
    // Initialize Supabase client
    const supabase = await getSupabaseClient()
    
    // Delete the file
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])
    
    if (error) {
      throw error
    }
    
    return createSuccessResponse(
      undefined,
      "File deleted successfully",
      { operation: 'delete', entityName: 'file' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'deleteFileStorage',
      entityName: 'file',
      operation: 'delete'
    })
  }
}

/**
 * Gets a list of files in a directory
 * 
 * @param bucket - The storage bucket name
 * @param directory - The directory path
 * @returns Promise resolving to an ActionState with an array of file objects
 */
export async function listFilesStorage(
  bucket: string,
  directory: string
): Promise<ActionState<Array<{ name: string, path: string, url: string }>>> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    
    // Ensure the directory contains the user's ID to prevent listing other users' files
    const userDirectory = directory.startsWith(`${userId}/`) 
      ? directory 
      : `${userId}/${directory}`
    
    // Initialize Supabase client
    const supabase = await getSupabaseClient()
    
    // List files in the directory
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(userDirectory)
    
    if (error) {
      throw error
    }
    
    // Get public URLs for each file
    const files = await Promise.all(data.filter((item: { id: string }) => !item.id.endsWith('/')).map(async (item: { name: string }) => {
      const path = `${userDirectory}/${item.name}`
      const { data: urlData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24 * 7) // URL valid for 7 days
      
      if (!urlData) {
        console.error(`Failed to generate signed URL for ${item.name}`)
        return null
      }
      
      return {
        name: item.name,
        path: path,
        url: urlData.signedUrl
      }
    }))
    
    // Filter out any null entries (failed URL generation)
    const validFiles = files.filter(file => file !== null)
    
    return createSuccessResponse(
      validFiles as Array<{ name: string, path: string, url: string }>,
      "Files retrieved successfully",
      { operation: 'read', entityName: 'files' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'listFilesStorage',
      entityName: 'files',
      operation: 'read'
    })
  }
}