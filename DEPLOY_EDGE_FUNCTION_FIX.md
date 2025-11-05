# Deploy Edge Function Fix - Quick Guide

## What Needs to Be Deployed

The `generate-health-report` edge function has been updated to fix the "No health insights found" error when downloading reports.

## Deployment Command

```bash
supabase functions deploy generate-health-report
```

## Verification After Deployment

### 1. Check Function Deployment
```bash
# List deployed functions
supabase functions list

# Check logs
supabase functions logs generate-health-report
```

### 2. Test the Fix

**From the application:**
1. Generate health insights for a medical report
2. Wait for insights to display on screen
3. Click "Download Report" button
4. **Expected**: Report downloads successfully (no error)

**Check logs:**
```bash
# Watch logs in real-time
supabase functions logs generate-health-report --tail

# Look for these success messages:
# "Found existing insights with ID: ..."
# "Transforming existing insights to report format"
# "Transformation complete: X genetic, Y lifestyle, Z risk findings"
```

### 3. Verify Error Handling

**Test missing insights scenario:**
1. Try to download report for a session without insights
2. **Expected**: Clear error message
3. **Log should show**: "No health insights record found for session: ..."

## Alternative: Manual Deployment via Supabase Dashboard

If CLI is not available:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Edge Functions**
4. Find `generate-health-report` function
5. Click **Deploy** or **Update**
6. Copy contents of `supabase/functions/generate-health-report/index.ts`
7. Paste and save

## Rollback Plan

If issues occur after deployment:

```bash
# Option 1: Redeploy previous version
git checkout <previous-commit>
supabase functions deploy generate-health-report

# Option 2: Check function versions in dashboard
# Supabase Dashboard > Edge Functions > generate-health-report > Versions
# Select previous working version and redeploy
```

## Environment Variables Check

The function uses these environment variables (should already be configured):

```
OPENAI_API_KEY          ← Required for insights generation
SUPABASE_URL            ← Auto-configured
SUPABASE_SERVICE_ROLE_KEY ← Auto-configured
```

No new environment variables needed for this fix.

## Expected Improvements

After deployment:

✅ Download Report button works immediately after insights generated
✅ Clear error messages if something is wrong
✅ Better logging for troubleshooting
✅ More robust handling of different data formats
✅ Graceful handling of missing optional fields

## Success Criteria

Deployment is successful if:

- [ ] Edge function deploys without errors
- [ ] Download Report button works in application
- [ ] Reports download within 2-3 seconds
- [ ] Downloaded report content matches on-screen insights
- [ ] No "No health insights found" error for valid sessions
- [ ] Console logs show detailed processing steps

## Troubleshooting

### Deployment Fails

**Error: "Function already exists"**
```bash
# Force redeploy
supabase functions deploy generate-health-report --force
```

**Error: "Authentication failed"**
```bash
# Login again
supabase login

# Link project
supabase link --project-ref your-project-ref
```

### Function Deployed but Still Errors

**Check:**
1. Is the correct project selected?
2. Are environment variables set?
3. Is the database connection working?

**Debug:**
```bash
# Check function status
supabase functions list

# View recent logs
supabase functions logs generate-health-report --limit 50

# Test function directly
curl -X POST \
  https://your-project-ref.supabase.co/functions/v1/generate-health-report \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session-id"}'
```

## Post-Deployment Monitoring

### First Hour After Deployment

Monitor for:
- Successful report downloads
- No increase in error rates
- Edge function response times (should be < 3 seconds)
- Console log messages showing proper flow

### Check These Metrics:

```bash
# Error rate (should be low)
supabase functions logs generate-health-report | grep "error"

# Success messages
supabase functions logs generate-health-report | grep "Found existing insights"

# Performance
supabase functions logs generate-health-report | grep "Transformation complete"
```

## Contact for Issues

If deployment issues occur:
1. Check `DOWNLOAD_REPORT_ERROR_FIX.md` for technical details
2. Review edge function logs for specific errors
3. Verify database has health_insights records with insights_data populated

---

**Version:** 1.0
**Date:** November 5, 2025
**Critical:** Yes - blocks user workflow
**Downtime:** None expected
