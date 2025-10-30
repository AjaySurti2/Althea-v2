# PDF Upload Guide - Althea Health Report Interpreter

## What's New!

Althea now supports **direct PDF uploads** for your medical reports! No more converting PDFs to images.

---

## Supported File Formats

### Images
- PNG, JPEG, WEBP
- Maximum size: 10 MB per file
- Best for: Screenshots, single-page reports

### PDFs
- Medical reports and lab results
- Maximum size: 20 MB per file
- Best for: Multi-page reports, original documents

---

## Upload Limits

- **Files per session:** Up to 5 files
- **Processing time:** 30-70 seconds for 5 files
- **Concurrent processing:** 3 files at a time for speed

---

## How to Upload Medical Reports

### Step 1: Prepare Your Files

**For best results:**
- Keep PDFs under 10 pages for faster processing
- Use high-quality scans (300 DPI recommended)
- Ensure PDFs are not password-protected
- Check files are not corrupted before uploading

### Step 2: Upload Files

1. Click "Upload Health Report" in dashboard
2. Select up to 5 files (mix of images and PDFs is fine)
3. Review selected files - you'll see a badge showing "PDF" or "IMAGE"
4. Click "Next: Review"

### Step 3: Processing

- Files are processed in parallel (3 at a time)
- You'll see a progress spinner
- Processing typically takes 30-70 seconds
- If timeout occurs, successfully processed files are saved

---

## Processing Time Estimates

| Scenario | Estimated Time |
|----------|---------------|
| 1 image file | 15-25 seconds |
| 5 image files | 35-45 seconds |
| 1 PDF (1-3 pages) | 30-40 seconds |
| 5 PDFs (1-3 pages) | 60-70 seconds |
| Mix (3 images + 2 PDFs) | 50-60 seconds |

---

## Tips for Faster Processing

### Use Images When Possible
- Screenshots of single-page reports process faster than PDFs
- PNG/JPEG are processed 30-40% faster than PDF

### Split Large PDFs
- If you have a 20-page PDF, split it into 4-5 page chunks
- Most medical reports can be split by test type

### Upload in Batches
- If you have 10 reports, upload 5 now and 5 later
- This prevents timeout and ensures all files process successfully

---

## Common Issues and Solutions

### "File too large" Error

**Problem:** PDF exceeds 20MB limit

**Solutions:**
1. **Compress the PDF:**
   - Use online tools like smallpdf.com or ilovepdf.com
   - Reduce image quality if PDF contains scans
   - Target: 5-10MB per file

2. **Split the PDF:**
   - Use PDF splitting tools
   - Separate by test type or date
   - Upload as multiple files

3. **Convert to images:**
   - Take screenshots of each page
   - Save as PNG or JPEG
   - Each image will be under 2MB

### "Processing timeout" Warning

**Problem:** Processing took longer than 150 seconds

**What happened:** Some files were successfully processed, others were skipped

**Solutions:**
1. **Reduce file count:** Upload 2-3 files at a time
2. **Use smaller PDFs:** Split large PDFs into smaller files
3. **Convert to images:** Images process faster than PDFs
4. **Retry:** Successfully processed files are saved, upload remaining files

**Note:** Files that processed successfully are NOT lost. You can view them in your dashboard.

### "Failed to extract text" Error

**Problem:** PDF couldn't be read

**Possible causes:**
- PDF is password-protected (remove password first)
- PDF is corrupted (try opening it to verify)
- PDF contains only images with very low quality
- PDF is blank or empty

**Solutions:**
1. **Remove password protection**
2. **Try opening PDF to verify it's not corrupted**
3. **Re-scan with higher quality** if images are blurry
4. **Convert to high-quality images** as alternative

### "Unsupported format" Error

**Problem:** File type not recognized

**Solutions:**
- Ensure file extension is .png, .jpg, .jpeg, .webp, or .pdf
- Check file isn't corrupted
- Try saving file in supported format

---

## Best Practices

### File Naming
- Use descriptive names: "BloodTest_Jan2025.pdf"
- Avoid special characters
- Include date if possible

### File Organization
- Upload related tests together
- Group by date or provider
- Keep originals for your records

### Quality Guidelines
- **Scans:** 300 DPI minimum
- **Screenshots:** Full screen, clear text
- **PDFs:** Original from lab is best
- **Photos:** Good lighting, no glare

---

## Understanding Your Results

### After Upload
1. Files are processed in parallel for speed
2. You'll see "Parsed Data Review" screen
3. Verify extracted information is accurate
4. Continue to view AI-generated insights

### Partial Success
- If some files fail, successfully processed files are saved
- You'll see a summary: "4 of 5 files processed successfully"
- Failed files can be uploaded again separately
- No need to re-upload successful files

### Processing Summary
- ✓ Successfully processed files shown first
- ✗ Failed files listed with specific error
- Processing time displayed
- Option to retry failed files

---

## FAQ

**Q: Can I upload both PDFs and images together?**
A: Yes! You can upload any mix of supported formats up to 5 files total.

**Q: What happens if my PDF has 50 pages?**
A: Very large PDFs may timeout. We recommend splitting PDFs over 10 pages into smaller files.

**Q: Are my medical reports secure?**
A: Yes! All files are encrypted in storage, and only you can access them. We never share your medical data.

**Q: How long are my files stored?**
A: Files are stored in your account indefinitely until you delete them.

**Q: Can I download the PDF report later?**
A: Yes! You can download a formatted HTML report anytime from your dashboard.

**Q: What if I accidentally upload the wrong file?**
A: You can delete files before clicking "Next". After processing, delete from dashboard and re-upload correct file.

**Q: Do you support scanned handwritten reports?**
A: Yes! Our AI can read both typed and handwritten medical reports, though typed text has higher accuracy.

**Q: What languages are supported?**
A: Currently English. Multi-language support coming soon.

---

## Need Help?

### If you're experiencing issues:

1. **Check your internet connection**
2. **Verify files are not corrupted**
3. **Try uploading fewer files (2-3 at a time)**
4. **Check file sizes are within limits**
5. **Contact support** with:
   - Error message you received
   - File types you're uploading
   - Approximate file sizes
   - Browser you're using

### Still having problems?

**Email:** support@althea-health.com (replace with actual support contact)
**Include:** Screenshots of error messages and file details

---

## Technical Details

For developers and technical users:

**Processing Pipeline:**
1. File uploaded to Supabase Storage (encrypted)
2. Text extracted using OpenAI GPT-4o-mini Vision API
3. Medical data parsed into structured format
4. Results saved to database with RLS protection
5. AI insights generated from parsed data

**Parallel Processing:**
- Max 3 files processed concurrently
- Timeout protection at 120 seconds
- Partial results returned if timeout approaches
- Each file processed independently

**API Usage:**
- OpenAI GPT-4o-mini for text extraction
- OpenAI GPT-4o-mini for data parsing
- ~$0.005 per file processed
- No rate limits for typical usage

---

**Last Updated:** October 30, 2025
**Version:** 1.0.0

---

## Quick Start

1. **Click "Upload Health Report"**
2. **Select your medical files** (PDF, PNG, JPEG, or WEBP)
3. **Upload up to 5 files at once**
4. **Wait 30-70 seconds for processing**
5. **Review extracted data and AI insights**
6. **Download your personalized report**

It's that simple! Your medical reports are now in plain language you can understand.

---

**Althea - Your Personal Health Interpreter**
Making medical reports understandable for everyone.
