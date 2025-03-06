# Supabase RLS Policy Setup Instructions

This document provides instructions for setting up Row Level Security (RLS) policies in Supabase to secure storage access for the application.

## Background

The application uses Supabase Storage for storing:
1. Business logos
2. Generated documents (invoices and quotes)

We need to ensure that users can only access their own files, which requires proper RLS policies.

## Prerequisites

1. Access to the Supabase dashboard for your project
2. Admin privileges to modify RLS policies

## Storage Buckets Setup

Ensure you have the following buckets created in Supabase:
- `logos` - For storing business logos
- `documents` - For storing generated documents (invoices and quotes)

### Bucket Configuration

For each bucket, ensure the following settings:

1. **Public/Private Setting**:
   - Set both buckets to **Private** (not public)
   - This ensures that files can only be accessed with proper authentication

2. **File Size Limits**:
   - Set appropriate file size limits (recommended: 5-10MB)

3. **Allowed MIME Types**:
   - For logos bucket: `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`
   - For documents bucket: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

## RLS Policy Setup

### 1. Enable RLS on Storage Buckets

For each bucket:
1. Go to the Supabase dashboard
2. Navigate to Storage > Buckets
3. Select the bucket
4. Enable RLS by toggling the "Row Level Security" switch to ON

### 2. Create RLS Policies for Documents Bucket

First, **delete any existing policies** that might be conflicting, then run the following SQL in the Supabase SQL Editor:

```sql
-- Delete existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- Create a single policy for all operations (simpler approach)
CREATE POLICY "Allow all operations for users on their own documents"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'documents' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR auth.role() = 'service_role')
);
```

### 3. Create RLS Policies for Logos Bucket

Similarly, for the logos bucket:

```sql
-- Delete existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can read logos" ON storage.objects;

-- Create a single policy for all operations
CREATE POLICY "Allow all operations for users on their own logos"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'logos' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR auth.role() = 'service_role')
);

-- Add public read access for logos if needed
CREATE POLICY "Public can read logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');
```

### 4. Alternative Approach: Temporarily Disable RLS for Testing

If you're still experiencing issues, you can temporarily disable RLS to verify if that's the source of the problem:

1. Go to the Supabase dashboard
2. Navigate to Storage > Buckets
3. Select the bucket
4. Disable RLS by toggling the "Row Level Security" switch to OFF

**Note**: This should only be done temporarily for testing purposes. Re-enable RLS once you've confirmed it's working.

## Verification

After setting up the policies:

1. Test uploading a file as a logged-in user
2. Test accessing a file as the same user (should succeed)
3. Test accessing another user's file (should fail)
4. Test public access to logos if you enabled that policy

## Troubleshooting

If you encounter issues:

1. Check that the user ID format in your application matches what Supabase expects
   - The error "new row violates row-level security policy" often means the user ID format doesn't match
   - Ensure the user ID in your file paths exactly matches the auth.uid() value in Supabase

2. Check the file path structure
   - Ensure the file paths follow the expected pattern: `{userId}/{type}/{id}/{filename}`
   - The first segment must exactly match the user's ID in Supabase

3. Try using the service role for uploads
   - If you're still having issues, you can use the service role key for uploads
   - This bypasses RLS but should be used carefully

4. Check Supabase logs for detailed error messages

5. Verify bucket existence
   - The error "Bucket not found" indicates that the bucket doesn't exist or is misspelled
   - Double-check the bucket names in your environment variables and Supabase dashboard
