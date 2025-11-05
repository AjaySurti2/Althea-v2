# Testing Guide - Simplified Workflow

## Quick Test Checklist

### 1. Start Workflow
- [ ] Click "Get Started" or "Upload New Report"
- [ ] Verify you see **"Step 1 of 4"** in header

### 2. Family Details (Step 0)
- [ ] Select or create family member
- [ ] Click "Continue"
- [ ] Should advance to Upload step

### 3. Upload Documents (Step 1)
- [ ] Upload medical report image (PNG/JPEG/WEBP)
- [ ] Wait for upload to complete
- [ ] Should see Document Review modal

### 4. Document Review Modal
- [ ] Review uploaded document preview
- [ ] Verify document shows correctly
- [ ] Click "Continue" or "Approve"
- [ ] **CRITICAL**: Should go directly to Parsed Data Review
- [ ] **Should NOT see customization/tone selection**

### 5. Parsed Data Review Modal
- [ ] See parsed medical data (tests, values, ranges)
- [ ] Verify data looks accurate
- [ ] Click "Continue"
- [ ] **CRITICAL**: Should go directly to Health Insights
- [ ] **Should NOT be asked to customize tone/language**

### 6. AI Health Insights & Report (Step 2)
- [ ] See title: "Your Health Insights & Report"
- [ ] See subtitle: "AI-powered analysis by Althea in friendly, plain language"
- [ ] Insights should load automatically
- [ ] Insights should be in friendly, conversational tone
- [ ] Insights should use simple language (no medical jargon)
- [ ] See green "Download Report" button
- [ ] **Should NOT see**: Regenerate button, Customize button, Tone selector

### 7. Download Report
- [ ] Click "Download Report" button
- [ ] Report should download instantly (or very quickly if first time)
- [ ] Open downloaded HTML file
- [ ] Verify report is in friendly, plain language
- [ ] Check for emojis and analogies in report

### 8. Complete Workflow
- [ ] Click "Complete" button
- [ ] Should return to dashboard or home
- [ ] Verify step count shows "Step 3 of 4" before completing

## Expected Workflow Flow

```
Step 1 of 4: Family Details
    ↓
Step 2 of 4: Upload Documents
    ↓
[Modal] Document Review
    ↓
[Modal] Parsed Data Review
    ↓
Step 3 of 4: AI Health Insights & Report (with auto-defaults)
    ↓
Step 4 of 4: Complete
```

## What Should NOT Appear

### ❌ These Should Be Hidden:
- [ ] Tone selector (Friendly/Professional/Empathetic)
- [ ] Language level selector (Simple/Moderate/Technical)
- [ ] "Customize" button or panel
- [ ] "Apply & Regenerate" button
- [ ] Step 2: Customize (in progress indicator)
- [ ] "Step X of 5" (should be "Step X of 4")

### ❌ These Screens Should Be Skipped:
- [ ] Customization step
- [ ] Preference selection screen
- [ ] Any UI asking for tone/language choice

## Verification Points

### Automatic Defaults Applied:
```javascript
// Check in browser console or network tab:
{
  tone: "friendly",          // or "conversational" in API
  language_level: "simple"   // or "simple_terms" in API
}
```

### Health Insights Characteristics:
- ✅ Uses analogies ("Think of it like...")
- ✅ Uses emojis (✓ ❤️ 📊 🏥)
- ✅ Plain English explanations
- ✅ Conversational tone ("Let's look at...", "Great news...")
- ✅ Avoids medical jargon

### Report Characteristics:
- ✅ Friendly greeting with name
- ✅ Visual elements and colors
- ✅ Organized sections
- ✅ Questions for doctor
- ✅ Simple explanations throughout

## Common Issues & Solutions

### Issue: Stuck after Document Review
**Solution:** ✅ Fixed - should now go directly to Parsed Data Review

### Issue: Seeing Customization Options
**Solution:** Clear browser cache, rebuild project:
```bash
npm run build
```

### Issue: Report Not Downloading
**Solution:** Check:
1. Edge function completed successfully
2. Storage bucket has file
3. Browser allows downloads

### Issue: Insights Not Friendly Enough
**Solution:** Check tone mapping in edge function:
- Frontend: `friendly` → Backend: `conversational`
- Frontend: `simple` → Backend: `simple_terms`

## Browser Developer Tools Checks

### 1. Network Tab
Check these API calls:
```
POST /functions/v1/generate-health-insights
  Body: { sessionId, tone: "conversational", languageLevel: "simple_terms" }

POST /functions/v1/generate-health-report
  Body: { sessionId, reportType: "comprehensive" }
```

### 2. Console Messages
Look for:
```
Generating insights for session: xxx with tone: conversational, language: simple_terms
Report generated successfully
```

### 3. Application Tab (Storage)
Check localStorage for:
```
darkMode: true/false
(No tone or languageLevel preferences stored)
```

## Performance Benchmarks

Expected timing:
- [ ] Upload → Document Review: < 5 seconds
- [ ] Document Review → Parsed Data: < 3 seconds
- [ ] Parsed Data → Health Insights: 5-15 seconds (AI generation)
- [ ] Insights → Report Download (cached): < 2 seconds
- [ ] Total workflow time: 1-2 minutes

## Edge Cases to Test

### Multiple Documents
- [ ] Upload 2-3 images
- [ ] All should be processed
- [ ] Insights should cover all documents

### Large Images
- [ ] Upload 5-10 MB image
- [ ] Should upload successfully
- [ ] Parsing should complete

### Return to Workflow
- [ ] Start workflow
- [ ] Close/cancel mid-way
- [ ] Start new workflow
- [ ] Should work cleanly

### Multiple Family Members
- [ ] Upload report for Member A
- [ ] Complete workflow
- [ ] Upload report for Member B
- [ ] Both should have separate insights

## Success Criteria

✅ **Workflow is considered successful if:**
1. No customization step appears
2. Completes in 4 visible steps (not 5)
3. Insights are friendly and simple
4. Download works immediately
5. Report is in plain language
6. No errors in console
7. User never sees tone/language options

## Reporting Issues

If you find problems, note:
1. Which step failed
2. What you expected
3. What actually happened
4. Browser console errors
5. Screenshot if possible

---

**Last Updated:** November 5, 2025
**Version:** 2.0 (Simplified)
**Status:** Ready for Testing
