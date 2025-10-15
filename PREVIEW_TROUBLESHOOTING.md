# Preview Not Working? Quick Fix Guide

If you're experiencing issues with the preview not loading or showing errors, follow these steps:

## Quick Checklist

1. **Verify Environment Variables**
   ```bash
   npm run verify-env
   ```
   You should see:
   ```
   ✅ VITE_SUPABASE_URL: SET
   ✅ VITE_SUPABASE_ANON_KEY: SET
   ```

2. **Restart Dev Server Completely**
   - Stop the dev server (Ctrl+C)
   - Start it again: `npm run dev`
   - **Hard refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R)

3. **Check Browser Console**
   - Open browser DevTools (F12)
   - Look for any red errors
   - If you see "Missing Supabase environment variables", go to step 4

4. **Fix Environment Variables**

   Your `.env` file must use `VITE_` prefix:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   **Common Mistakes:**
   - ❌ `NEXT_PUBLIC_SUPABASE_URL` (wrong prefix for Vite)
   - ❌ `SUPABASE_URL` (missing VITE_ prefix)
   - ✅ `VITE_SUPABASE_URL` (correct!)

## Still Not Working?

### Step-by-Step Resolution

1. **Verify .env file exists and has correct content:**
   ```bash
   cat .env
   ```

   Should show:
   ```
   VITE_SUPABASE_URL=https://...
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

2. **Test Supabase connection directly:**
   ```bash
   curl -I https://your-project.supabase.co/rest/v1/
   ```

   Should return `HTTP/2 200`

3. **Clear Vite cache and rebuild:**
   ```bash
   rm -rf node_modules/.vite
   rm -rf dist
   npm run build
   ```

4. **Kill any lingering processes:**
   ```bash
   # On Mac/Linux
   pkill -f vite

   # Then restart
   npm run dev
   ```

5. **Clear browser cache:**
   - Open DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

## Common Error Messages

### "Missing Supabase environment variables"

**Cause:** Environment variables not loaded

**Fix:**
1. Check `.env` file uses `VITE_` prefix
2. Restart dev server
3. Hard refresh browser

### "Failed to fetch" or Network Errors

**Cause:** Supabase connection issue

**Fix:**
1. Verify Supabase URL is correct
2. Check internet connection
3. Confirm Supabase project is active (not paused)

### Blank white screen, no errors

**Cause:** Build cache issue

**Fix:**
```bash
rm -rf node_modules/.vite dist
npm run dev
```

## Environment Variable Loading Rules

**CRITICAL:** Vite loads environment variables ONLY at startup!

This means:
1. `.env` changes require **full dev server restart**
2. Adding new `VITE_` variables requires **restart**
3. Browser refresh alone is **NOT enough**
4. Must use **hard refresh** after restart (Ctrl+Shift+R)

## Testing Your Setup

Run this command to test everything at once:

```bash
npm run verify-env && npm run typecheck && npm run build
```

All three should succeed:
- ✅ Environment variables verified
- ✅ TypeScript checks passed
- ✅ Build completed successfully

## Getting Your Supabase Credentials

If you need to set up or update your Supabase credentials:

1. Go to https://app.supabase.com
2. Select your project
3. Click **Settings** (gear icon)
4. Click **API** in the left sidebar
5. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

## Still Having Issues?

Check these files for detailed troubleshooting:
- `SUPABASE_CONNECTION_GUIDE.md` - Complete connection guide
- Browser DevTools Console - Look for specific error messages
- Terminal where dev server is running - Check for startup errors

## Dev Server Must Be Restarted After

- Changing `.env` file
- Adding new environment variables
- Updating Supabase credentials
- Installing new packages that use environment variables
- Switching between projects

**Remember: Hard refresh your browser after restarting the dev server!**
