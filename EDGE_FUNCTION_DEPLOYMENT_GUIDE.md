# Edge Function Deployment Guide

## Current Issue
The "Download Report" functionality is failing with a CORS error because the updated Edge Function needs to be deployed to Supabase.

## What Was Fixed
The Edge Function `/supabase/functions/generate-health-report/index.ts` has been updated locally to include the required `title` field when creating health reports.

## Deployment Options

### Option 1: Manual Deployment via Supabase CLI (Recommended)

If you have the Supabase CLI installed and authenticated:

```bash
# From the project root directory
npx supabase functions deploy generate-health-report
```

### Option 2: Deploy via Supabase Dashboard

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Navigate to your project: `idyhyrpsltbpdhnmbnje`
3. Go to **Edge Functions** section
4. Find the `generate-health-report` function
5. Click **Deploy new version**
6. Upload the updated file from: `/supabase/functions/generate-health-report/index.ts`

### Option 3: Automated Deployment via GitHub Actions

Update your GitHub workflow to include Edge Function deployment:

**File:** `.github/workflows/supabase-sync.yml`

Add this step after the database push:

```yaml
      - name: Deploy Edge Functions
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
        run: npx supabase functions deploy generate-health-report --project-ref biysfixhrmwhwhktuppr
```

Then:
1. Add `SUPABASE_ACCESS_TOKEN` to your GitHub repository secrets
2. Push your changes to the `main` branch
3. The workflow will automatically deploy the Edge Function

## Verification Steps

After deployment:

1. Open your application
2. Navigate to the Health Insights section
3. Click "Download Report"
4. Verify that:
   - No CORS error occurs
   - No "title" constraint error occurs
   - The report downloads successfully
   - The report has a proper title

## Project Details

- **Supabase URL:** https://idyhyrpsltbpdhnmbnje.supabase.co
- **Project Ref:** biysfixhrmwhwhktuppr
- **Edge Function:** generate-health-report
- **File:** /supabase/functions/generate-health-report/index.ts

## Troubleshooting

### CORS Error Persists
- Ensure the Edge Function was deployed successfully
- Check the Supabase Dashboard logs for deployment errors
- Verify the function is active in the Edge Functions section

### Title Constraint Error Returns
- The Edge Function deployment may have failed
- Check the deployed version matches the local updated version
- Review Supabase logs for detailed error messages

### "Failed to fetch" Error
- This typically indicates the Edge Function isn't deployed or isn't responding
- Check Supabase Dashboard > Edge Functions > generate-health-report > Logs
- Ensure the function is not paused or disabled

## Alternative: Quick Fix via Dashboard

If you need immediate access and can't deploy:

1. In Supabase Dashboard, go to **Table Editor**
2. Find the `health_reports` table
3. Modify the `title` column to allow NULL values temporarily:
   ```sql
   ALTER TABLE health_reports ALTER COLUMN title DROP NOT NULL;
   ```
4. This will allow reports to be created without titles
5. Later, you can deploy the proper fix and make the column required again

## Summary

The code fix is complete and working locally. The Edge Function just needs to be deployed to your Supabase project using one of the methods above. Once deployed, the "Download Report" functionality will work correctly.
