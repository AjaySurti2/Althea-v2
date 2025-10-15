# Supabase Connection Guide

Complete guide for connecting to Supabase after updating your environment variables.

---

## Step 1: Update Your Environment Variables

### 1.1 Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Project Settings** > **API**
4. Copy the following values:
   - **Project URL** (e.g., `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (safe for client-side use)
   - **service_role key** (secret, only use server-side)

### 1.2 Update Your `.env` File

Copy `.env.example` to `.env` if you haven't already:

```bash
cp .env.example .env
```

Update the `.env` file with your actual credentials:

```env
# Your Supabase project URL
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Your Supabase anonymous key
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Your Supabase service role key (for edge functions)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important Notes:**
- This project uses **Vite**, so environment variables must be prefixed with `VITE_`
- Never commit your `.env` file to version control
- Only use `SUPABASE_SERVICE_ROLE_KEY` in secure server-side environments (edge functions)

---

## Step 2: Verify Your Connection Setup

### 2.1 Check the Supabase Client Configuration

The project already has a configured Supabase client at `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 2.2 How Environment Variables Are Loaded

**In Vite (Client-Side):**
- Variables prefixed with `VITE_` are automatically exposed to client code
- Access via `import.meta.env.VITE_VARIABLE_NAME`
- Hot-reloaded during development

**In Edge Functions (Server-Side):**
- Variables are automatically available in `Deno.env.get('VARIABLE_NAME')`
- No prefix required
- Managed by Supabase infrastructure

---

## Step 3: Verify Environment Variables

Before starting the dev server, verify your environment is configured correctly:

```bash
npm run verify-env
```

If you see all green checkmarks (✅), you're good to go!

---

## Step 4: Restart Your Development Server

After updating `.env`, **you MUST restart** the development server:

```bash
# Stop the current server (Ctrl+C or kill the process)
# Then restart
npm run dev
```

**CRITICAL:** Vite loads environment variables at startup only. If you change `.env`, you must:
1. Stop the dev server completely
2. Start it again
3. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)

---

## Step 5: Test Your Connection

### 5.1 Simple Connection Test

Create a test file `src/utils/testConnection.ts`:

```typescript
import { supabase } from '../lib/supabase';

export async function testSupabaseConnection() {
  try {
    // Test 1: Check if client is initialized
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    console.log('✓ Supabase client initialized');

    // Test 2: Verify connection with a simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      console.error('✗ Connection test failed:', error.message);
      return { success: false, error: error.message };
    }

    console.log('✓ Successfully connected to Supabase');
    return { success: true, data };

  } catch (error) {
    console.error('✗ Connection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### 5.2 Run the Test in Your Component

Add this to any component (e.g., `Dashboard.tsx`):

```typescript
import { useEffect } from 'react';
import { testSupabaseConnection } from '../utils/testConnection';

// Inside your component
useEffect(() => {
  testSupabaseConnection().then(result => {
    if (result.success) {
      console.log('Database connected successfully!');
    } else {
      console.error('Database connection failed:', result.error);
    }
  });
}, []);
```

### 5.3 Quick Console Test

Open your browser console and run:

```javascript
// Test environment variables are loaded
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);

// Test actual connection
import { supabase } from './lib/supabase';
supabase.from('profiles').select('count').then(console.log);
```

---

## Step 6: Troubleshooting Common Issues

### Issue 1: "Missing Supabase environment variables"

**Symptoms:** Error thrown immediately when app loads

**Solutions:**
1. Verify `.env` file exists in project root
2. Check variable names are prefixed with `VITE_`
3. Restart development server after updating `.env`
4. Clear browser cache and hard refresh (Ctrl+Shift+R)

```bash
# Verify file exists
ls -la .env

# Check contents (don't share output publicly!)
cat .env
```

### Issue 2: "Invalid API key" or Authentication Errors

**Symptoms:** 401 Unauthorized errors, "Invalid API key" messages

**Solutions:**
1. Verify you copied the correct key from Supabase dashboard
2. Ensure no extra spaces or line breaks in `.env` values
3. Check you're using the **anon key** (not service role) for client-side
4. Regenerate API keys in Supabase if they might be compromised

```typescript
// Debug: Check what values are loaded
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key length:', import.meta.env.VITE_SUPABASE_ANON_KEY?.length);
```

### Issue 3: "Failed to fetch" or Network Errors

**Symptoms:** Network timeout, CORS errors, connection refused

**Solutions:**
1. Check your internet connection
2. Verify Supabase URL is correct and accessible
3. Check Supabase project is not paused (free tier limitation)
4. Verify CORS settings in Supabase dashboard

```bash
# Test if Supabase URL is accessible
curl https://your-project-id.supabase.co/rest/v1/
```

### Issue 4: Environment Variables Not Loading

**Symptoms:** `undefined` when accessing `import.meta.env.VITE_*`

**Solutions:**
1. Ensure variables are prefixed with `VITE_`
2. Restart dev server (environment loaded at startup)
3. Check `.env` file is in project root (same level as `package.json`)
4. Verify no syntax errors in `.env` file

```env
# ✓ Correct
VITE_SUPABASE_URL=https://example.supabase.co

# ✗ Wrong (no VITE_ prefix)
SUPABASE_URL=https://example.supabase.co

# ✗ Wrong (quotes not needed)
VITE_SUPABASE_URL="https://example.supabase.co"
```

### Issue 5: Row Level Security (RLS) Blocks Access

**Symptoms:** Empty results or permission errors even with valid connection

**Solutions:**
1. Check RLS policies are configured for your tables
2. Ensure user is authenticated if policies require it
3. Verify policies allow the operation you're attempting

```sql
-- Check if RLS is enabled on a table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- View existing policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Issue 6: "Table does not exist" Errors

**Symptoms:** Error that table doesn't exist despite migrations

**Solutions:**
1. Verify migrations have been applied to your database
2. Check table name spelling and casing (PostgreSQL is case-sensitive)
3. Ensure you're connected to the correct Supabase project

```bash
# List all applied migrations
ls -la supabase/migrations/
```

---

## Step 6: Connection Patterns

### Client-Side Connection (Browser)

**Use Case:** User authentication, reading user-specific data

```typescript
import { supabase } from './lib/supabase';

// Example: Fetch user profile
async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

// Example: Insert data
async function createSession(userId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      tone: 'friendly',
      language_level: 'moderate',
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Server-Side Connection (Edge Functions)

**Use Case:** Secure operations, admin tasks, external API calls

```typescript
// supabase/functions/your-function/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create admin client (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req) => {
  try {
    // Admin operations that bypass RLS
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*');

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
```

### Real-time Subscriptions

**Use Case:** Live updates, chat, collaborative features

```typescript
import { supabase } from './lib/supabase';
import { useEffect, useState } from 'react';

function useRealtimeData(userId: string) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Subscribe to changes
    const subscription = supabase
      .channel('public:sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Change received!', payload);
          fetchData(); // Refresh data
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  async function fetchData() {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId);

    if (data) setData(data);
  }

  return data;
}
```

---

## Step 7: Error Handling Best Practices

### Always Handle Errors Gracefully

```typescript
async function fetchDataSafely() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    // Supabase returns errors in the response, not as thrown exceptions
    if (error) {
      console.error('Database error:', error.message);

      // Handle specific error codes
      if (error.code === 'PGRST116') {
        console.log('No data found - this is expected for new users');
        return [];
      }

      // Show user-friendly message
      throw new Error('Failed to load data. Please try again.');
    }

    return data;
  } catch (error) {
    // Log detailed error for debugging
    console.error('Unexpected error:', error);

    // Show generic message to user
    return null;
  }
}
```

### Use TypeScript for Type Safety

```typescript
import { supabase } from './lib/supabase';
import type { Profile } from './lib/supabase';

async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data; // TypeScript knows this is Profile | null
}
```

---

## Verification Checklist

✅ **Environment Setup**
- [ ] `.env` file exists in project root
- [ ] All required variables are set with `VITE_` prefix
- [ ] No syntax errors in `.env` file
- [ ] Development server restarted after changes

✅ **Credentials**
- [ ] Supabase URL is correct and accessible
- [ ] Using anon key for client-side code
- [ ] Service role key only used in edge functions
- [ ] No extra spaces or quotes in values

✅ **Connection Test**
- [ ] No error messages in browser console
- [ ] Can query database successfully
- [ ] Authentication works (if implemented)
- [ ] RLS policies allow expected operations

✅ **Security**
- [ ] `.env` is in `.gitignore`
- [ ] Not committing secrets to version control
- [ ] Service role key never exposed to client
- [ ] RLS enabled on all tables

---

## Quick Reference

### Get Credentials
```
Supabase Dashboard → Your Project → Settings → API
```

### Environment Variable Format
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Basic Query Pattern
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);

if (error) {
  console.error(error);
  return null;
}

return data;
```

### Restart Server
```bash
# Stop: Ctrl+C
npm run dev
```

---

## Need Help?

1. Check [Supabase Documentation](https://supabase.com/docs)
2. Review [Error Codes](https://supabase.com/docs/guides/api/rest/error-codes)
3. Check Supabase project logs in Dashboard
4. Verify [Database Health](https://app.supabase.com/project/_/settings/database) in dashboard

---

**Last Updated:** October 2025
