# WhatsApp Import Feature - User Guide

## Overview
The WhatsApp Import feature allows administrators to import property listings from exported WhatsApp group chats directly into the database. This streamlines the process of adding multiple property listings at once.

## Prerequisites
- Admin access to the system
- WhatsApp group chat export file

## How to Export WhatsApp Chat

### On Android:
1. Open the WhatsApp group
2. Tap the three dots (⋮) menu
3. Select "More" → "Export chat"
4. Choose "Without Media"
5. The chat will be saved as a `.txt` file

### On iOS:
1. Open the WhatsApp group
2. Tap the group name at the top
3. Scroll down and tap "Export Chat"
4. Choose "Without Media"
5. Save or share the text file

## Supported Chat Format

The import feature supports standard WhatsApp export format:

```
[DD/MM/YYYY, HH:MM:SS] Sender Name: Message content
```

Or the alternative format:

```
DD/MM/YYYY, HH:MM - Sender Name: Message content
```

### Example Chat Export:
```
[15/12/2024, 10:30:00] أحمد محمد: شقة للبيع في العاشر من رمضان 120 متر اتصل 01234567890
[15/12/2024, 10:35:12] محمود علي: مطلوب فيلا للإيجار في التجمع الخامس
[15/12/2024, 11:00:45] سارة أحمد: دوبلكس معروض للبيع +201098765432 موقع مميز
15/12/2024, 14:20 - خالد حسن: محل تجاري للإيجار 00201156789012
```

## How to Import

1. **Login as Admin**
   - Ensure you are logged in with an admin account

2. **Open Admin Dashboard**
   - Click on the "لوحة التحكم" (Admin Dashboard) button

3. **Click Import Button**
   - Look for the green "📥 استيراد من واتساب" (Import from WhatsApp) button
   - Click it to open the import modal

4. **Paste Chat Content**
   - Copy the content from your WhatsApp export file
   - Paste it into the text area in the modal

5. **Start Import**
   - Click "✅ استيراد" (Import) button
   - Wait for the import to complete

6. **Review Results**
   - A summary will show:
     - Total messages parsed
     - Successfully imported messages
     - New senders created
     - Any errors encountered

## What Gets Extracted

### Automatic Detection:

1. **Property Category** (معروض/مطلوب)
   - "معروض" - for listings (properties for sale/rent)
   - "مطلوب" - for wanted/requests

2. **Property Type**
   - شقة (Apartment)
   - فيلا (Villa)
   - دوبلكس (Duplex)
   - محل (Shop)
   - مكتب (Office)
   - أرض (Land)
   - عمارة (Building)
   - بنتهاوس (Penthouse)

3. **Purpose** (بيع/إيجار)
   - بيع (For Sale)
   - إيجار (For Rent)

4. **Region**
   - Automatically detected if mentioned in message
   - Common regions: التجمع الخامس, التجمع الثالث, الشيخ زايد, etc.
   - Default: العاشر من رمضان (10th of Ramadan)

5. **Mobile Number**
   - Supports formats:
     - 01234567890
     - +201234567890
     - 00201234567890
   - Automatically normalized to 01xxxxxxxxx format

### Sender Information:
- Sender name from WhatsApp
- Mobile number (if found in message)
- First seen date

## Privacy & Security

✅ **Mobile numbers are automatically masked** for non-approved users
✅ **Only admin can import** data
✅ **Sender information** is stored separately for better organization
✅ **No duplicate senders** - system automatically links messages to existing senders

## Best Practices

1. **Review the chat export** before importing to ensure it contains relevant property listings

2. **Clean up the text** if needed:
   - Remove system messages
   - Remove non-property related messages
   - Keep only actual listings

3. **Check for duplicates** after import:
   - Use the "🗑️ حذف المكررات" (Remove Duplicates) button if needed

4. **Verify imported data**:
   - Check the first tab (العاشر من رمضان) to see imported messages
   - Ensure property details were extracted correctly

## Troubleshooting

### No messages parsed
**Problem**: The import returns 0 messages parsed
**Solution**: 
- Verify the text is in WhatsApp export format
- Check that lines start with date and time
- Ensure sender names are followed by a colon (:)

### Mobile numbers not extracted
**Problem**: Some messages don't have mobile numbers
**Solution**: 
- Ensure mobile numbers are in the message content
- Check format (01xxxxxxxxx, +201xxxxxxxxx, or 00201xxxxxxxxx)
- Numbers must be 11 digits (Egyptian format)

### Wrong property type detected
**Problem**: Property type is incorrect
**Solution**: 
- Include property type keywords in Arabic (شقة, فيلا, etc.)
- Make sure the keyword is spelled correctly
- You can edit messages after import if needed

### Import errors
**Problem**: Import shows errors
**Solution**: 
- Check database connection
- Verify admin permissions
- Review browser console for detailed error messages

## Technical Details

- **Default Region**: All imported messages default to "العاشر من رمضان" unless another region is detected
- **Source File**: All imports are tagged with "whatsapp_import" as the source
- **Message IDs**: Automatically generated as `whatsapp_{timestamp}_{random}`
- **Date Format**: Preserves the original WhatsApp date format (DD/MM/YYYY)

## Example Workflow

1. Export WhatsApp group chat (without media)
2. Login as admin
3. Open Admin Dashboard
4. Click "Import from WhatsApp"
5. Paste chat content
6. Click "Import"
7. Review import statistics
8. Check messages in the main tab
9. Remove duplicates if needed
10. Approve users who need access to see contact details

## Support

If you encounter issues not covered in this guide:
1. Check the browser console for errors
2. Verify database connectivity
3. Ensure you have admin privileges
4. Contact system administrator

---

**Created**: January 2026
**Version**: 1.0
