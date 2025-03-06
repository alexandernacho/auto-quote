/**
 * @file Document generation server actions
 * @description 
 * Provides server actions for generating and managing document files (PDF/DOCX).
 * Handles generation, storage, and retrieval of invoice and quote documents.
 * 
 * Key features:
 * - Generate PDF documents for invoices and quotes
 * - Generate DOCX documents for invoices and quotes
 * - Upload generated documents to Supabase Storage
 * - Get URLs for document download
 * - Standardized error handling
 * 
 * @dependencies
 * - generatePdf: PDF generation utility
 * - generateDocx: DOCX generation utility
 * - Supabase: For document storage
 * - Database actions: For retrieving data to generate documents
 * - handleActionError, createSuccessResponse: For standardized error handling
 * 
 * @notes
 * - Documents are stored in Supabase Storage with a path structure based on userId, documentType, and documentId
 * - Uses a consistent naming pattern for files: {invoice|quote}-{number}-{timestamp}.{pdf|docx}
 * - Handles both PDF and DOCX formats with separate generators
 * - Uses standardized error handling patterns for consistency
 */

"use server"

import {
  getClientByIdAction,
  getProfileByUserIdAction,
  getTemplateByIdAction,
  getInvoiceByIdAction,
  getInvoiceItemsByInvoiceIdAction,
  getQuoteByIdAction,
  getQuoteItemsByQuoteIdAction,
  getDefaultTemplateAction
} from "@/actions/db"
import { generatePdf } from "@/lib/document/pdf-generator"
import { generateDocx } from "@/lib/document/docx-generator"
import { handleActionError, createSuccessResponse } from "@/lib/error-handling"
import { createClient } from "@supabase/supabase-js"
import { auth } from "@clerk/nextjs/server"
import { ActionState } from "@/types"

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Utility function to create Supabase client with JWT authentication
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
 * Generate a document (PDF or DOCX) for an invoice or quote
 * 
 * @param type Document type ('invoice' or 'quote')
 * @param id Document ID
 * @param format Output format ('pdf' or 'docx')
 * @returns Promise resolving to an ActionState with the document URL
 */
export async function generateDocumentAction(
  type: 'invoice' | 'quote',
  id: string,
  format: 'pdf' | 'docx' = 'pdf'
): Promise<ActionState<{ url: string }>> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    
    // Get document data
    let document;
    let items;
    let template;
    let client;
    let documentNumber;
    
    // Fetch the appropriate document and items based on type
    if (type === 'invoice') {
      const invoiceResult = await getInvoiceByIdAction(id)
      if (!invoiceResult.isSuccess) {
        return { isSuccess: false, message: "Invoice not found" }
      }
      document = invoiceResult.data
      documentNumber = document.invoiceNumber
      
      const itemsResult = await getInvoiceItemsByInvoiceIdAction(id)
      items = itemsResult.isSuccess ? itemsResult.data : []
    } else {
      const quoteResult = await getQuoteByIdAction(id)
      if (!quoteResult.isSuccess) {
        return { isSuccess: false, message: "Quote not found" }
      }
      document = quoteResult.data
      documentNumber = document.quoteNumber
      
      const itemsResult = await getQuoteItemsByQuoteIdAction(id)
      items = itemsResult.isSuccess ? itemsResult.data : []
    }
    
    // Verify the document belongs to the authenticated user
    if (document.userId !== userId) {
      return { isSuccess: false, message: "Unauthorized access to document" }
    }
    
    // Get template
    if (document.templateId) {
      const templateResult = await getTemplateByIdAction(document.templateId)
      if (templateResult.isSuccess) {
        template = templateResult.data
      }
    }
    
    // Fallback to default template if no template is found
    if (!template) {
      const defaultTemplateResult = await getDefaultTemplateAction(userId, type)
      if (!defaultTemplateResult.isSuccess) {
        return { isSuccess: false, message: "No template found for document" }
      }
      template = defaultTemplateResult.data
    }
    
    // Get client if exists
    if (document.clientId) {
      const clientResult = await getClientByIdAction(document.clientId)
      if (clientResult.isSuccess) {
        client = clientResult.data
      }
    }
    
    // Get user profile
    const profileResult = await getProfileByUserIdAction(userId)
    if (!profileResult.isSuccess) {
      return { isSuccess: false, message: "User profile not found" }
    }
    const profile = profileResult.data
    
    // Prepare document data for generation
    const documentData = {
      type,
      document,
      items,
      template,
      client,
      profile
    }
    
    // Generate document based on requested format
    let fileBuffer: Buffer;
    if (format === 'pdf') {
      fileBuffer = await generatePdf(documentData)
    } else {
      fileBuffer = await generateDocx(documentData)
    }
    
    // Create filename with timestamp to prevent collisions
    const timestamp = new Date().getTime()
    const filename = `${type}-${documentNumber.replace(/[^a-zA-Z0-9]/g, '-')}-${timestamp}.${format}`
    const path = `${userId}/${type}s/${id}/${filename}`
    
    // Initialize Supabase client
    const supabase = await getSupabaseClient()
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || 'documents')
      .upload(path, fileBuffer, {
        contentType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      })
    
    if (error) {
      throw error
    }
    
    // Get public URL for the file
    const { data: urlData } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || 'documents')
      .createSignedUrl(path, 60 * 60 * 24 * 7) // URL valid for 7 days
    
    if (!urlData) {
      throw new Error('Failed to generate signed URL')
    }
    
    return createSuccessResponse(
      { url: urlData.signedUrl },
      `${type} ${format.toUpperCase()} generated successfully`,
      { operation: 'create', entityName: `${type} ${format}` }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'generateDocumentAction',
      entityName: `document (${type} ${format})`,
      operation: 'create',
      entityId: id
    })
  }
}

/**
 * Get a list of all generated documents for a specific invoice or quote
 * 
 * @param type Document type ('invoice' or 'quote')
 * @param id Document ID
 * @returns Promise resolving to an ActionState with an array of document URLs and metadata
 */
export async function getDocumentFilesAction(
  type: 'invoice' | 'quote',
  id: string
): Promise<ActionState<{ name: string, format: string, url: string, createdAt: string }[]>> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    
    // List files in the document directory
    const path = `${userId}/${type}s/${id}`
    
    // Initialize Supabase client
    const supabase = await getSupabaseClient()
    
    const { data, error } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || 'documents')
      .list(path)
    
    if (error) {
      throw error
    }
    
    if (!data || data.length === 0) {
      return createSuccessResponse(
        [],
        "No document files found",
        { operation: 'read', entityName: 'document files' }
      )
    }
    
    // Process file information
    const files = await Promise.all(data.map(async (file: { name: string; created_at?: string }) => {
      // Get file format from filename extension
      const format = file.name.split('.').pop() || ''
      
      // Get signed URL (valid for 7 days)
      const { data: urlData } = await supabase.storage
        .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || 'documents')
        .createSignedUrl(`${path}/${file.name}`, 60 * 60 * 24 * 7)
      
      if (!urlData) {
        console.error(`Failed to generate signed URL for ${file.name}`)
        return null
      }
      
      return {
        name: file.name,
        format: format.toUpperCase(),
        url: urlData.signedUrl,
        createdAt: new Date(file.created_at || '').toISOString()
      }
    }))
    
    // Filter out any null entries (failed URL generation)
    const validFiles = files.filter(file => file !== null)
    
    // Sort files by creation date (most recent first)
    validFiles.sort((a: { createdAt: string }, b: { createdAt: string }) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    return createSuccessResponse(
      validFiles as Array<{ name: string, format: string, url: string, createdAt: string }>,
      "Document files retrieved successfully",
      { operation: 'read', entityName: 'document files' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'getDocumentFilesAction',
      entityName: 'document files',
      operation: 'read',
      entityId: id
    })
  }
}

/**
 * Delete a document file
 * 
 * @param type Document type ('invoice' or 'quote')
 * @param id Document ID
 * @param filename Name of the file to delete
 * @returns Promise resolving to an ActionState indicating success or failure
 */
export async function deleteDocumentFileAction(
  type: 'invoice' | 'quote',
  id: string,
  filename: string
): Promise<ActionState<void>> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    
    // Construct the full path
    const path = `${userId}/${type}s/${id}/${filename}`
    
    // Initialize Supabase client
    const supabase = await getSupabaseClient()
    
    // Delete the file
    const { error } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_DOCUMENTS_BUCKET || 'documents')
      .remove([path])
    
    if (error) {
      throw error
    }
    
    return createSuccessResponse(
      undefined,
      "Document file deleted successfully",
      { operation: 'delete', entityName: 'document file' }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'deleteDocumentFileAction',
      entityName: 'document file',
      operation: 'delete',
      entityId: id
    })
  }
}

/**
 * Generate a document for email attachment
 * This is similar to generateDocumentAction but returns the file buffer instead of URL
 * 
 * @param type Document type ('invoice' or 'quote')
 * @param id Document ID
 * @param format Output format ('pdf' or 'docx')
 * @returns Promise resolving to an ActionState with the document buffer and name
 */
export async function generateDocumentForEmailAction(
  type: 'invoice' | 'quote',
  id: string,
  format: 'pdf' | 'docx' = 'pdf'
): Promise<ActionState<{ buffer: Buffer, filename: string }>> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    
    // Get document data (same as in generateDocumentAction)
    let document;
    let items;
    let template;
    let client;
    let documentNumber;
    
    if (type === 'invoice') {
      const invoiceResult = await getInvoiceByIdAction(id)
      if (!invoiceResult.isSuccess) {
        return { isSuccess: false, message: "Invoice not found" }
      }
      document = invoiceResult.data
      documentNumber = document.invoiceNumber
      
      const itemsResult = await getInvoiceItemsByInvoiceIdAction(id)
      items = itemsResult.isSuccess ? itemsResult.data : []
    } else {
      const quoteResult = await getQuoteByIdAction(id)
      if (!quoteResult.isSuccess) {
        return { isSuccess: false, message: "Quote not found" }
      }
      document = quoteResult.data
      documentNumber = document.quoteNumber
      
      const itemsResult = await getQuoteItemsByQuoteIdAction(id)
      items = itemsResult.isSuccess ? itemsResult.data : []
    }
    
    // Verify the document belongs to the authenticated user
    if (document.userId !== userId) {
      return { isSuccess: false, message: "Unauthorized access to document" }
    }
    
    // Get template
    if (document.templateId) {
      const templateResult = await getTemplateByIdAction(document.templateId)
      if (templateResult.isSuccess) {
        template = templateResult.data
      }
    }
    
    // Fallback to default template
    if (!template) {
      const defaultTemplateResult = await getDefaultTemplateAction(userId, type)
      if (!defaultTemplateResult.isSuccess) {
        return { isSuccess: false, message: "No template found for document" }
      }
      template = defaultTemplateResult.data
    }
    
    // Get client if exists
    if (document.clientId) {
      const clientResult = await getClientByIdAction(document.clientId)
      if (clientResult.isSuccess) {
        client = clientResult.data
      }
    }
    
    // Get user profile
    const profileResult = await getProfileByUserIdAction(userId)
    if (!profileResult.isSuccess) {
      return { isSuccess: false, message: "User profile not found" }
    }
    const profile = profileResult.data
    
    // Prepare document data
    const documentData = {
      type,
      document,
      items,
      template,
      client,
      profile
    }
    
    // Generate document
    let fileBuffer: Buffer;
    if (format === 'pdf') {
      fileBuffer = await generatePdf(documentData)
    } else {
      fileBuffer = await generateDocx(documentData)
    }
    
    // Create filename
    const filename = `${type}-${documentNumber.replace(/[^a-zA-Z0-9]/g, '-')}.${format}`
    
    return createSuccessResponse(
      {
        buffer: fileBuffer,
        filename
      },
      `${type} ${format.toUpperCase()} generated successfully for email`,
      { operation: 'create', entityName: `${type} ${format} email attachment` }
    )
  } catch (error) {
    return handleActionError(error, {
      actionName: 'generateDocumentForEmailAction',
      entityName: `document for email (${type} ${format})`,
      operation: 'create',
      entityId: id
    })
  }
}