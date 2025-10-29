# QUICK DEPLOYMENT GUIDE
**Althea Enhancement - Fast Implementation**

---

## 3-Step Deployment

### Step 1: Update System Prompt (2 minutes)
1. Open **Bolt.new** → **Project Settings** → **Knowledge Base**
2. Open file: `ENHANCED_SYSTEM_PROMPT.md`
3. Copy entire contents
4. Paste into Knowledge Base (replace existing)
5. Click **Save**

✅ **Done!** AI will now use clinician-informed prompts

---

### Step 2: Deploy Edge Function (1 minute)
**Option A - Automatic (Bolt.new):**
- Just save/commit your changes
- Bolt.new auto-deploys

**Option B - Manual (Supabase CLI):**
```bash
cd /tmp/cc-agent/59329146/project
supabase functions deploy generate-health-insights
```

✅ **Done!** Edge Function now uses enhanced prompts and personalization

---

### Step 3: Deploy Frontend (1 minute)
**Already built and ready:**
```bash
npm run build  # Already completed ✅
```

Deploy to your hosting (Vercel/Netlify/etc.) or let Bolt.new auto-deploy

✅ **Done!** Step 3 now has consolidated single-click report generation

---

## Test It (2 minutes)

1. Upload a medical report
2. Go to Step 3 (Health Insights)
3. Verify you see:
   - ✓ Personalized greeting: "Hello [Name]!"
   - ✓ More detailed explanations
   - ✓ 5-8 questions for doctor
   - ✓ Single button: "Generate & Download Report"
4. Click button → PDF downloads automatically

**If all works:** ✅ Deployment successful!

---

## Files You Need

All in your project root:
- `ENHANCED_SYSTEM_PROMPT.md` - For Knowledge Base
- `IMPLEMENTATION_INSTRUCTIONS.md` - Detailed guide
- `ENHANCEMENT_SUMMARY.md` - Complete overview

---

## What Changed

### Enhanced (Better Quality):
- AI system prompt (clinician-informed)
- Edge Function prompts (personalization)
- Medical accuracy and urgency assessment

### Simplified (Removed Duplication):
- Step 3 report generation
- Single button instead of multi-step
- Auto-download after generation

### No New Features:
- No new UI modes
- No database changes
- Same functionality, better quality

---

## Rollback (If Needed)

### Revert System Prompt:
- Go to Bolt.new Knowledge Base
- Restore previous version

### Revert Edge Function:
- Supabase Dashboard → Edge Functions
- Redeploy previous version

### Revert Frontend:
- Git revert HealthInsights.tsx changes
- Rebuild and redeploy

---

## Support

Questions? Check:
1. `IMPLEMENTATION_INSTRUCTIONS.md` - Full guide
2. `ENHANCEMENT_SUMMARY.md` - Technical details
3. Supabase Dashboard - Edge Function logs
4. Browser Console - Frontend errors

---

**Total Time: ~5 minutes**
**Complexity: Low**
**Risk: Minimal (easy rollback)**

Ready to deploy! 🚀
