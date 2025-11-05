# Report Consistency Testing Guide

## Quick Verification Test

Follow these steps to verify that downloaded reports match on-screen insights exactly:

### Step 1: Generate Health Insights

1. Upload a medical report image
2. Complete document review
3. Confirm parsed data
4. Wait for AI Health Insights to generate
5. **IMPORTANT**: Take screenshots or notes of:
   - The summary/greeting text
   - First 2-3 key findings (exact wording)
   - Any abnormal values shown
   - First 3 questions for doctor
   - First 2 recommendations

### Step 2: Download Report

1. Click the green "Download Report" button
2. Wait for download to complete
3. Open the downloaded HTML file in browser

### Step 3: Compare Content

Compare these sections line-by-line:

| Section | On-Screen | Downloaded | Match? |
|---------|-----------|------------|--------|
| **Greeting/Summary** | "Hello [Name]! Let's review..." | Same text? | ✅/❌ |
| **Key Finding #1** | Exact wording | Exact wording | ✅/❌ |
| **Key Finding #2** | Exact wording | Exact wording | ✅/❌ |
| **Key Finding #3** | Exact wording | Exact wording | ✅/❌ |
| **Abnormal Value #1** | Test name + explanation | Same test + same explanation | ✅/❌ |
| **Question #1** | Exact question text | Exact question text | ✅/❌ |
| **Question #2** | Exact question text | Exact question text | ✅/❌ |
| **Question #3** | Exact question text | Exact question text | ✅/❌ |
| **Recommendation #1** | Exact text | Exact text | ✅/❌ |
| **Recommendation #2** | Exact text | Exact text | ✅/❌ |

### Expected Result

**ALL sections should match EXACTLY** - word for word, no variations.

## Detailed Testing Protocol

### Test Case 1: First Download

**Scenario**: User generates insights and downloads report for first time

**Steps:**
1. Complete workflow to Health Insights screen
2. Record on-screen content:
   ```
   Summary: [exact text]
   Finding 1: [exact text]
   Finding 2: [exact text]
   Question 1: [exact text]
   Question 2: [exact text]
   ```
3. Click "Download Report"
4. Check download time (should be < 2 seconds if cached)
5. Open downloaded report
6. Compare all content

**Expected:**
- ✅ Download completes quickly
- ✅ All content matches exactly
- ✅ Same emojis present
- ✅ Same analogies used
- ✅ Same tone throughout

### Test Case 2: Multiple Downloads

**Scenario**: User downloads same report multiple times

**Steps:**
1. Download report (first time)
2. Note the content
3. Download again (second time)
4. Compare both downloaded files
5. Download a third time
6. Compare all three files

**Expected:**
- ✅ All three downloads are identical
- ✅ File size is exactly the same
- ✅ Content is byte-for-byte identical
- ✅ All downloads happen quickly (< 2 seconds)

### Test Case 3: Different Sessions

**Scenario**: User creates multiple sessions with different reports

**Steps:**
1. Upload Report A → Generate insights → Download
2. Upload Report B → Generate insights → Download
3. Compare Report A download with Report A on-screen
4. Compare Report B download with Report B on-screen

**Expected:**
- ✅ Report A download matches Report A insights
- ✅ Report B download matches Report B insights
- ✅ Reports are different from each other
- ✅ Each is internally consistent

### Test Case 4: Edge Cases

#### A. Report with No Abnormal Values

**Steps:**
1. Upload a healthy report (all normal values)
2. Generate insights
3. Verify insights show "All values normal"
4. Download report
5. Verify downloaded report says same thing

**Expected:**
- ✅ Both show positive/healthy message
- ✅ Both explain normal values the same way

#### B. Report with Urgent Findings

**Steps:**
1. Upload report with critical values
2. Generate insights
3. Note urgency flag and warnings on screen
4. Download report
5. Verify same urgency indicators present

**Expected:**
- ✅ Urgency flag matches
- ✅ Warning messages identical
- ✅ Emergency guidance same

#### C. Report with Many Tests

**Steps:**
1. Upload comprehensive metabolic panel (10+ tests)
2. Generate insights
3. Count number of findings on screen
4. Download report
5. Count number of findings in download

**Expected:**
- ✅ Same number of tests/findings
- ✅ Same categorization
- ✅ All explanations match

## Automated Verification (Developer)

### Browser Console Check

After downloading, check console for these messages:

```javascript
// Good - using cached data
"Using existing insights data to create consistent report (no regeneration)"
"Using existing questions from insights (no regeneration)"
"Using cached report from Step 3: [path]"

// Bad - shouldn't see these
"Generating report content for X tests"  // ← Should NOT appear
"OpenAI API error"  // ← Should NOT appear
```

### Network Tab Check

Monitor network requests:

```
✅ GOOD: Only see storage download request
  GET /storage/v1/object/health-reports/[userId]/[reportId].html
  Response Time: < 500ms

❌ BAD: If you see OpenAI API call
  POST https://api.openai.com/v1/chat/completions
  (This means regeneration is happening - bug!)
```

### Database Check

Query to verify report uses cached insights:

```sql
SELECT
  hi.id as insight_id,
  hi.insights_data->>'summary' as insight_summary,
  hr.report_data->>'executive_summary' as report_summary,
  hi.report_id,
  hr.id as report_id_check
FROM health_insights hi
JOIN health_reports hr ON hr.id = hi.report_id
WHERE hi.session_id = '[session_id]';

-- Both summaries should be identical or very similar
-- report_id should match report_id_check
```

## Common Issues & Solutions

### Issue: Content Doesn't Match

**Symptoms:**
- Downloaded report has different wording
- Questions are different
- Recommendations vary

**Solution:**
1. Check browser console for errors
2. Verify edge function deployed correctly
3. Clear cached reports and regenerate
4. Check that transformation function is being called:
   ```
   "Transforming existing insights to report format"
   ```

### Issue: Download Takes Long Time

**Symptoms:**
- Download button shows "Preparing..." for > 5 seconds
- Multiple OpenAI API calls in network tab

**Solution:**
- Verify report caching is working
- Check `health_insights.report_storage_path` is populated
- Ensure cache check logic is running

### Issue: "No health insights found" Error

**Symptoms:**
- Download fails with error message
- Console shows 404 error

**Solution:**
- Insights must be generated first
- Check `health_insights` table has entry for session
- Verify `insights_data` column is populated

## Success Criteria

### Test is PASSED if:

✅ Downloaded report summary matches on-screen summary (exact wording)
✅ All key findings match exactly (no paraphrasing)
✅ Abnormal values show same explanations
✅ Questions for doctor are identical
✅ Health recommendations match word-for-word
✅ Emojis present in both versions
✅ Analogies are the same
✅ Tone is consistent (friendly, simple)
✅ Download happens quickly (< 2 seconds after insights cached)
✅ Multiple downloads produce identical files
✅ No OpenAI API calls during download
✅ Console shows "Using existing insights" message

### Test is FAILED if:

❌ Any wording differences between versions
❌ Different findings or recommendations
❌ Questions don't match
❌ Missing emojis in download
❌ Different tone/style
❌ Download takes > 5 seconds (after first time)
❌ OpenAI API calls during download
❌ Multiple downloads differ from each other
❌ Console shows "Generating report content" message

## Reporting Issues

If test fails, document:

1. **What section didn't match:**
   - Quote exact text from on-screen
   - Quote exact text from download
   - Highlight differences

2. **Browser console output:**
   - Copy all relevant log messages
   - Note any errors

3. **Network tab details:**
   - Was OpenAI API called?
   - What was the response time?

4. **Database state:**
   - Does `health_insights` have `insights_data`?
   - Does it have `report_id` and `report_storage_path`?

## Quick Command Reference

### Check Edge Function Logs
```bash
# If using Supabase CLI
supabase functions logs generate-health-report
```

### Verify Database State
```sql
-- Check if insights exist
SELECT session_id, insights_data, report_id, report_storage_path
FROM health_insights
WHERE session_id = '[your-session-id]';

-- Check if report cached correctly
SELECT id, storage_path, generated_at
FROM health_reports
WHERE session_id = '[your-session-id]';
```

### Test Transformation Function
```javascript
// In browser console after insights load
const insights = [get insights data from component state];
console.log(JSON.stringify(insights, null, 2));
// Verify structure matches expected format
```

---

**Version:** 1.0
**Last Updated:** November 5, 2025
**Status:** Active
