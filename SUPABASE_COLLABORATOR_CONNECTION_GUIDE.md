# Supabase Collaborator Connection Guide

**Althea Health - Database Connection Documentation**

This guide helps collaborators connect to the shared Supabase project without duplicating schema or restoring databases.

---

## Current Database Status

**Supabase Project Details:**
- **Project URL**: `https://idyhyrpsltbpdhnmbnje.supabase.co`
- **Project Ref**: `idyhyrpsltbpdhnmbnje`
- **Status**: Fresh database, no migrations applied yet
- **Migration Files Available**: 80 migration files ready to apply

---

## Quick Start for Collaborators

### Option 1: Direct Connection (Recommended for Team Development)

**Step 1: Clone the Repository**
```bash
git clone <your-repo-url>
cd project
```

**Step 2: Install Dependencies**
```bash
npm install
```

**Step 3: Environment Variables Are Already Set**

The `.env` file is already configured with the shared Supabase project credentials:

```env
VITE_SUPABASE_URL=https://idyhyrpsltbpdhnmbnje.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

**Important Notes:**
- All collaborators use the SAME Supabase project
- No need to create individual Supabase projects
- Schema changes are shared across the entire team
- Data is shared (use different user accounts for testing)

**Step 4: Apply Migrations (First Time Only)**

The database migrations need to be applied once to set up the complete schema:

```bash
# Using Supabase CLI (recommended)
npx supabase db push

# Or apply migrations manually through Supabase Dashboard
# Go to: https://supabase.com/dashboard/project/idyhyrpsltbpdhnmbnje/sql/new
# Copy and paste migration files one by one in chronological order
```

**Step 5: Verify Connection**
```bash
npm run verify-env
npm run dev
```

---

## Option 2: Supabase CLI Linking (For Schema Management)

This method is best if you need to manage migrations or pull schema changes.

**Step 1: Install Supabase CLI**
```bash
npm install -g supabase
```

**Step 2: Link to Remote Project**
```bash
# Login to Supabase
supabase login

# Link to the shared project
supabase link --project-ref idyhyrpsltbpdhnmbnje
```

**Step 3: Pull Remote Schema (Optional)**
```bash
# Pull current schema from remote database
supabase db pull

# This generates types and shows current schema state
```

**Step 4: Push Local Migrations**
```bash
# Apply all pending migrations to remote database
supabase db push
```

---

## Option 3: Database Branching (For Isolated Development)

Use Supabase branching to create isolated development environments.

**Step 1: Create a Branch**
```bash
# Create a new branch for your feature
supabase branches create feature-name
```

**Step 2: Connect to Branch**
```bash
# Get branch connection details
supabase branches list

# Update your .env.local with branch credentials
VITE_SUPABASE_URL=<branch_url>
VITE_SUPABASE_ANON_KEY=<branch_anon_key>
```

**Step 3: Merge Changes**
```bash
# When ready, merge branch back to main
supabase branches merge feature-name
```

---

## Database Schema Overview

### Core Tables (80 Migration Files)

#### 1. Authentication & User Management
- **profiles** - Extended user profiles with health information
- **leads** - Lead capture and conversion tracking

#### 2. Family & Patient Management
- **family_members** - Family member profiles with health history
- **patients** - Detailed patient information linked to family members

#### 3. Document Processing Pipeline
- **sessions** - Upload sessions with user preferences (tone, language_level)
- **files** - Uploaded medical documents metadata
- **parsed_documents** - Extracted and structured document data

#### 4. Medical Data Storage
- **lab_reports** - Lab report metadata (lab name, dates, doctor)
- **test_results** - Individual test metrics with reference ranges
- **health_metrics** - Historical health metrics tracking

#### 5. AI & Insights System
- **health_insights** - AI-generated health insights and interpretations
- **user_insight_preferences** - User preferences for insight tone/language
- **report_generation_history** - Tracks all report generations

#### 6. Health Reports
- **health_reports** - Generated health report metadata
- **report_pdfs** - PDF storage paths and metadata

#### 7. Family Health Analytics
- **family_patterns** - Detected hereditary health patterns
- **family_health_analytics** - Aggregated family health trends

#### 8. System Support
- **ai_summaries** - AI-generated summary texts
- **reminders** - Health checkup and medication reminders

### Storage Buckets

#### 1. medical-files
- **Purpose**: Store user-uploaded medical documents
- **Access**: Private (RLS-protected)
- **File Size Limit**: 50MB per file
- **Allowed Types**: PDF, JPG, PNG, DOCX, TXT, WEBP
- **Path Structure**: `{user_id}/{session_id}/{filename}`

#### 2. report-pdfs
- **Purpose**: Store generated health report PDFs
- **Access**: Private (RLS-protected)
- **File Size Limit**: 10MB per file
- **Allowed Types**: PDF, HTML
- **Path Structure**: `{user_id}/{report_id}/{filename}`

#### 3. health-reports
- **Purpose**: Alternative storage for health reports
- **Access**: Private (RLS-protected)
- **File Size Limit**: 10MB per file
- **Allowed Types**: PDF
- **Path Structure**: `{user_id}/{filename}`

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring:
- Users can only access their own data
- Authentication required for all operations
- User ID verification on all queries
- No cross-user data leakage

---

## Edge Functions

### Available Functions (5 Total)

#### 1. **parse-documents**
- **Purpose**: Extract text from uploaded medical documents
- **Trigger**: After file upload
- **Input**: File path, user ID, session ID
- **Output**: Extracted text and structured data

#### 2. **parse-medical-report**
- **Purpose**: Parse medical reports into structured format
- **Uses**: OpenAI GPT-4 for intelligent extraction
- **Input**: Extracted text from documents
- **Output**: Structured medical data (lab values, tests, dates)

#### 3. **generate-health-insights**
- **Purpose**: Generate AI-powered health insights
- **Uses**: OpenAI GPT-4 with Althea system prompt
- **Input**: Parsed medical data, user preferences (tone, language)
- **Output**: Personalized health insights and recommendations

#### 4. **generate-health-report**
- **Purpose**: Generate downloadable PDF health reports
- **Input**: Health insights, patient data, preferences
- **Output**: PDF file stored in storage bucket

#### 5. **test-api-key**
- **Purpose**: Verify OpenAI API key configuration
- **Input**: None
- **Output**: Connection status

### Deploying Edge Functions

**Important**: Edge Functions are NOT automatically deployed. They need manual deployment.

**Method 1: Using MCP Tools (In This Environment)**
```typescript
// Functions are deployed using the mcp__supabase__deploy_edge_function tool
// This is handled automatically in development
```

**Method 2: Using Supabase CLI**
```bash
# Deploy a specific function
supabase functions deploy parse-documents

# Deploy all functions
supabase functions deploy parse-medical-report
supabase functions deploy generate-health-insights
supabase functions deploy generate-health-report
supabase functions deploy test-api-key
```

**Method 3: Through Supabase Dashboard**
1. Go to https://supabase.com/dashboard/project/idyhyrpsltbpdhnmbnje/functions
2. Click "Deploy new function"
3. Upload function code from `supabase/functions/` directory

---

## Environment Variables Reference

### Required for Frontend (VITE_)

```env
# Supabase Connection
VITE_SUPABASE_URL=https://idyhyrpsltbpdhnmbnje.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key_from_dashboard>
```

### Required for Edge Functions (Auto-configured in Supabase)

These are automatically available in Edge Functions runtime:
```env
SUPABASE_URL=<auto_configured>
SUPABASE_ANON_KEY=<auto_configured>
SUPABASE_SERVICE_ROLE_KEY=<auto_configured>
```

### Required for AI Features (Set in Supabase Dashboard)

```env
OPENAI_API_KEY=<your_openai_api_key>
```

**To set Edge Function secrets:**
```bash
# Using CLI
supabase secrets set OPENAI_API_KEY=sk-...

# Or through Dashboard:
# Settings > Edge Functions > Secrets
```

---

## Migration Management Best Practices

### For Collaborators

**DO:**
- Always pull latest code before making schema changes
- Test migrations locally first (if possible)
- Apply migrations in chronological order
- Document why you're creating a migration
- Use descriptive migration filenames

**DON'T:**
- Manually edit the database without migrations
- Delete or modify existing migration files
- Apply migrations out of order
- Create migrations that break existing data

### Creating New Migrations

**Using Supabase CLI:**
```bash
# Create a new migration
supabase migration new add_new_feature_table

# Edit the generated file in supabase/migrations/
# Then apply it
supabase db push
```

**Manual Creation:**
1. Create file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Add SQL with proper comments
3. Test locally or on a branch
4. Commit and push to repository
5. Notify team to apply migration

---

## Data Migration Strategy (From Bolt DB)

If you need to migrate data from an existing Bolt DB project:

### Step 1: Export Data from Bolt DB

```sql
-- Export profiles
COPY (SELECT * FROM profiles) TO '/tmp/profiles.csv' CSV HEADER;

-- Export family members
COPY (SELECT * FROM family_members) TO '/tmp/family_members.csv' CSV HEADER;

-- Export sessions
COPY (SELECT * FROM sessions) TO '/tmp/sessions.csv' CSV HEADER;

-- Export files metadata
COPY (SELECT * FROM files) TO '/tmp/files.csv' CSV HEADER;

-- Repeat for other tables...
```

### Step 2: Transform Data (If Schema Differs)

Create transformation scripts to match the new schema structure.

Example transformation script:
```javascript
// transform-data.js
const fs = require('fs');
const csv = require('csv-parser');

const results = [];

fs.createReadStream('profiles.csv')
  .pipe(csv())
  .on('data', (row) => {
    // Transform row to match new schema
    results.push({
      id: row.id,
      full_name: row.full_name,
      // Add new fields with defaults
      gender: null,
      address: null,
      // Keep existing fields
      created_at: row.created_at
    });
  })
  .on('end', () => {
    // Write transformed data
    fs.writeFileSync('profiles_transformed.json', JSON.stringify(results, null, 2));
  });
```

### Step 3: Import Data to New Database

```bash
# Using Supabase SQL Editor
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Paste import queries

# Or use Supabase client library
node import-data.js
```

**Important**: Storage files (medical documents, PDFs) need separate migration:
```bash
# Download from Bolt DB storage
supabase storage download --project-ref <bolt_project_ref> medical-files

# Upload to new project storage
supabase storage upload --project-ref idyhyrpsltbpdhnmbnje medical-files ./downloaded_files
```

---

## Troubleshooting

### Connection Issues

**Problem**: "Missing Supabase environment variables"
**Solution**:
```bash
# Verify .env file exists and has correct values
cat .env

# Restart dev server
npm run dev
```

**Problem**: "Failed to fetch from Supabase"
**Solution**:
```bash
# Check network connection
curl https://idyhyrpsltbpdhnmbnje.supabase.co

# Verify API keys are correct in dashboard
# Go to: Settings > API
```

### Migration Issues

**Problem**: "Migration already applied"
**Solution**:
```bash
# Check migration status
supabase db remote status

# If stuck, reset migrations (WARNING: Destructive)
# Only do this on a fresh database
supabase db reset
```

**Problem**: "Foreign key constraint violation"
**Solution**:
- Ensure migrations are applied in correct order
- Check if parent tables exist before applying child table migrations

### RLS Policy Issues

**Problem**: "Row-level security policy violation"
**Solution**:
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check existing policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Verify auth.uid() is returning correct user ID
SELECT auth.uid();
```

### Edge Function Issues

**Problem**: "Function not found"
**Solution**:
```bash
# List deployed functions
supabase functions list

# Deploy missing function
supabase functions deploy function-name
```

**Problem**: "Function returns 500 error"
**Solution**:
```bash
# Check function logs
supabase functions logs function-name

# Test locally
supabase functions serve function-name
```

---

## Team Collaboration Workflow

### Recommended Git Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Create feature branch
git checkout -b feature/new-health-metric

# 3. Make changes (code, migrations, etc.)
# Edit files...

# 4. Test locally
npm run dev
npm run build

# 5. Commit changes
git add .
git commit -m "Add new health metric tracking"

# 6. Push to remote
git push origin feature/new-health-metric

# 7. Create Pull Request
# Review with team before merging
```

### Schema Change Protocol

1. **Discuss**: Discuss schema changes with team first
2. **Branch**: Create a feature branch
3. **Migrate**: Create migration file with clear documentation
4. **Test**: Test migration on branch database
5. **Review**: Get team review on PR
6. **Merge**: Merge to main after approval
7. **Apply**: Team members apply migrations locally

### Communication

**Before Making Schema Changes:**
- Notify team in Slack/Discord/Teams
- Document the change reason
- Consider backward compatibility
- Plan for data migration if needed

**After Applying Migrations:**
- Announce in team chat
- Update documentation
- Provide migration instructions
- Monitor for issues

---

## Security Best Practices

### API Keys

**DO:**
- Keep `.env` file in `.gitignore`
- Use environment-specific API keys
- Rotate keys regularly
- Use service role key only server-side

**DON'T:**
- Commit API keys to repository
- Share keys in plain text
- Use production keys in development
- Expose service role key in frontend

### RLS Policies

**Always:**
- Enable RLS on all user data tables
- Test policies with different user accounts
- Use `auth.uid()` for user verification
- Restrict policies to minimum necessary access

**Never:**
- Use `USING (true)` in policies
- Disable RLS on user data tables
- Trust client-side user ID values
- Create overly permissive policies

### Storage Security

**Best Practices:**
- Use folder structure: `{user_id}/...`
- Verify user owns folder in RLS policies
- Set appropriate file size limits
- Restrict allowed MIME types
- Scan uploaded files for malware (recommended)

---

## Performance Optimization

### Indexing Strategy

All foreign keys are indexed automatically. Additional indexes created:
- User ID columns (for RLS policy performance)
- Timestamp columns (for sorting)
- Status columns (for filtering)
- Frequently queried columns

### Query Optimization

```typescript
// Good: Select only needed columns
const { data } = await supabase
  .from('sessions')
  .select('id, status, created_at')
  .eq('user_id', userId);

// Bad: Select everything
const { data } = await supabase
  .from('sessions')
  .select('*')
  .eq('user_id', userId);
```

### Connection Pooling

Supabase provides automatic connection pooling. For high-traffic applications:
- Use `supabase-js` client (connection pooling built-in)
- Avoid creating multiple client instances
- Reuse single client instance across app

---

## Support & Resources

### Documentation
- **Project README**: `/README.md`
- **Technical Implementation**: `/TECHNICAL_IMPLEMENTATION_PLAN.md`
- **Quick Start Guide**: `/QUICK_START_GUIDE.md`
- **UX Design**: `/UX_REDESIGN_DOCUMENT.md`

### Supabase Resources
- **Project Dashboard**: https://supabase.com/dashboard/project/idyhyrpsltbpdhnmbnje
- **Supabase Docs**: https://supabase.com/docs
- **Supabase CLI Docs**: https://supabase.com/docs/guides/cli
- **Migration Guide**: https://supabase.com/docs/guides/database/migrations

### Getting Help

**For Project-Specific Issues:**
- Check existing documentation files
- Review migration files for schema questions
- Check Supabase dashboard logs

**For Supabase Platform Issues:**
- Supabase Discord: https://discord.supabase.com
- Supabase GitHub Issues: https://github.com/supabase/supabase
- Stack Overflow: Tag with `supabase`

---

## Appendix: Complete Schema Reference

### Tables by Category

**Authentication (1 table)**
- profiles: User profile information

**Lead Management (1 table)**
- leads: Early access lead capture

**Family & Patient Data (2 tables)**
- family_members: Family member profiles
- patients: Detailed patient information

**Document Processing (3 tables)**
- sessions: Upload workflow sessions
- files: Document file metadata
- parsed_documents: Extracted document data

**Medical Data (3 tables)**
- lab_reports: Lab report metadata
- test_results: Individual test results
- health_metrics: Historical metrics

**AI & Insights (3 tables)**
- health_insights: AI-generated insights
- user_insight_preferences: User preferences
- report_generation_history: Report tracking

**Reports (2 tables)**
- health_reports: Health report metadata
- report_pdfs: PDF storage references

**Family Analytics (2 tables)**
- family_patterns: Hereditary patterns
- family_health_analytics: Family trends

**Support (2 tables)**
- ai_summaries: AI summary text
- reminders: Health reminders

**Total: 19 tables + 3 storage buckets + 5 edge functions**

---

## Conclusion

This guide provides everything needed to connect to and work with the shared Supabase project. All collaborators should:

1. Use the shared `.env` configuration
2. Apply migrations to set up schema
3. Follow team collaboration workflows
4. Maintain security best practices
5. Communicate schema changes

**Remember**: You're working on a SHARED database. Coordinate with your team and always test changes before applying to production.

For questions or issues, refer to the documentation resources or reach out to the team lead.

---

**Last Updated**: 2025-11-07
**Database Status**: Fresh, migrations pending
**Project Ref**: idyhyrpsltbpdhnmbnje
**Collaborator Guide Version**: 1.0
