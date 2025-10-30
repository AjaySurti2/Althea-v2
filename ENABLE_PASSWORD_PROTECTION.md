# Enable Password Leak Protection - Action Required

## ⚠️ IMPORTANT: Manual Configuration Required

One security setting cannot be enabled via SQL migrations and requires manual action in the Supabase Dashboard.

---

## What This Does

**Password Leak Protection** prevents users from using passwords that have been exposed in data breaches by checking against the HaveIBeenPwned.org database.

### Benefits
- ✅ Prevents use of compromised passwords
- ✅ Enhances account security
- ✅ Reduces risk of credential stuffing attacks
- ✅ Recommended for HIPAA compliance
- ✅ Zero impact on user experience (only blocks known compromised passwords)

---

## Step-by-Step Instructions

### 1. Log in to Supabase Dashboard
Navigate to: [https://supabase.com/dashboard](https://supabase.com/dashboard)

### 2. Select Your Project
Choose the Althea project from your project list

### 3. Navigate to Authentication Settings
- Click **Authentication** in the left sidebar
- Click **Providers** tab
- Click on **Email** provider

### 4. Enable Password Protection
- Scroll down to the **Security Settings** section
- Find the option: **"Prevent users from using compromised passwords"**
- Toggle the switch to **ON** (enabled)

### 5. Save Changes
- Click **Save** button at the bottom of the page
- Wait for confirmation message

---

## Verification

After enabling, you can verify it's working by:

1. Attempting to create an account with a known compromised password (e.g., "password123")
2. You should receive an error: "Password has been found in a data breach"

---

## Impact on Users

### For New Users
- Will be prevented from using compromised passwords during signup
- Will see helpful error message prompting them to choose a different password

### For Existing Users
- Not affected unless they change their password
- When changing password, compromised passwords will be rejected

### No Performance Impact
- Check happens asynchronously
- Minimal delay (usually < 100ms)
- No impact on login speed

---

## Compliance Notes

This setting is **strongly recommended** for:
- ✅ HIPAA compliance
- ✅ SOC 2 compliance
- ✅ GDPR data protection requirements
- ✅ Healthcare data security best practices

---

## Alternative: API Configuration

If you prefer to enable this via API instead of the dashboard, use:

```bash
curl -X PATCH 'https://api.supabase.com/v1/projects/{project-ref}/config/auth' \
  -H "Authorization: Bearer {service-role-key}" \
  -H "Content-Type: application/json" \
  -d '{
    "SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION": true,
    "PASSWORD_MIN_LENGTH": 8,
    "PASSWORD_REQUIRED_CHARACTERS": "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    "SECURITY_HIBP_ENABLED": true
  }'
```

Replace:
- `{project-ref}` with your project reference
- `{service-role-key}` with your service role key

---

## Support

If you encounter any issues:
1. Check the Supabase documentation: [Auth Security Best Practices](https://supabase.com/docs/guides/auth/auth-password-reset)
2. Contact Supabase support through the dashboard
3. Review the [Supabase Community Forum](https://github.com/supabase/supabase/discussions)

---

## Status Checklist

- [ ] Logged into Supabase Dashboard
- [ ] Navigated to Authentication → Providers → Email
- [ ] Enabled "Prevent users from using compromised passwords"
- [ ] Saved changes
- [ ] Verified with test signup (optional)

---

**Priority:** 🟡 Medium (Should be completed within 24-48 hours)
**Difficulty:** ⭐ Very Easy (5 minutes)
**Impact:** 🔒 High Security Enhancement
