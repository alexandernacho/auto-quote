# Supabase Service Role Key Setup

This document provides instructions for setting up the Supabase service role key to bypass RLS policies for document uploads.

## Why Use the Service Role Key?

The service role key is needed to bypass Row Level Security (RLS) policies in Supabase when uploading documents. This is necessary because:

1. The JWT token approach with Clerk was causing "invalid algorithm" errors
2. The RLS policies were causing "new row violates row-level security policy" errors
3. Using the service role key provides a reliable way to upload documents without these issues

## Security Considerations

The service role key has admin privileges and can bypass RLS policies. Therefore:

- **NEVER expose this key to the client-side code**
- Only use it in server-side code (server actions)
- Store it securely in environment variables
- Do not commit it to version control

## How to Get the Service Role Key

1. Go to the [Supabase dashboard](https://app.supabase.com/)
2. Select your project
3. Go to Project Settings > API
4. Find the "service_role key (secret)" section
5. Copy the key

## How to Set Up the Service Role Key

1. Add the key to your `.env.local` file:

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

2. Replace `your_service_role_key_here` with the actual key you copied from the Supabase dashboard

3. Restart your development server for the changes to take effect

## Verifying It Works

After setting up the service role key:

1. Try generating and downloading a document
2. Check the server logs for any errors
3. If successful, you should be able to download the document without any "unauthorized" errors

## Troubleshooting

If you're still experiencing issues:

1. Make sure the service role key is correctly set in your `.env.local` file
2. Verify that the key is being properly loaded in the server actions
3. Check that the Supabase client is being initialized with the service role key
4. Look for any errors in the server logs related to Supabase authentication
