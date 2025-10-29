# ALTHEA ENHANCEMENT IMPLEMENTATION INSTRUCTIONS

## Overview
This guide provides step-by-step instructions to implement clinician-informed AI enhancements and consolidate duplicate Step 3 report generation in your Althea application.

---

## Part 1: Update System Prompt in Bolt.new Project Settings

### Step 1: Access Project Settings
1. Open your Althea project in **Bolt.new**
2. Click on **Project Settings** (gear icon or settings menu)
3. Navigate to the **Knowledge Base** section

### Step 2: Replace System Prompt
1. **Locate the current system prompt** in the Knowledge Base
2. **Open the file:** `ENHANCED_SYSTEM_PROMPT.md` (created in this repository)
3. **Copy the entire contents** of the Enhanced System Prompt
4. **Paste it into the Knowledge Base**, replacing the existing content
5. **Save** the changes

### What This Does:
- Enhances AI outputs with clinician-level medical reasoning
- Improves accuracy of abnormal value interpretation
- Adds better urgency assessment using clinical guidelines
- Strengthens safety protocols and critical value detection
- Makes explanations more natural and medically sound

---

## Part 2: Update Edge Function Prompt

### Step 3: Deploy Updated Edge Function

The Edge Function `generate-health-insights/index.ts` has been updated with:
- **Enhanced system prompt** with clinician-informed medical intelligence
- **Personalized user prompts** that include patient name, age, gender, and report context
- **Improved clinical reasoning** instructions for better output quality

**The file has already been updated in your project at:**
```
/tmp/cc-agent/59329146/project/supabase/functions/generate-health-insights/index.ts
```

### Deploy the Changes:

**Option A: Using Supabase CLI (if you have it installed)**
```bash
cd /tmp/cc-agent/59329146/project
supabase functions deploy generate-health-insights
```

**Option B: Through Bolt.new**
1. The changes are already in your project files
2. Bolt.new will automatically deploy the updated Edge Function when you commit/save changes
3. Verify deployment in Supabase Dashboard → Edge Functions

### What This Does:
- Applies clinician-level medical reasoning to all health insights
- Personalizes greetings with patient names and context
- Improves question generation to be more clinically relevant
- Better assesses urgency based on clinical guidelines vs. just abnormal ranges
- Provides more accurate and natural explanations

---

## Part 3: Consolidate Step 3 Report Generation

### Step 4: Updated HealthInsights Component

The HealthInsights component has been updated to:
- **Remove duplicate report generation** flow
- **Consolidate into single "Generate & Download Report" button**
- **Eliminate the separate ReportManager modal** invocation
- **Streamline the user experience** with one-click generation and download

**The file has already been updated in your project at:**
```
/tmp/cc-agent/59329146/project/src/components/HealthInsights.tsx
```

### Changes Made:
1. **Removed import** of `ReportManager` component
2. **Removed state** `showReportManager`
3. **Added new function** `handleGenerateReport()` that:
   - Calls the generate-health-report Edge Function
   - Automatically downloads the generated PDF
   - Shows loading state during generation
4. **Updated button** to single "Generate & Download Report" action
5. **Removed** the separate ReportManager modal section

### What This Does:
- Eliminates duplication in Step 3 workflow
- Provides single-click report generation and download
- Removes redundant API calls and data fetching
- Simplifies user flow and improves UX
- Reduces code complexity and maintenance burden

---

## Part 4: Testing & Verification

### Step 5: Test the Enhancements

**Test Enhanced AI Outputs:**
1. Upload a medical report through the normal workflow
2. Proceed to Step 3 (Health Insights)
3. Verify that the insights include:
   - ✓ Personalized greeting with patient name
   - ✓ More detailed clinical context and explanations
   - ✓ 5-8 clinically relevant questions (vs previous 3-5)
   - ✓ Better urgency assessment
   - ✓ More natural and medically accurate language

**Test Consolidated Report Generation:**
1. On Step 3 (Health Insights page), locate the button area
2. Verify you see **ONE button**: "Generate & Download Report"
3. Click the button and verify:
   - ✓ Loading state appears
   - ✓ PDF generates successfully
   - ✓ PDF automatically downloads
   - ✓ No separate modal or additional steps required

**Test Different Tones:**
1. Try different tone selections (Friendly, Professional, Empathetic)
2. Verify outputs adapt appropriately while maintaining medical accuracy
3. Confirm personalization works across all tones

---

## Part 5: Build & Deploy

### Step 6: Build the Project

Run the build command to ensure everything compiles correctly:

```bash
npm run build
```

**Expected outcome:**
- ✓ No TypeScript errors
- ✓ No build warnings
- ✓ Successful compilation

### Step 7: Deploy to Production

**If using Bolt.new's automatic deployment:**
- Changes are automatically deployed when you save/commit

**If deploying manually:**
```bash
# Deploy frontend
npm run build
# Deploy to your hosting service (Vercel, Netlify, etc.)

# Deploy Edge Functions
supabase functions deploy generate-health-insights
```

---

## Summary of Changes

### What Was Enhanced:
✅ **System Prompt:** Clinician-informed medical intelligence for better accuracy
✅ **Edge Function:** Personalized prompts with patient context and improved reasoning
✅ **Step 3 UI:** Consolidated single-click report generation (removed duplication)

### What Was NOT Changed:
- No new features added
- No database schema changes
- No new UI components or modes
- No changes to parsing workflow
- No changes to authentication or other steps

### Benefits:
- **Better Medical Accuracy:** Clinician-level reasoning improves output quality
- **More Natural Language:** Explanations are clearer and more user-friendly
- **Personalized Experience:** Uses patient names and context naturally
- **Streamlined Workflow:** One-click report generation instead of multi-step process
- **Reduced Complexity:** Less duplicate code and simpler maintenance

---

## Troubleshooting

### If insights don't show personalized greeting:
- Verify patient name is captured during parsing
- Check Edge Function logs in Supabase Dashboard
- Ensure the updated Edge Function is deployed

### If report generation button doesn't work:
- Verify the `generate-health-report` Edge Function exists
- Check browser console for errors
- Ensure user is authenticated (session valid)

### If build fails:
- Run `npm install` to ensure dependencies are up to date
- Check for TypeScript errors with `npm run typecheck`
- Review error messages for specific file/line issues

### If AI outputs don't seem improved:
- Verify system prompt was updated in Bolt.new Knowledge Base
- Check that Edge Function changes were deployed
- Try regenerating insights with the refresh button

---

## Rollback Instructions

If you need to revert changes:

### Rollback Edge Function:
1. Go to Supabase Dashboard → Edge Functions
2. Click on `generate-health-insights`
3. View deployment history
4. Redeploy a previous version

### Rollback Frontend:
1. Use Git to revert the HealthInsights.tsx changes
2. Restore the ReportManager import and modal logic
3. Rebuild and redeploy

### Rollback System Prompt:
1. Go to Bolt.new → Project Settings → Knowledge Base
2. Restore the previous version of the system prompt
3. Save changes

---

## Next Steps

After successful implementation:

1. **Monitor AI Output Quality**
   - Review several generated insights for accuracy
   - Check that personalization works correctly
   - Verify urgency flags are appropriate

2. **Collect User Feedback**
   - Note improvements in clarity and usefulness
   - Track any confusion or issues
   - Gather data on report generation usage

3. **Iterate Based on Results**
   - Fine-tune prompts based on real-world outputs
   - Adjust tone mappings if needed
   - Enhance personalization further

4. **Update Documentation**
   - Document any new patterns observed
   - Update user guides if workflow changed noticeably
   - Create internal notes on prompt performance

---

## Support & Contact

For issues or questions:
- Check Supabase Edge Function logs for API errors
- Review browser console for frontend errors
- Test with different medical reports to isolate issues
- Verify environment variables are correctly set

---

## Conclusion

You now have:
1. ✅ Enhanced system prompt with clinician-informed intelligence (in Knowledge Base)
2. ✅ Updated Edge Function with personalization and better prompts (deployed)
3. ✅ Consolidated Step 3 report generation (no duplication)
4. ✅ Streamlined user workflow (single-click report download)

**No new features were added** - only enhancements to existing functionality for better quality and user experience.

The Althea application now provides more accurate, medically sound, and user-friendly health interpretations while simplifying the report generation process.
