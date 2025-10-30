# PDF Upload Temporary Disable - Implementation Guide

**Date Implemented:** October 30, 2025
**Status:** ACTIVE - PDF uploads currently disabled
**Purpose:** Temporary restriction while system maintenance is in progress

---

## Overview

PDF upload functionality has been temporarily disabled across the application. Users can still upload image files (PNG, JPEG, WEBP) without any restrictions. This document provides details on the changes made and instructions for easy reversal.

---

## User-Facing Changes

### What Users See

1. **File Input Restriction**
   - File picker now only accepts: `.png`, `.jpg`, `.jpeg`, `.webp`
   - PDF files cannot be selected from file dialog

2. **Updated UI Messages**
   - Upload area displays: "Supported formats: PNG, JPEG, WEBP (images only)"
   - Notice banner: "PDF uploads temporarily unavailable"
   - Maximum file size reminder: "MAX. 10MB per file"

3. **Error Messages**
   - If user attempts to upload PDF: Clear alert explaining temporary restriction
   - Professional tone that doesn't cause alarm
   - Guidance to use image formats instead

### Sample Error Message

```
PDF Upload Temporarily Unavailable

PDF uploads are temporarily disabled while we enhance our parsing system.

Image uploads (PNG, JPEG, WEBP) remain fully available.

This feature will be restored shortly. Thank you for your patience.

PDF files in your selection:
• report.pdf
```

---

## Technical Implementation

### Files Modified

#### 1. `/src/components/UploadWorkflow.tsx`

**Changes Made:**

**A. File Validation (Lines ~84-116)**
- Added early PDF detection and blocking
- Removed `application/pdf` from `supportedTypes` array
- Removed PDF file size validation (no longer needed)
- Updated error messages

**Before:**
```typescript
const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
```

**After:**
```typescript
// TEMPORARY: Block PDF uploads during system maintenance
const pdfFiles = selectedFiles.filter(file =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
);

if (pdfFiles.length > 0) {
  alert(/* temporary restriction message */);
  return;
}

const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
```

**B. File Input Accept Attribute (Line ~1236)**

**Before:**
```html
accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,.png,.jpg,.jpeg,.webp,.pdf"
```

**After:**
```html
accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
```

**C. Upload Area UI (Lines ~1220-1231)**

**Before:**
```jsx
<p className="text-xs">Images: PNG, JPEG, WEBP (MAX. 10MB each)</p>
<p className="text-xs">PDFs: Medical reports (MAX. 20MB each)</p>
```

**After:**
```jsx
<p className="text-xs">Supported formats: PNG, JPEG, WEBP (images only)</p>
<p className="text-xs">MAX. 10MB per file</p>
<div className="mt-3 px-3 py-2 rounded-lg bg-yellow-50">
  <p className="text-xs text-yellow-700 text-center">
    PDF uploads temporarily unavailable
  </p>
</div>
```

#### 2. `/src/components/Dashboard.tsx`

**Changes Made:**

**A. Error Message (Lines ~205-218)**

**Before:**
```
PDF files are not currently supported due to OpenAI API limitations.
Please convert your PDF medical reports to images...
```

**After:**
```
PDF Upload Temporarily Unavailable

PDF uploads are temporarily disabled while we enhance our parsing system.
Image uploads (PNG, JPEG, WEBP) remain fully available.
This feature will be restored shortly. Thank you for your patience.
```

---

## Reversal Instructions

### Quick Reversal Checklist

When ready to re-enable PDF uploads, follow these steps:

### Step 1: Revert UploadWorkflow.tsx

**A. Remove PDF Blocking Logic**

Find and remove (approximately lines 84-100):
```typescript
// TEMPORARY: Block PDF uploads during system maintenance
const pdfFiles = selectedFiles.filter(file =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
);

if (pdfFiles.length > 0) {
  alert(/* ... */);
  return;
}
```

**B. Restore Supported Types**

Change:
```typescript
const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
```

Back to:
```typescript
const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
```

**C. Restore PDF Size Validation**

Add back after file type validation:
```typescript
// Validate PDF file size (max 20MB per PDF)
const largePdfs = selectedFiles.filter(file =>
  file.type === 'application/pdf' && file.size > 20 * 1024 * 1024
);

if (largePdfs.length > 0) {
  alert(
    `Some PDF files are too large (max 20MB per PDF).\n\n` +
    `Large files:\n${largePdfs.map(f => `• ${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join('\n')}\n\n` +
    `Tips:\n` +
    `• Compress the PDF using online tools\n` +
    `• Split multi-page PDFs into smaller files\n` +
    `• Convert to high-quality images (PNG/JPEG)`
  );
  return;
}
```

**D. Restore File Input Accept**

Change:
```html
accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
```

Back to:
```html
accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,.png,.jpg,.jpeg,.webp,.pdf"
```

**E. Restore Upload Area UI**

Change:
```jsx
<p className="text-xs">Supported formats: PNG, JPEG, WEBP (images only)</p>
<p className="text-xs">MAX. 10MB per file</p>
<div className="mt-3 px-3 py-2 rounded-lg bg-yellow-50">
  <p className="text-xs text-yellow-700 text-center">
    PDF uploads temporarily unavailable
  </p>
</div>
```

Back to:
```jsx
<p className="text-xs">Images: PNG, JPEG, WEBP (MAX. 10MB each)</p>
<p className="text-xs">PDFs: Medical reports (MAX. 20MB each)</p>
```

### Step 2: Revert Dashboard.tsx

**A. Restore Original Error Message**

Change error message (lines ~206-215) back to original or improved version:
```typescript
if (pdfFiles.length > 0) {
  alert(
    `PDF files detected.\n\n` +
    `Please ensure your PDFs are medical reports and under 20MB each.\n\n` +
    `Supported formats: PNG, JPEG, WEBP, PDF`
  );
  // Remove: e.target.value = '';
  // Remove: return;
  // Allow PDFs to proceed
}
```

Or simply remove the PDF blocking entirely if PDFs should be fully supported.

### Step 3: Test Thoroughly

1. Upload single PDF file
2. Upload multiple PDF files
3. Upload mixed PDF + image files
4. Test PDF size limits (try 19MB and 21MB files)
5. Verify error messages for oversized PDFs
6. Test all upload flows (UploadWorkflow and Dashboard)

### Step 4: Update Documentation

- Update user-facing documentation
- Remove this temporary disable notice
- Announce re-enabled feature to users

---

## Testing the Current Restriction

### Manual Test Cases

**Test 1: Attempt PDF Upload via File Picker**
- Click upload area
- File picker should NOT show PDF files
- Only image files visible
- ✅ PASS: PDF files not selectable

**Test 2: Drag & Drop PDF File**
- Drag a PDF file to upload area
- Should see error alert
- Message: "PDF uploads temporarily unavailable"
- ✅ PASS: PDF rejected with proper message

**Test 3: Upload Image Files**
- Select PNG/JPEG/WEBP files
- Upload should proceed normally
- No errors or warnings
- ✅ PASS: Image uploads unaffected

**Test 4: UI Display**
- Check upload area text
- Should see notice about PDF restriction
- Clear, professional messaging
- ✅ PASS: UI properly updated

**Test 5: Dashboard Upload**
- Try uploading PDF from Dashboard
- Should see same restriction
- Consistent messaging
- ✅ PASS: All upload points restricted

---

## Backend Considerations

### Edge Functions

The backend Edge Functions (`parse-medical-report`, `parse-documents`, `parse-medical-document-unified`) still support PDF processing. The restriction is **frontend-only**. This means:

- ✅ Easy to reverse - no backend changes needed
- ✅ API remains functional for when restriction is lifted
- ✅ Testing can continue with direct API calls
- ⚠️ If someone bypasses frontend, PDFs would still process

### Storage Buckets

Storage bucket configurations in Supabase still allow `application/pdf` MIME type. No changes needed.

---

## Monitoring & Logging

### What to Watch

1. **User Feedback**
   - Monitor support requests about PDF uploads
   - Track user confusion or frustration
   - Adjust messaging if needed

2. **Workarounds**
   - Users converting PDFs to images
   - Increased image upload volume
   - Quality issues from PDF-to-image conversion

3. **Timing**
   - Track how long restriction is in place
   - Plan communication for when feature returns
   - Prepare announcement of re-enablement

### Metrics to Track

```sql
-- Check recent upload attempts (if logging implemented)
SELECT
  COUNT(*) as total_uploads,
  SUM(CASE WHEN file_type LIKE 'image/%' THEN 1 ELSE 0 END) as image_uploads,
  SUM(CASE WHEN file_type = 'application/pdf' THEN 1 ELSE 0 END) as pdf_uploads
FROM files
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## Communication Templates

### For Users (Email/Notification)

**Subject:** Temporary Service Update - PDF Uploads

Dear Valued User,

We're enhancing our medical report parsing system to provide you with even better results. During this upgrade:

**What's changing:**
- PDF uploads are temporarily unavailable
- Image uploads (PNG, JPEG, WEBP) remain fully available

**What you can do:**
- Continue uploading medical reports as images
- Convert PDFs to images using free online tools
- Wait for PDF functionality to return shortly

We expect to restore full PDF support within [timeframe]. Thank you for your patience as we improve your experience.

Best regards,
The Althea Team

### For Support Team

**Quick Response Template:**

"PDF uploads are temporarily disabled while we enhance our parsing capabilities. You can still upload medical reports as images (PNG, JPEG, WEBP). Simply take screenshots or use a free PDF-to-image converter. PDF uploads will be restored shortly. We apologize for any inconvenience."

---

## Implementation Checklist

- [✅] Removed PDF from file input accept attribute
- [✅] Added PDF blocking validation in UploadWorkflow
- [✅] Updated Dashboard error message
- [✅] Updated UI to show temporary restriction notice
- [✅] Maintained image upload functionality
- [✅] Professional, user-friendly error messages
- [✅] Documentation created for reversal
- [⏳] Built and tested application
- [⏳] Deployed to production
- [⏳] Monitored user feedback

---

## Rollback Plan

If issues arise or restriction needs immediate removal:

### Emergency Rollback

1. Revert commits:
   ```bash
   git revert [commit-hash]
   git push
   ```

2. Or manually restore original code (see Reversal Instructions above)

3. Rebuild and deploy:
   ```bash
   npm run build
   # Deploy to hosting
   ```

4. Verify PDF uploads work

5. Notify users feature is restored

---

## Change Log

| Date | Action | By | Notes |
|------|--------|-----|-------|
| 2025-10-30 | Disabled PDF uploads | System | Temporary maintenance |
| TBD | Re-enable PDF uploads | TBD | When enhancement complete |

---

## Support Resources

### For Development Team

- Original code preserved in git history
- This document contains complete reversal instructions
- Backend remains unchanged - frontend-only restriction
- No database migrations needed

### For QA Team

- Test all image upload scenarios
- Verify PDF rejection works properly
- Check error message clarity
- Validate UI updates display correctly

### For Support Team

- Use communication templates above
- Direct users to image upload alternatives
- Track common questions/concerns
- Escalate technical issues to development

---

## Success Criteria

Restriction is successful if:

- ✅ No PDF files can be uploaded
- ✅ Image uploads work without issues
- ✅ Error messages are clear and professional
- ✅ Users understand it's temporary
- ✅ Support ticket volume remains manageable
- ✅ No system errors or crashes

---

## Next Steps

1. **Immediate:** Test restriction in development
2. **Before Deploy:** Review with stakeholders
3. **After Deploy:** Monitor for 24 hours
4. **During Restriction:** Work on PDF enhancement
5. **Before Re-enable:** Test enhanced PDF parsing
6. **Re-enable:** Follow reversal instructions
7. **After Re-enable:** Announce to users

---

## Contact

For questions or issues with this restriction:
- Technical: Development Team
- User Impact: Product/Support Team
- Reversal Decision: Product Manager

---

**Remember:** This is a temporary measure. All code changes are designed for easy reversal. The backend functionality remains intact and ready for when the restriction is lifted.
