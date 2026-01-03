# WhatsApp Import Feature - Quick Start

## What It Does
Allows admins to import property listings from WhatsApp group chat exports directly into the database.

## Quick Access
1. Login as admin
2. Click "لوحة التحكم" (Admin Dashboard)
3. Click "📥 استيراد من واتساب" (Import from WhatsApp)
4. Paste WhatsApp chat export
5. Click "✅ استيراد" (Import)

## Example Chat Format
```
[15/12/2024, 10:30:00] أحمد محمد: شقة للبيع في العاشر من رمضان 120 متر 01234567890
[15/12/2024, 10:35:12] محمود علي: مطلوب فيلا للإيجار في التجمع الخامس
[15/12/2024, 11:00:45] سارة أحمد: دوبلكس معروض للبيع +201098765432
```

## What Gets Extracted Automatically
- ✅ Property type (شقة, فيلا, دوبلكس, محل, etc.)
- ✅ Category (معروض, مطلوب)
- ✅ Purpose (بيع, إيجار)
- ✅ Region (if mentioned, defaults to العاشر من رمضان)
- ✅ Sender name
- ✅ Mobile number (all formats: 01xxx, +201xxx, 00201xxx)

## Privacy & Security
- 🔒 Admin-only feature
- 🔒 Mobile numbers automatically masked for non-approved users
- 🔒 Secure database insertion
- 🔒 No vulnerabilities (CodeQL verified)

## Full Documentation
See [WHATSAPP_IMPORT_GUIDE.md](./WHATSAPP_IMPORT_GUIDE.md) for complete instructions.

## Technical Details
- **API Endpoint**: `/api/import-whatsapp.js`
- **UI Component**: `AdminDashboard.js`
- **Default Region**: العاشر من رمضان (10th Ramadan)
- **Source Tag**: `whatsapp_import`

## Support
For issues or questions, refer to the troubleshooting section in the full guide.
