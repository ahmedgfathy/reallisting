# Contact Information Cleaning

This directory contains scripts to remove contact information (mobile numbers, phone numbers, security codes) from the database.

## What Gets Removed

The enhanced cleaning process removes:

1. **Security Code Messages**: Messages like "Your security code with ~ 201279233999 changed"
2. **Mobile Numbers** in various formats:
   - `01xxxxxxxxx` (Egyptian format)
   - `+201xxxxxxxxx` (International format)
   - `201xxxxxxxxx` (Without + prefix)
   - `1xxxxxxxxx` (Without country code)
3. **Arabic Digit Phone Numbers**: `٠١٢٣٤٥٦٧٨٩٠`
4. **Contact Patterns**: Text like "Call: 01234567890", "WhatsApp: 01234567890", etc.

## Scripts

### 1. Enhanced One-Time Cleanup Script

**File**: `clean-contact-info-enhanced.js`

Performs a comprehensive cleanup of both messages and properties tables.

**Usage**:
```bash
node clean-contact-info-enhanced.js
```

**What it does**:
- Cleans the `messages` table: Removes contact info from message text
- Cleans the `glomar_properties` table:
  - Removes contact info from `description` field
  - Removes contact info from `note` field
  - Clears `mobileno` field entirely
  - Clears `tel` field entirely

### 2. Automated Cron Job

**File**: `api/clean-mobiles-cron.js`

Runs automatically every hour via Vercel Cron to clean recent messages.

**Endpoint**: `/api/clean-mobiles-cron`

**What it does**:
- Scans messages created in the last 2 hours
- Removes contact information using enhanced patterns
- Updates only messages that contain contact info

**Manual trigger** (requires authentication):
```bash
curl -X GET https://your-domain.com/api/clean-mobiles-cron \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 3. Test Suite

**File**: `test-clean-patterns.js`

Validates that the cleaning patterns work correctly.

**Usage**:
```bash
node test-clean-patterns.js
```

**Tests include**:
- Security code message removal
- Egyptian mobile number formats
- International mobile formats
- Arabic digit sequences
- Multiple mobiles in one text
- Text without contact info (should remain unchanged)

## API Changes

The following API endpoints have been updated to prevent exposure of contact information:

### `/api/glomar-property-detail`
- Excludes `mobileno` and `tel` fields from response
- Contact information in `description` and `note` should be cleaned via the cleanup script

### `/api/glomar-properties`
- Excludes `mobileno` and `tel` fields from all property listings
- Returns sanitized property data only

## Important Notes

1. **Database Updates**: The cleanup script modifies the database directly. Always backup your data before running.

2. **Pattern Preservation**: The script only modifies text when contact information is detected. Clean text remains unchanged.

3. **Regular Execution**: The cron job runs hourly to catch new messages automatically.

4. **One-Time Cleanup**: Run `clean-contact-info-enhanced.js` once to clean existing data in the database.

## Running the One-Time Cleanup

1. Ensure you have the latest code
2. Install dependencies: `npm install`
3. Run the cleanup script: `node clean-contact-info-enhanced.js`
4. Monitor the output to see progress

Expected output:
```
🚀 Enhanced Contact Information Cleanup

Removing:
  • Security code messages
  • Mobile numbers (all formats)
  • Arabic digit phone numbers
  • Contact information patterns

🧹 Cleaning messages table...
Messages - Processed: 1,000 | Cleaned: 150 | Speed: 100/s
...

🧹 Cleaning properties table...
Properties - Processed: 500 | Cleaned: 75 | Speed: 50/s
...

✅ CLEANUP COMPLETED
═══════════════════════════════════════
Total time: 25.3s

Messages:
  Processed: 50,000
  Cleaned: 2,500

Properties:
  Processed: 10,000
  Cleaned: 500
```

## Maintenance

The automated cron job will handle new messages going forward. You only need to run the one-time cleanup script when:

1. First deploying this feature
2. After a data migration
3. If you suspect old contact information still exists
