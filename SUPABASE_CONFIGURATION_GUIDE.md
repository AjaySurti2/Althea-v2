# SUPABASE PROJECT CONFIGURATION GUIDE
**Project ID:** biysfixhrmwhwhktuppr
**Project URL:** https://biysfixhrmwhwhktuppr.supabase.co
**Dashboard:** https://supabase.com/dashboard/project/biysfixhrmwhwhktuppr
**GitHub Repository:** https://github.com/AjaySurti2/Althea-v2.git

---

## OVERVIEW

This guide provides step-by-step instructions to configure your existing Supabase project with all backend modules including GitHub integration, authentication, database schema, Edge Functions, storage, secrets management, and analytics.

---

## 1. GITHUB INTEGRATION

### Prerequisites
- GitHub account with admin access to `AjaySurti2/Althea-v2` repository
- Supabase account with project ownership

### Step 1.1: Connect GitHub Repository

1. **Access Supabase Integrations:**
   - Navigate to: https://supabase.com/dashboard/project/biysfixhrmwhwhktuppr/settings/integrations
   - Click on **"Integrations"** in the left sidebar

2. **Connect GitHub:**
   - Find the **"GitHub"** integration card
   - Click **"Connect to GitHub"**
   - Authorize Supabase access to your GitHub account
   - Select repository: `AjaySurti2/Althea-v2`
   - Choose branch: `main`

3. **Configure Auto-Deployment:**
   - Enable **"Deploy on push"** for automatic deployments
   - Select deployment types:
     - [x] Database Migrations
     - [x] Edge Functions
     - [x] Configuration changes

### Step 1.2: Set Up GitHub Secrets

1. **Get Supabase Access Token:**
   - Go to: https://supabase.com/dashboard/account/tokens
   - Click **"Generate new token"**
   - Name: `Althea GitHub Actions`
   - Copy the token (you won't see it again!)

2. **Add GitHub Secrets:**
   - Navigate to: https://github.com/AjaySurti2/Althea-v2/settings/secrets/actions
   - Click **"New repository secret"**
   - Add the following secrets:

   **Secret 1: SUPABASE_ACCESS_TOKEN**
   ```
   Name: SUPABASE_ACCESS_TOKEN
   Value: [Your access token from step 1]
   ```

   **Secret 2: SUPABASE_DB_PASSWORD**
   ```
   Name: SUPABASE_DB_PASSWORD
   Value: [Your database password from project settings]
   ```

   To get your database password:
   - Go to: https://supabase.com/dashboard/project/biysfixhrmwhwhktuppr/settings/database
   - Find **"Database password"** section
   - Use the password you set during project creation
   - If forgotten, you can reset it (WARNING: This will break existing connections)

3. **Verify GitHub Actions Workflow:**
   - Your project already has `.github/workflows/supabase-sync.yml`
   - The workflow will trigger on push to `main` branch
   - Check workflow status: https://github.com/AjaySurti2/Althea-v2/actions

### Step 1.3: Test GitHub Integration

```bash
# Make a test commit to trigger workflow
git add .
git commit -m "test: verify GitHub Actions integration"
git push origin main

# Check the Actions tab on GitHub to see if workflow runs successfully
```

---

## 2. AUTHENTICATION MODULE

### Step 2.1: Configure Email Authentication

1. **Access Auth Settings:**
   - Navigate to: https://supabase.com/dashboard/project/biysfixhrmwhwhktuppr/auth/providers

2. **Email Provider Configuration:**
   - **Email Auth:** Enabled (default)
   - **Confirm email:** DISABLED (as per project requirements)
   - **Secure email change:** Enabled
   - **Secure password change:** Enabled

3. **Password Requirements:**
   - Go to: Auth > Policies
   - Set minimum password length: 8 characters
   - Require special characters: Optional (your choice)

4. **JWT Settings:**
   - JWT expiry: 3600 seconds (1 hour) - default is good
   - Refresh token expiry: 2592000 seconds (30 days)

### Step 2.2: Configure Email Templates (Optional)

1. **Navigate to Email Templates:**
   - https://supabase.com/dashboard/project/biysfixhrmwhwhktuppr/auth/templates

2. **Customize Templates:**
   - **Password Reset:** Customize with Althea branding
   - **Magic Link:** (if you enable it in future)
   - **Email Change Confirmation**

### Step 2.3: Set Up Auth Redirects

In your Auth URL configuration:
```
Site URL: https://althea.health (or your production domain)
Additional redirect URLs:
- http://localhost:5173 (development)
- https://your-staging-url.netlify.app (if using Netlify)
```

### Step 2.4: Verify Authentication

Test authentication is working:

```bash
# Run your development server
npm run dev

# Test the following:
# 1. Sign up with a new email
# 2. Log in with existing credentials
# 3. Test password reset flow
# 4. Verify profile is created automatically
```

---

## 3. DATABASE SCHEMA CONFIGURATION

### Step 3.1: Install Supabase CLI

```bash
# Install globally using npm
npm install -g supabase

# Verify installation
supabase --version
```

### Step 3.2: Link to Your Project

```bash
# Navigate to your project directory
cd /path/to/Althea-v2

# Link to your Supabase project
supabase link --project-ref biysfixhrmwhwhktuppr

# You'll be prompted for your database password
# Enter the password you use to connect to the database
```

### Step 3.3: Push Migrations to Remote Database

```bash
# Push all migrations to your Supabase project
supabase db push

# This will apply all migrations in order from the supabase/migrations/ folder
```

Expected output:
```
Applying migration 20251101092253_fix_missing_schema_apply_base.sql...
Applying migration 20251101092321_add_profile_creation_trigger.sql...
Applying migration 20251101092345_create_storage_buckets_for_files.sql...
... (and so on)

Finished supabase db push.
```

### Step 3.4: Verify Database Schema

**Option A: Using Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/biysfixhrmwhwhktuppr/editor
2. Check that these tables exist:
   - profiles
   - leads
   - family_members
   - sessions
   - files
   - parsed_documents
   - health_insights
   - health_metrics
   - family_patterns
   - ai_summaries
   - report_pdfs
   - reminders
   - patients (for medical data)
   - lab_reports
   - test_results

**Option B: Using SQL Editor**
```sql
-- Run this query in the SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Step 3.5: Verify Row Level Security (RLS)

```sql
-- Check RLS is enabled on all tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- All tables should have rowsecurity = TRUE
```

### Step 3.6: Database Connection Information

**For external tools (DBeaver, pgAdmin, etc.):**

```
Host: db.biysfixhrmwhwhktuppr.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [Your database password]
SSL Mode: require
```

**Connection Pooler (for serverless functions):**
```
Host: db.biysfixhrmwhwhktuppr.pooler.supabase.com
Port: 6543
Mode: Transaction
```

---

## 4. EDGE FUNCTIONS (SERVER FUNCTIONS)

### Step 4.1: Required Environment Variables

Before deploying Edge Functions, set up secrets in Supabase:

1. **Navigate to Edge Functions Settings:**
   - https://supabase.com/dashboard/project/biysfixhrmwhwhktuppr/settings/functions

2. **Add Secret: ANTHROPIC_API_KEY**
   - Click **"Add secret"**
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key from https://console.anthropic.com/
   - Click **"Save"**

3. **Verify Built-in Environment Variables:**
   These are automatically available in all Edge Functions:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_DB_URL`

### Step 4.2: Deploy Edge Functions Using CLI

```bash
# Deploy all functions at once
supabase functions deploy parse-documents
supabase functions deploy generate-health-insights
supabase functions deploy generate-health-report
supabase functions deploy parse-medical-report
supabase functions deploy test-api-key

# Or deploy individually
supabase functions deploy parse-documents --project-ref biysfixhrmwhwhktuppr
```

### Step 4.3: Verify Edge Function Deployment

1. **Check Dashboard:**
   - Go to: https://supabase.com/dashboard/project/biysfixhrmwhwhktuppr/functions
   - You should see all 5 functions listed

2. **Test a Function:**

```bash
# Test the test-api-key function
curl -X POST \
  https://biysfixhrmwhwhkhktuppr.supabase.co/functions/v1/test-api-key \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Step 4.4: Edge Function URLs

Your functions are available at:
```
https://biysfixhrmwhwhktuppr.supabase.co/functions/v1/parse-documents
https://biysfixhrmwhwhktuppr.supabase.co/functions/v1/generate-health-insights
https://biysfixhrmwhwhktuppr.supabase.co/functions/v1/generate-health-report
https://biysfixhrmwhwhktuppr.supabase.co/functions/v1/parse-medical-report
https://biysfixhrmwhwhktuppr.supabase.co/functions/v1/test-api-key
```

### Step 4.5: Function Invocation from Frontend

Update your frontend code to call Edge Functions:

```typescript
// Example: Calling parse-documents function
const { data, error } = await supabase.functions.invoke('parse-documents', {
  body: {
    sessionId: 'session-uuid',
    fileIds: ['file-uuid-1', 'file-uuid-2'],
    customization: {
      tone: 'friendly',
      language: 'simple',
      focusAreas: ['blood work', 'cholesterol']
    }
  }
});
```

---

## 5. FILE STORAGE CONFIGURATION

### Step 5.1: Verify Storage Buckets

1. **Navigate to Storage:**
   - https://supabase.com/dashboard/project/biysfixhrmwhwhktuppr/storage/buckets

2. **Expected Buckets:**
   - `medical-files` (for uploaded medical documents)
   - `health-reports` (for generated PDF reports)

If buckets don't exist, they should be created by your migrations. If not, create them manually:

### Step 5.2: Create Storage Buckets (If Needed)

**Via SQL Editor:**

```sql
-- Create medical-files bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-files',
  'medical-files',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
);

-- Create health-reports bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'health-reports',
  'health-reports',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
);
```

### Step 5.3: Configure Storage Policies

Your migrations already include RLS policies for storage. Verify them:

```sql
-- Check storage policies
SELECT * FROM storage.policies;
```

Expected policies:
- Users can upload to their own folders in `medical-files`
- Users can read their own files in `medical-files`
- Users can read their own reports in `health-reports`
- Service role can manage all files

### Step 5.4: Test File Upload

```typescript
// Test file upload
const file = document.querySelector('input[type="file"]').files[0];
const { data, error } = await supabase.storage
  .from('medical-files')
  .upload(`${userId}/${file.name}`, file);

if (error) console.error('Upload failed:', error);
else console.log('Upload successful:', data);
```

### Step 5.5: Storage Quota

Check your storage quota:
- Free tier: 1GB storage
- Pro tier: 100GB storage
- Each additional GB: $0.021/month

Monitor usage: https://supabase.com/dashboard/project/biysfixhrmwhwhktuppr/settings/billing

---

## 6. SECRETS MANAGEMENT

### Step 6.1: Manage Edge Function Secrets

1. **Access Secrets Dashboard:**
   - https://supabase.com/dashboard/project/biysfixhrmwhwhktuppr/settings/functions

2. **Required Secrets:**

   **ANTHROPIC_API_KEY**
   ```
   Name: ANTHROPIC_API_KEY
   Value: sk-ant-api03-... (from https://console.anthropic.com/)
   Description: API key for Claude AI (medical document parsing and insights)
   ```

3. **Update Secrets via CLI:**

```bash
# Set a secret
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...

# List all secrets
supabase secrets list

# Unset a secret
supabase secrets unset ANTHROPIC_API_KEY
```

### Step 6.2: Frontend Environment Variables

Your `.env` file should contain:

```env
# Public variables (safe for client-side)
VITE_SUPABASE_URL=https://biysfixhrmwhwhktuppr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Private variables (server-side only - DO NOT expose to client)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**IMPORTANT:** Never commit `.env` to GitHub. Your `.gitignore` should include:
```
.env
.env.local
.env*.local
```

### Step 6.3: Managing API Keys Securely

**Best Practices:**
1. Never hardcode API keys in source code
2. Use environment variables for all secrets
3. Rotate API keys regularly (every 90 days)
4. Use separate keys for development, staging, and production
5. Monitor API key usage for suspicious activity

**For Production:**
- Set environment variables in your hosting platform:
  - Netlify: Site settings > Environment variables
  - Vercel: Project settings > Environment variables
  - Custom server: Use process environment variables

---

## 7. ANALYTICS & MONITORING

### Step 7.1: Enable Project Analytics

1. **Access Analytics Dashboard:**
   - https://supabase.com/dashboard/project/biysfixhrmwhwhktuppr/reports

2. **Available Metrics:**
   - **API:** Request count, response times, error rates
   - **Auth:** Sign-ups, logins, active users
   - **Database:** Query performance, connection pool usage
   - **Storage:** Upload/download volume, bandwidth usage
   - **Functions:** Invocation count, execution time, errors

### Step 7.2: Set Up Custom Monitoring

**Create a monitoring table:**

```sql
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  event_data jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert analytics
CREATE POLICY "Service role can insert analytics"
  ON analytics_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);
```

**Track custom events in your app:**

```typescript
// Track user actions
async function trackEvent(eventType: string, eventData: any) {
  await supabase.from('analytics_events').insert({
    event_type: eventType,
    event_data: eventData
  });
}

// Example usage
trackEvent('document_uploaded', { fileType: 'pdf', fileSize: 1024000 });
trackEvent('report_generated', { reportType: 'health_insights' });
```

### Step 7.3: Enable Real-time Monitoring

**Set up log streams:**

1. Go to: https://supabase.com/dashboard/project/biysfixhrmwhwhktuppr/logs
2. Available log types:
   - Database logs (queries, errors)
   - Edge Function logs (invocations, console output)
   - API logs (REST and GraphQL requests)
   - Auth logs (authentication attempts)

**Filter and search logs:**
- Filter by severity: Error, Warning, Info, Debug
- Search by keywords
- Export logs for external analysis

### Step 7.4: Set Up Alerts

Configure alerts for critical events:

1. **Database Alerts:**
   - High query latency (> 1000ms)
   - Connection pool exhaustion
   - Disk space > 80% used

2. **Function Alerts:**
   - Error rate > 5%
   - Cold start time > 2s
   - Timeout rate > 1%

3. **Storage Alerts:**
   - Bandwidth usage approaching limit
   - Storage quota > 90% used

**Alert Channels:**
- Email notifications
- Slack integration
- Webhook to your monitoring system

### Step 7.5: Performance Monitoring

**Key Metrics to Track:**

```sql
-- Query performance over time
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as request_count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time
FROM sessions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour DESC;

-- User growth
SELECT
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as new_users
FROM auth.users
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day DESC;

-- Function usage
SELECT
  event_type,
  COUNT(*) as count,
  DATE_TRUNC('day', created_at) as day
FROM analytics_events
WHERE event_type LIKE 'function_%'
GROUP BY event_type, day
ORDER BY day DESC, count DESC;
```

### Step 7.6: Third-Party Analytics Integration

**Integrate with external analytics platforms:**

1. **PostHog (Product Analytics):**
```typescript
import posthog from 'posthog-js';
posthog.init('YOUR_POSTHOG_KEY', { api_host: 'https://app.posthog.com' });

// Track events
posthog.capture('document_uploaded', { fileType: 'pdf' });
```

2. **Sentry (Error Tracking):**
```typescript
import * as Sentry from "@sentry/react";
Sentry.init({ dsn: "YOUR_SENTRY_DSN" });

// Errors are automatically captured
```

3. **Google Analytics 4:**
```typescript
gtag('event', 'document_upload', {
  file_type: 'pdf',
  file_size: 1024000
});
```

---

## 8. TESTING & VERIFICATION

### Step 8.1: Verify Complete Setup

Run this comprehensive test checklist:

**1. Authentication:**
- [ ] Sign up with new email
- [ ] Log in with existing credentials
- [ ] Password reset flow works
- [ ] Profile is created automatically

**2. Database:**
- [ ] All tables visible in dashboard
- [ ] RLS policies prevent unauthorized access
- [ ] Can insert/update/delete own data
- [ ] Cannot access other users' data

**3. Storage:**
- [ ] Can upload files to medical-files bucket
- [ ] Can download own files
- [ ] Cannot access other users' files
- [ ] File size limits enforced

**4. Edge Functions:**
- [ ] All 5 functions deployed
- [ ] Functions respond to requests
- [ ] Authentication required
- [ ] Error handling works

**5. GitHub Integration:**
- [ ] Push to main triggers workflow
- [ ] Migrations auto-deploy
- [ ] Functions auto-deploy
- [ ] No workflow errors

### Step 8.2: Run Automated Tests

```bash
# Install dependencies
npm install

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Build production bundle
npm run build

# Test environment variables
npm run verify-env
```

### Step 8.3: Manual Testing Workflow

1. **Upload Medical Document:**
   - Sign up/login
   - Navigate to Upload tab
   - Select medical report file
   - Set preferences (tone, language)
   - Submit and verify processing

2. **Check Processing:**
   - Verify file appears in Storage
   - Check Edge Function logs
   - Confirm parsed data in database
   - View generated insights

3. **Download Report:**
   - Generate health insights
   - Download PDF report
   - Verify report contains correct data

4. **Family Members:**
   - Add family member profile
   - Upload document for family member
   - Check family patterns detection

---

## 9. DEPLOYMENT TO PRODUCTION

### Step 9.1: Pre-Deployment Checklist

- [ ] All migrations tested locally
- [ ] Edge Functions working on staging
- [ ] Storage policies configured correctly
- [ ] Environment variables set in production
- [ ] API keys rotated and secured
- [ ] Analytics and monitoring enabled
- [ ] Error tracking configured
- [ ] Backup strategy in place

### Step 9.2: Production Environment Setup

**Option A: Netlify**

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables:
```
VITE_SUPABASE_URL=https://biysfixhrmwhwhktuppr.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Option B: Vercel**

1. Import GitHub repository
2. Framework preset: Vite
3. Add environment variables (same as above)
4. Deploy

**Option C: Custom Server**

```bash
# Build for production
npm run build

# Serve with any static server
# Example with serve:
npm install -g serve
serve -s dist -l 3000
```

### Step 9.3: Custom Domain Setup

1. **In Supabase:**
   - Go to: Settings > API
   - Add your custom domain to Auth > URL Configuration

2. **In Your DNS Provider:**
```
Type: CNAME
Name: app (or subdomain)
Value: your-netlify-url.netlify.app
```

3. **Update Environment Variables:**
```env
VITE_SUPABASE_URL=https://biysfixhrmwhwhktuppr.supabase.co
# Site URL in Supabase Auth settings:
# https://app.althea.health
```

### Step 9.4: SSL Certificate

- Netlify/Vercel: Automatic SSL with Let's Encrypt
- Custom server: Use Certbot or Cloudflare

### Step 9.5: Post-Deployment Verification

```bash
# Test production endpoints
curl https://app.althea.health
curl https://biysfixhrmwhwhktuppr.supabase.co/functions/v1/test-api-key \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Check all assets load correctly
# Verify authentication flow
# Test file upload/download
# Confirm Edge Functions work
```

---

## 10. ONGOING MAINTENANCE

### Step 10.1: Regular Tasks

**Daily:**
- Monitor error rates in dashboard
- Check Edge Function logs for issues
- Review user sign-ups and activity

**Weekly:**
- Review database performance
- Check storage usage
- Analyze user behavior patterns

**Monthly:**
- Review and optimize slow queries
- Update dependencies
- Rotate API keys if needed
- Backup database manually

### Step 10.2: Database Backups

**Automated Backups:**
- Supabase Pro: Daily automatic backups
- Retention: 7 days (Pro), 30 days (Enterprise)

**Manual Backup:**
```bash
# Backup using pg_dump
pg_dump "postgresql://postgres:[PASSWORD]@db.biysfixhrmwhwhktuppr.supabase.co:5432/postgres" \
  > backup_$(date +%Y%m%d).sql

# Restore from backup
psql "postgresql://postgres:[PASSWORD]@db.biysfixhrmwhwhktuppr.supabase.co:5432/postgres" \
  < backup_20241107.sql
```

### Step 10.3: Scaling Considerations

**Database:**
- Monitor connection pool usage
- Add indexes for frequently queried columns
- Consider read replicas for heavy read workloads

**Storage:**
- Implement CDN for frequently accessed files
- Set up lifecycle policies for old files
- Consider moving large files to S3/R2

**Edge Functions:**
- Monitor cold start times
- Optimize function size and dependencies
- Consider caching for frequently requested data

### Step 10.4: Security Audits

**Quarterly Review:**
- Review RLS policies for gaps
- Check for unused database permissions
- Audit API key usage
- Review storage bucket policies
- Update dependencies for security patches

**Run Security Scans:**
```bash
# Check for vulnerable dependencies
npm audit

# Fix automatically if possible
npm audit fix

# Check TypeScript types
npm run typecheck
```

---

## 11. TROUBLESHOOTING

### Common Issues and Solutions

**Issue: Migrations fail to apply**
```bash
# Check migration status
supabase db diff

# Reset local database (CAUTION: Destroys local data)
supabase db reset

# Re-push migrations
supabase db push
```

**Issue: Edge Function deployment fails**
```bash
# Check function logs
supabase functions logs parse-documents

# Verify secrets are set
supabase secrets list

# Test function locally
supabase functions serve parse-documents
```

**Issue: Authentication not working**
- Verify Site URL in Auth settings matches your domain
- Check that email confirmation is disabled
- Ensure CORS is configured correctly
- Check browser console for errors

**Issue: File upload fails**
- Verify storage bucket exists
- Check RLS policies on storage.objects
- Ensure file size within limits
- Check MIME type is allowed

**Issue: Cannot connect to database**
- Verify database password is correct
- Check IP allowlist if configured
- Ensure SSL mode is enabled
- Try connection pooler URL for serverless

---

## 12. SUPPORT RESOURCES

### Documentation
- Supabase Docs: https://supabase.com/docs
- Supabase CLI: https://supabase.com/docs/guides/cli
- Edge Functions: https://supabase.com/docs/guides/functions
- Anthropic API: https://docs.anthropic.com/

### Community Support
- Supabase Discord: https://discord.supabase.com
- GitHub Discussions: https://github.com/supabase/supabase/discussions
- Stack Overflow: Tag `supabase`

### Project-Specific Help
- Email: hello@althea.health
- GitHub Issues: https://github.com/AjaySurti2/Althea-v2/issues

---

## QUICK REFERENCE

### Essential URLs
```
Dashboard:     https://supabase.com/dashboard/project/biysfixhrmwhwhktuppr
API URL:       https://biysfixhrmwhwhktuppr.supabase.co
Functions:     https://biysfixhrmwhwhktuppr.supabase.co/functions/v1/
Database:      db.biysfixhrmwhwhktuppr.supabase.co:5432
```

### Essential Commands
```bash
# Link project
supabase link --project-ref biysfixhrmwhwhktuppr

# Push migrations
supabase db push

# Deploy function
supabase functions deploy parse-documents

# Set secret
supabase secrets set ANTHROPIC_API_KEY=value

# View logs
supabase functions logs parse-documents --tail
```

### Essential Environment Variables
```env
VITE_SUPABASE_URL=https://biysfixhrmwhwhktuppr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

**Configuration Complete!**

Your Supabase project is now fully configured with GitHub integration, authentication, database schema, Edge Functions, storage, secrets management, and analytics. Follow the testing checklist to verify everything works correctly before deploying to production.
