# Collaborator Quick Start Guide

**Get up and running in 5 minutes**

---

## 🚀 Quick Setup

### 1. Clone and Install (2 min)

```bash
# Clone the repository
git clone <repository-url>
cd althea-health

# Install dependencies
npm install
```

### 2. Environment Already Configured ✅

The `.env` file is already set up with the shared Supabase project:

```env
VITE_SUPABASE_URL=https://idyhyrpsltbpdhnmbnje.supabase.co
VITE_SUPABASE_ANON_KEY=<already_configured>
SUPABASE_SERVICE_ROLE_KEY=<already_configured>
```

**Important**: All team members use the SAME Supabase database.

### 3. Apply Database Migrations (2 min)

**First time only** - Set up the database schema:

```bash
# Option A: Using Supabase CLI (recommended)
npm install -g supabase
supabase login
supabase link --project-ref idyhyrpsltbpdhnmbnje
npm run db:push

# Option B: Manual application via Dashboard
# Go to: https://supabase.com/dashboard/project/idyhyrpsltbpdhnmbnje/sql/new
# Copy and paste migration files from supabase/migrations/ (in order)
```

### 4. Verify Setup (1 min)

```bash
# Verify environment
npm run verify-env

# Verify database connection
npm run verify-db

# Start development server
npm run dev
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] `npm run verify-env` passes
- [ ] `npm run verify-db` shows all tables exist
- [ ] Development server starts without errors
- [ ] Can sign up for a new account
- [ ] Can log in successfully

---

## 📚 Key Documentation

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[COLLABORATOR_QUICK_START.md](./COLLABORATOR_QUICK_START.md)** | This file - quick setup | First time setup |
| **[SUPABASE_COLLABORATOR_CONNECTION_GUIDE.md](./SUPABASE_COLLABORATOR_CONNECTION_GUIDE.md)** | Complete database connection guide | Schema questions, RLS issues |
| **[EDGE_FUNCTIONS_DEPLOYMENT_GUIDE.md](./EDGE_FUNCTIONS_DEPLOYMENT_GUIDE.md)** | Deploy AI functions | Working with AI features |
| **[README.md](./README.md)** | Project overview | Understanding the app |
| **[TECHNICAL_IMPLEMENTATION_PLAN.md](./TECHNICAL_IMPLEMENTATION_PLAN.md)** | Full technical spec | Architecture questions |

---

## 🛠️ Useful Commands

### Development

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run typecheck    # Check TypeScript types
npm run lint         # Run ESLint
```

### Database

```bash
npm run verify-db    # Check database connection and schema
npm run db:status    # Show migration status
npm run db:push      # Apply local migrations to remote DB
npm run db:pull      # Pull remote schema to local
```

### Data Migration

```bash
# Migrate data from Bolt DB (if needed)
npm run migrate-from-bolt

# Requires setting BOLT_SUPABASE_URL and BOLT_SUPABASE_SERVICE_KEY
```

---

## 🗄️ Database Overview

### Shared Database Info

- **Project URL**: https://idyhyrpsltbpdhnmbnje.supabase.co
- **Project Ref**: idyhyrpsltbpdhnmbnje
- **Dashboard**: https://supabase.com/dashboard/project/idyhyrpsltbpdhnmbnje

### Schema Summary

**19 Tables**:
- User Management: `profiles`, `leads`
- Family & Patients: `family_members`, `patients`
- Document Processing: `sessions`, `files`, `parsed_documents`
- Medical Data: `lab_reports`, `test_results`, `health_metrics`
- AI & Insights: `health_insights`, `user_insight_preferences`, `report_generation_history`
- Reports: `health_reports`, `report_pdfs`
- Analytics: `family_patterns`, `family_health_analytics`
- Support: `ai_summaries`, `reminders`

**3 Storage Buckets**:
- `medical-files` - Uploaded medical documents
- `report-pdfs` - Generated reports
- `health-reports` - Health report PDFs

**5 Edge Functions**:
- `test-api-key` - Verify OpenAI connection
- `parse-documents` - Extract text from files
- `parse-medical-report` - Parse into structured data
- `generate-health-insights` - AI health insights
- `generate-health-report` - Generate PDF reports

---

## 🔧 Common Tasks

### Creating a New Migration

```bash
# Using Supabase CLI
supabase migration new add_new_feature

# Edit the file in supabase/migrations/
# Then apply it
npm run db:push
```

### Deploying Edge Functions

```bash
# Deploy single function
supabase functions deploy function-name

# Deploy all functions
supabase functions deploy test-api-key
supabase functions deploy parse-documents
supabase functions deploy parse-medical-report
supabase functions deploy generate-health-insights
supabase functions deploy generate-health-report
```

### Setting OpenAI API Key

```bash
# Required for AI features
supabase secrets set OPENAI_API_KEY=sk-your-key-here
```

### Checking Function Logs

```bash
# Real-time logs
supabase functions logs function-name --follow

# Recent logs
supabase functions logs function-name
```

---

## 🚨 Troubleshooting

### "Missing Supabase environment variables"

**Solution**: The .env file should already exist. If missing:
```bash
cat .env  # Check if file exists
git restore .env  # Restore from repository
```

### "relation does not exist" error

**Solution**: Migrations haven't been applied:
```bash
npm run db:push
```

### "Function not found" error

**Solution**: Edge Functions need to be deployed:
```bash
supabase functions deploy function-name
```

### Build fails with TypeScript errors

**Solution**:
```bash
npm run typecheck  # Check for type errors
npm run lint       # Check for linting errors
```

### Cannot connect to Supabase

**Solution**:
```bash
# Check network
curl https://idyhyrpsltbpdhnmbnje.supabase.co

# Verify credentials in .env
cat .env

# Test connection
npm run verify-db
```

---

## 👥 Team Collaboration

### Before Making Changes

1. Pull latest code: `git pull origin main`
2. Check migration status: `npm run db:status`
3. Apply any pending migrations: `npm run db:push`

### Making Schema Changes

1. Create feature branch
2. Create migration file
3. Test locally or on branch
4. Create PR for team review
5. After merge, team members run `npm run db:push`

### Communication

- Announce schema changes in team chat
- Document migration purpose in comments
- Test migrations before pushing
- Coordinate deployments for Edge Functions

---

## 📞 Getting Help

### Project Resources

- Project Dashboard: https://supabase.com/dashboard/project/idyhyrpsltbpdhnmbnje
- Supabase Docs: https://supabase.com/docs
- Supabase CLI Reference: https://supabase.com/docs/reference/cli

### Documentation Files

All questions should be answerable in:
1. `SUPABASE_COLLABORATOR_CONNECTION_GUIDE.md` - Database questions
2. `EDGE_FUNCTIONS_DEPLOYMENT_GUIDE.md` - Function questions
3. `TECHNICAL_IMPLEMENTATION_PLAN.md` - Architecture questions
4. `README.md` - General project info

### Support Channels

- Check existing documentation first
- Review Supabase logs for errors
- Ask team lead for project-specific questions
- Use Supabase Discord for platform issues

---

## ✨ Next Steps

After setup is complete:

1. **Explore the codebase**:
   - `src/components/` - React components
   - `src/lib/supabase.ts` - Database client
   - `src/contexts/AuthContext.tsx` - Authentication

2. **Try the application**:
   - Sign up for an account
   - Upload a sample medical document
   - Explore the dashboard features

3. **Read the architecture docs**:
   - Review `TECHNICAL_IMPLEMENTATION_PLAN.md`
   - Understand the workflow in `UX_REDESIGN_DOCUMENT.md`
   - Check deployment process in `QUICK_DEPLOYMENT_GUIDE.md`

4. **Set up AI features** (optional):
   - Get OpenAI API key
   - Set secret: `supabase secrets set OPENAI_API_KEY=sk-...`
   - Deploy Edge Functions
   - Test document processing

---

## 🎯 Success Criteria

You're ready to start developing when:

✅ Development server runs without errors
✅ Can create account and log in
✅ Database connection is verified
✅ Build completes successfully
✅ Have access to Supabase Dashboard
✅ Understand where to find documentation

---

**Welcome to the team! 🎉**

You're now ready to contribute to Althea Health. Check the project board for tasks, follow the collaboration workflow, and don't hesitate to ask questions.

---

**Last Updated**: 2025-11-07
**Setup Time**: ~5 minutes
**Support**: See documentation files or ask team lead
