# Security Improvements

This document outlines the security improvements that have been applied to the Divergram project.

## Applied Security Fixes

### 1. Foreign Key Indexes (✅ Completed)

**Issue:** Multiple tables had foreign key columns without covering indexes, leading to suboptimal query performance.

**Solution:** Added indexes for all foreign key columns to improve JOIN performance and foreign key constraint checking.

**Migration:** `add_missing_foreign_key_indexes`

**Indexes Added:**

| Table | Index Name | Column |
|-------|------------|--------|
| `comments` | `idx_comments_user_id` | `user_id` |
| `highlight_stories` | `idx_highlight_stories_story_id` | `story_id` |
| `likes` | `idx_likes_user_id` | `user_id` |
| `messages` | `idx_messages_room_id` | `room_id` |
| `messages` | `idx_messages_sender_id` | `sender_id` |
| `notifications` | `idx_notifications_actor_id` | `actor_id` |
| `participants` | `idx_participants_user_id` | `user_id` |
| `reports` | `idx_reports_user_id` | `user_id` |
| `stories` | `idx_stories_user_id` | `user_id` |
| `story_highlights` | `idx_story_highlights_user_id` | `user_id` |
| `story_views` | `idx_story_views_viewer_id` | `viewer_id` |

**Benefits:**
- Faster JOIN operations between tables
- Improved foreign key constraint checking performance
- Better query optimization for WHERE clauses using these columns
- Reduced full table scan operations
- Significant performance improvements for queries involving these foreign keys

**Verification:**
```sql
-- Check that all indexes were created
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

---

### 2. Password Breach Protection (⚠️ Requires Manual Configuration)

**Issue:** Supabase Auth's password breach protection was not enabled, allowing users to potentially use compromised passwords.

**Solution:** Enable password breach protection to check passwords against the HaveIBeenPwned.org database.

**Migration:** `enable_password_breach_protection` (documentation only)

**How to Enable:**

#### Option 1: DB Admin Dashboard (Recommended)

1. Open your [DB Admin Dashboard]((internal-db))
2. Select your project
3. Navigate to **Authentication** → **Policies** (or **Configuration**)
4. Look for **"Password Protection"** or **"Security"** section
5. Enable **"Check for leaked passwords"** or similar option
6. Click **Save**

#### Option 2: Using Supabase API (if available)

If you have API access to auth configuration:

```bash
# This may require project owner permissions
curl -X PATCH 'http://127.0.0.1:4000/auth/v1/admin/config' \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"password_breach_check_enabled": true}'
```

**How It Works:**

1. When a user signs up or changes their password, the password is hashed using SHA-1
2. The first 5 characters of the hash are sent to HaveIBeenPwned.org (k-anonymity model)
3. HaveIBeenPwned returns a list of hash suffixes that match the prefix
4. Supabase checks if the full password hash appears in the list
5. If found, the signup/password change is rejected with a clear error message

**Privacy & Security:**

- ✅ Only the first 5 characters of the password hash are transmitted
- ✅ The actual password is never sent to external services
- ✅ No personally identifiable information is shared
- ✅ All API calls are encrypted with HTTPS
- ✅ Uses k-anonymity model to preserve privacy

**User Experience:**

When a user tries to use a compromised password, they will see:
```
Error: This password has appeared in a data breach. Please choose a different password.
```

**Testing:**

After enabling, test with a known breached password (e.g., "password123") to verify the feature is working:

```javascript
const { error } = await db.auth.signUp({
  email: 'test@example.com',
  password: 'password123' // This should fail
});

console.log(error); // Should show breach detection error
```

**Benefits:**
- Prevents users from creating accounts with compromised passwords
- Protects users from credential stuffing attacks
- Enhances overall application security
- No additional code changes required
- Automatic protection for all new users and password changes

---

## Security Best Practices

### Already Implemented

1. ✅ **Row Level Security (RLS)** - All tables have RLS policies enabled
2. ✅ **Foreign Key Indexes** - All foreign keys are properly indexed
3. ✅ **Password Hashing** - Supabase Auth uses bcrypt for password hashing
4. ✅ **JWT Authentication** - Secure token-based authentication
5. ✅ **HTTPS Only** - All API calls use HTTPS encryption
6. ✅ **Input Validation** - Client-side and server-side validation
7. ✅ **File Size Limits** - 50MB limit on file uploads

### Recommended Additional Steps

1. **Enable Multi-Factor Authentication (MFA)**
   - Go to Authentication → Settings in DB Admin Dashboard
   - Enable MFA for enhanced security

2. **Set Up Rate Limiting**
   - Configure rate limits in DB Admin Dashboard
   - Protect against brute force attacks

3. **Regular Security Audits**
   - Review RLS policies periodically
   - Check for unused indexes
   - Monitor authentication logs

4. **Environment Variable Security**
   - Never commit `.env` files to version control
   - Use different API keys for development and production
   - Rotate API keys regularly

5. **Content Security Policy (CSP)**
   - Consider adding CSP headers for XSS protection
   - Configure in Firebase hosting or CDN

6. **Regular Dependency Updates**
   - Run `npm audit` regularly
   - Update dependencies to patch security vulnerabilities

---

## Monitoring & Maintenance

### Check Security Status

```sql
-- Verify all RLS policies are enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check for tables without RLS
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;

-- List all foreign key indexes
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename;
```

### Performance Monitoring

```sql
-- Check index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Identify slow queries (if pg_stat_statements is enabled)
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Summary

### Completed
- ✅ Added 11 foreign key indexes for improved query performance
- ✅ Created migration for password breach protection feature
- ✅ Documented security improvements and best practices

### Required Action
- ⚠️ **Enable password breach protection in DB Admin Dashboard**
  - Go to Authentication → Policies
  - Enable "Check for leaked passwords"
  - Save changes

### Impact
- 🚀 **Performance:** Significantly improved query performance for foreign key lookups
- 🔒 **Security:** Enhanced password security (once breach protection is enabled)
- 📊 **Scalability:** Better database performance as data grows
- 🛡️ **Protection:** Reduced risk of compromised passwords

---

## Questions?

If you have questions about these security improvements or need help implementing them, please refer to:
- [Internal DB/Auth Security Notes](https://owasp.org/www-project-top-ten/)
- [HaveIBeenPwned API](https://haveibeenpwned.com/API/v3)
- [PostgreSQL Index Documentation](https://www.postgresql.org/docs/current/indexes.html)
