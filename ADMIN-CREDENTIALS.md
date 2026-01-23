# Admin User Credentials

## Default Admin Account

**Username**: `xinreal`  
**Password**: `zerocall`  
**Role**: Admin  
**Status**: Active ✅

## Login URL

Frontend: http://localhost:3000  
Click "تسجيل الدخول" (Login) button

## Admin Privileges

With this account you can:
- ✅ View all messages with contact information
- ✅ Access Admin Dashboard
- ✅ Manage users (activate/deactivate)
- ✅ View user statistics
- ✅ Full CRUD operations on all data

## Quick Test

Login via API:
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"xinreal","password":"zerocall"}'
```

Expected response:
```json
{
  "success": true,
  "token": "...",
  "user": {
    "username": "xinreal",
    "role": "admin",
    "isActive": true
  }
}
```

## Database Details

```sql
-- View user details
SELECT mobile, name, role, is_active FROM users WHERE mobile = 'xinreal';

-- Change password
UPDATE users 
SET password = SHA2(CONCAT('new_password', 'reallisting_secret_key_2025_secure'), 256)
WHERE mobile = 'xinreal';
```

## Notes

- Password is hashed with SHA256
- Account is pre-activated (is_active = TRUE)
- Has full admin privileges
- Can access all features immediately

---

**Status**: ✅ Admin account created and verified!
