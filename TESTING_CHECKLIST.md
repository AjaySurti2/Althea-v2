# 🧪 Storage & Database Testing Checklist

## ✅ Automated Verification Complete

**Date**: October 16, 2025
**Status**: All automated checks passed

### System Health Summary
| Category | Metric | Value | Status |
|----------|--------|-------|--------|
| **Configuration** | medical-files bucket ready | YES | ✅ |
| **Configuration** | report-pdfs bucket ready | YES | ✅ |
| **Database Health** | Public Tables | 16 | ✅ |
| **Database Health** | Storage Buckets | 2 | ✅ |
| **Security** | RLS Enabled Tables | 17 | ✅ |
| **Security** | Storage Policies | 8 | ✅ |

---

## 🔍 Manual Testing Guide

### Test 1: File Upload Test
**Objective**: Verify users can upload files successfully

**Steps**:
1. Navigate to the application
2. Log in as a test user
3. Click "Upload Health Report"
4. Select a valid PDF or image file (under 50MB)
5. Click "Next" or "Upload"

**Expected Result**:
- ✅ File uploads without "Bucket not found" error
- ✅ Upload progress indicator shows
- ✅ Success message displayed
- ✅ File appears in user's file list

**If Test Fails**:
- Check browser console for errors
- Verify .env file has correct credentials
- Confirm user is authenticated
- Review Network tab for 400/404 errors

---

### Test 2: File Access Security Test
**Objective**: Verify users cannot access other users' files

**Steps**:
1. Log in as User A
2. Upload a test file
3. Note the file's storage path
4. Log out and log in as User B
5. Try to access User A's file path directly

**Expected Result**:
- ✅ User A can see their uploaded file
- ✅ User B cannot see User A's file
- ✅ Direct path access by User B is denied
- ✅ No files from other users appear in list

**If Test Fails**:
- Review RLS policies in database
- Check folder path structure includes user_id
- Verify authentication tokens are valid

---

### Test 3: File Type Validation Test
**Objective**: Verify only allowed file types can be uploaded

**Steps**:
1. Log in as a test user
2. Try to upload these file types:
   - ✅ PDF file (should work)
   - ✅ JPEG image (should work)
   - ✅ PNG image (should work)
   - ❌ MP3 audio file (should reject)
   - ❌ MP4 video file (should reject)
   - ❌ EXE executable (should reject)

**Expected Result**:
- ✅ Valid types upload successfully
- ✅ Invalid types show error message
- ✅ Error message is user-friendly

**If Test Fails**:
- Check bucket MIME type restrictions
- Verify frontend validation logic
- Review error messages for clarity

---

### Test 4: File Size Limit Test
**Objective**: Verify file size limits are enforced

**Steps**:
1. Log in as a test user
2. Try to upload:
   - ✅ 5MB PDF (should work)
   - ✅ 25MB PDF (should work)
   - ❌ 60MB PDF (should reject - over 50MB limit)

**Expected Result**:
- ✅ Files under 50MB upload successfully
- ✅ Files over 50MB are rejected
- ✅ Clear error message about size limit

**If Test Fails**:
- Verify bucket file_size_limit setting
- Check frontend file size validation
- Review error handling in upload code

---

### Test 5: Download & View Test
**Objective**: Verify users can download and view their files

**Steps**:
1. Log in as a test user
2. Upload a test PDF file
3. Navigate to file list/dashboard
4. Click to view or download the file

**Expected Result**:
- ✅ File downloads successfully
- ✅ File opens in browser (for PDFs/images)
- ✅ File content is intact and correct
- ✅ No corruption or errors

**If Test Fails**:
- Check storage path in database matches actual storage
- Verify download URL generation
- Check CORS settings if cross-origin

---

### Test 6: File Deletion Test
**Objective**: Verify users can delete their own files

**Steps**:
1. Log in as a test user
2. Upload a test file
3. Locate the file in the file list
4. Click delete/remove button
5. Confirm deletion

**Expected Result**:
- ✅ File is removed from file list
- ✅ File is deleted from storage bucket
- ✅ Database record is updated/removed
- ✅ Confirmation message shown

**If Test Fails**:
- Check RLS delete policies
- Verify cascade delete configuration
- Review frontend delete handler

---

### Test 7: Multi-File Upload Test
**Objective**: Verify multiple files can be uploaded in one session

**Steps**:
1. Log in as a test user
2. Select 3-5 files at once
3. Upload all files together

**Expected Result**:
- ✅ All files upload successfully
- ✅ Progress shown for each file
- ✅ All files appear in file list
- ✅ Session ID links all files together

**If Test Fails**:
- Check session management in database
- Verify file array handling in code
- Review transaction handling for multi-uploads

---

### Test 8: Error Recovery Test
**Objective**: Verify graceful handling of errors

**Steps**:
1. Temporarily disconnect from internet
2. Try to upload a file
3. Reconnect to internet
4. Try uploading again

**Expected Result**:
- ✅ Offline error message displayed
- ✅ Upload button re-enabled after reconnect
- ✅ Retry works successfully
- ✅ No corrupted data in database

**If Test Fails**:
- Review error handling code
- Check loading state management
- Verify retry logic exists

---

### Test 9: Profile Update Test
**Objective**: Verify profile updates work with new schema

**Steps**:
1. Log in as a test user
2. Go to profile settings
3. Update full name
4. Add date of birth
5. Save changes

**Expected Result**:
- ✅ Changes save successfully
- ✅ Success message displayed
- ✅ Date of birth field works (new field)
- ✅ Changes persist after page refresh

**If Test Fails**:
- Verify `date_of_birth` column exists in profiles table
- Check profile update mutation
- Review form validation

---

### Test 10: End-to-End Workflow Test
**Objective**: Complete full user journey

**Steps**:
1. Sign up as new user
2. Complete profile with date of birth
3. Upload 2-3 medical documents
4. View uploaded documents
5. Generate a report
6. Download the report
7. Delete one document
8. Log out and log back in

**Expected Result**:
- ✅ All steps complete without errors
- ✅ Data persists correctly
- ✅ Session management works
- ✅ User experience is smooth

**If Test Fails**:
- Review specific step that failed
- Check integration between components
- Verify session persistence

---

## 🔧 SQL Test Queries

Run these in Supabase SQL Editor to verify database state:

### Check Bucket Configuration
```sql
SELECT
  id,
  name,
  public,
  file_size_limit / 1048576 AS size_limit_mb,
  array_length(allowed_mime_types, 1) AS mime_types_count,
  created_at
FROM storage.buckets
ORDER BY created_at;
```

**Expected**: 2 rows (medical-files, report-pdfs)

### Check Storage Policies
```sql
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
```

**Expected**: 8 policies (4 for each bucket)

### Check User Files
```sql
-- Replace {user_id} with actual user ID
SELECT
  f.id,
  f.file_name,
  f.file_type,
  f.file_size / 1024 AS size_kb,
  f.storage_path,
  f.created_at
FROM files f
WHERE f.user_id = '{user_id}'
ORDER BY f.created_at DESC
LIMIT 10;
```

**Expected**: User's uploaded files appear

### Test RLS Policy
```sql
-- This should only return the authenticated user's files
SELECT
  bucket_id,
  name,
  (storage.foldername(name))[1] AS user_folder
FROM storage.objects
WHERE bucket_id = 'medical-files'
LIMIT 5;
```

**Expected**: Only files in user's folder visible

### Check Profile Updates
```sql
SELECT
  id,
  full_name,
  date_of_birth,
  company_name,
  phone,
  updated_at
FROM profiles
WHERE id = auth.uid();
```

**Expected**: User's profile with date_of_birth field

---

## 📊 Performance Tests

### Upload Speed Test
- **Small File** (1MB): Should complete < 2 seconds
- **Medium File** (10MB): Should complete < 10 seconds
- **Large File** (50MB): Should complete < 60 seconds

### Database Query Performance
```sql
EXPLAIN ANALYZE
SELECT * FROM files
WHERE user_id = '{user_id}'
ORDER BY created_at DESC
LIMIT 10;
```

**Expected**: Query time < 50ms with proper indexing

---

## ✅ Pre-Production Checklist

Before deploying to production, verify:

### Environment
- [ ] `.env` file has production Supabase credentials
- [ ] All environment variables are set correctly
- [ ] No development/test credentials in production

### Database
- [ ] All migrations applied successfully
- [ ] Storage buckets created (medical-files, report-pdfs)
- [ ] 8 storage RLS policies active
- [ ] All tables have RLS enabled
- [ ] Indexes created for performance

### Security
- [ ] RLS policies tested with multiple users
- [ ] Users cannot access other users' data
- [ ] File paths include user_id for isolation
- [ ] No public access to private buckets
- [ ] Authentication required for all operations

### Functionality
- [ ] File upload works end-to-end
- [ ] File download works correctly
- [ ] File deletion works properly
- [ ] Profile updates persist
- [ ] Session tracking functional
- [ ] Error messages user-friendly

### Performance
- [ ] Upload speeds acceptable
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Proper pagination implemented

### Monitoring
- [ ] Error logging configured
- [ ] Storage usage monitoring enabled
- [ ] Database performance monitoring active
- [ ] User activity tracking in place

---

## 🚨 Troubleshooting Guide

### "Bucket not found" Error Returns
**Cause**: Buckets deleted or migration rolled back
**Fix**:
```sql
-- Re-run bucket creation
SELECT * FROM storage.buckets;
-- If empty, re-apply create_storage_buckets migration
```

### "Permission denied" Error
**Cause**: RLS policies blocking access
**Fix**:
```sql
-- Check policies exist
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage';
-- Should return 8
-- If not, re-apply storage policies migration
```

### Files Upload But Don't Appear
**Cause**: Database record not created
**Fix**:
- Check files table has record
- Verify foreign key to sessions table
- Ensure user_id matches authenticated user

### Files Appear For Wrong User
**Cause**: RLS policies not working
**Fix**:
- Verify RLS enabled on storage.objects
- Check policy uses auth.uid() correctly
- Test with different users to confirm isolation

---

## 📞 Support Contacts

**Database Issues**: Check Supabase Dashboard → Database
**Storage Issues**: Check Supabase Dashboard → Storage
**Auth Issues**: Check Supabase Dashboard → Authentication

**Emergency SQL to Check Everything**:
```sql
-- One query to check everything
SELECT
  (SELECT COUNT(*) FROM storage.buckets) AS buckets,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage') AS storage_policies,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') AS public_tables,
  (SELECT COUNT(*) FROM pg_tables t JOIN pg_class c ON c.relname = t.tablename
   WHERE t.schemaname = 'public' AND c.relrowsecurity = true) AS rls_enabled_tables;
```

**Expected Result**: `buckets=2, storage_policies=8, public_tables=16, rls_enabled_tables=17`

---

**Last Updated**: October 16, 2025
**Status**: All automated checks passed ✅
**Manual Testing**: Ready to begin
