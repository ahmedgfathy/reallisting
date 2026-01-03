# Sender Table Migration Guide

## 🎯 Purpose

Extract phone numbers from message content and store them in a separate `sender` table with proper relationships. This:
- ✅ Normalizes contact data
- ✅ Links multiple messages to same sender
- ✅ Removes duplicate mobile numbers
- ✅ Keeps message content clean
- ✅ Enables sender-based queries and analytics

## 📋 What This Does

### Before Migration:
```
messages table:
- id: "msg123"
- message: "شقة للبيع 01234567890 اتصل الآن"
- mobile: "01234567890"
- name: "Ahmed"
```

### After Migration:
```
sender table:
- id: 1
- mobile: "01234567890"
- name: "Ahmed"
- first_seen_date: "01/12/2024"

messages table:
- id: "msg123"
- message: "شقة للبيع اتصل الآن"  (cleaned)
- sender_id: 1  (foreign key)
- mobile: "01234567890"  (kept for reference)
```

## 🚀 How to Run

### Step 1: Run SQL Migration

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the entire contents of:
   ```
   scripts/database-scripts/create-sender-table-migration.sql
   ```
4. Paste into SQL Editor
5. Click **Run**

This will:
- ✅ Create `sender` table
- ✅ Add `sender_id` to messages table
- ✅ Extract phone numbers from messages
- ✅ Populate sender table
- ✅ Link messages to senders
- ✅ Create helper functions and views
- ✅ Set up indexes and security policies

**Time**: ~30-60 seconds for 54k messages

### Step 2: Verify Migration

Run the verification script:
```bash
node scripts/database-scripts/verify-sender-migration.js
```

This shows:
- ✅ Sender table status
- ✅ Sample senders
- ✅ Message linking statistics
- ✅ View functionality

## 📊 Database Schema

### sender Table
```sql
CREATE TABLE sender (
  id SERIAL PRIMARY KEY,
  name TEXT,
  mobile TEXT UNIQUE NOT NULL,
  first_seen_date TEXT,
  first_seen_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### messages Table (Updated)
```sql
ALTER TABLE messages 
ADD COLUMN sender_id INTEGER REFERENCES sender(id);
```

### Relationship
```
sender (1) ----< (many) messages
One sender can have many messages
```

## 🔍 What Gets Extracted

The migration extracts Egyptian mobile numbers in these formats:
- `01xxxxxxxxx` (11 digits starting with 01)
- `+201xxxxxxxxx` (international format)
- Any 11-digit number starting with 01

From:
- ✅ Message content text
- ✅ `mobile` field in messages table
- ✅ Both sources combined

## 📈 Expected Results

For 54,567 messages:
- **Unique senders**: ~5,000-10,000 (many messages per sender)
- **Messages linked**: 80-90%
- **Processing time**: 30-60 seconds

## 🛠️ Helper Functions Created

### 1. extract_egyptian_mobile(text)
```sql
SELECT extract_egyptian_mobile('اتصل على 01234567890 الآن');
-- Returns: '01234567890'
```

### 2. get_or_create_sender(mobile, name, date)
```sql
SELECT get_or_create_sender('01234567890', 'Ahmed', '01/12/2024');
-- Returns: sender_id (creates if doesn't exist)
```

### 3. clean_message_content()
```sql
SELECT clean_message_content();
-- Removes phone numbers from all message content
```

### 4. messages_with_sender View
```sql
SELECT * FROM messages_with_sender 
WHERE sender_mobile = '01234567890';
```

This view joins messages with sender info for easy queries.

## 🔄 Optional: Clean Message Content

If you want to remove phone numbers from message text:

Uncomment this line in the SQL migration (Step 10):
```sql
SELECT clean_message_content();
```

**⚠️ Warning**: This is irreversible! Make sure you have backups.

## 📱 Using in API

Update your API endpoints to use sender relationships:

```javascript
// Example: Get messages with sender info
const { data: messages } = await supabase
  .from('messages_with_sender')
  .select('*')
  .eq('sender_mobile', '01234567890');

// Example: Get all messages from a sender
const { data: messages } = await supabase
  .from('messages')
  .select('*, sender(*)')
  .eq('sender_id', 123);

// Example: Get sender with all their messages
const { data: sender } = await supabase
  .from('sender')
  .select(`
    *,
    messages (*)
  `)
  .eq('id', 123)
  .single();
```

## 🔐 Privacy & Security

The migration:
- ✅ Keeps RLS (Row Level Security) enabled
- ✅ Sets proper read policies for public users
- ✅ Restricts write access to service role only
- ✅ Maintains existing privacy settings

**Note**: Only active subscribed users see sender mobile in your frontend.

## 🐛 Troubleshooting

### Issue: "relation sender does not exist"
**Solution**: Run the SQL migration first in Supabase SQL Editor

### Issue: "No messages linked to sender"
**Solution**: 
1. Check if messages have mobile numbers
2. Run verification script to see statistics
3. Check message format matches Egyptian mobile pattern

### Issue: "Duplicate key value violates unique constraint"
**Solution**: Sender table already populated, it's safe to ignore

### Issue: Want to re-run migration
**Solution**:
```sql
-- Drop and recreate
DROP TABLE IF EXISTS sender CASCADE;
-- Then run full migration again
```

## 📊 Analytics Queries

With sender table, you can now run powerful queries:

```sql
-- Most active senders
SELECT 
  s.mobile,
  s.name,
  COUNT(m.id) as message_count
FROM sender s
LEFT JOIN messages m ON m.sender_id = s.id
GROUP BY s.id, s.mobile, s.name
ORDER BY message_count DESC
LIMIT 10;

-- Messages per day by sender
SELECT 
  s.mobile,
  m.date_of_creation,
  COUNT(*) as daily_count
FROM sender s
JOIN messages m ON m.sender_id = s.id
GROUP BY s.mobile, m.date_of_creation
ORDER BY m.date_of_creation DESC;

-- Senders by region
SELECT 
  m.region,
  COUNT(DISTINCT m.sender_id) as unique_senders,
  COUNT(m.id) as total_messages
FROM messages m
WHERE m.sender_id IS NOT NULL
GROUP BY m.region
ORDER BY unique_senders DESC;
```

## ✅ Verification Checklist

After migration, verify:
- [ ] sender table exists with data
- [ ] messages table has sender_id column
- [ ] Foreign key relationship works
- [ ] messages_with_sender view accessible
- [ ] Helper functions work
- [ ] Statistics match expected (80-90% linked)
- [ ] Frontend still works
- [ ] No data loss occurred

## 🔄 Future Imports

When importing new messages:

```javascript
// 1. Extract mobile from message
const mobile = message.match(/\b01[0-9]{9}\b/)?.[0];

// 2. Get or create sender
const { data: sender } = await supabase
  .rpc('get_or_create_sender', {
    p_mobile: mobile,
    p_name: name,
    p_date: dateOfCreation
  });

// 3. Insert message with sender_id
await supabase
  .from('messages')
  .insert({
    message: cleanedMessage,
    sender_id: sender,
    date_of_creation: dateOfCreation,
    // ... other fields
  });
```

## 📞 Support

If you encounter issues:
1. Check Supabase logs
2. Run verification script
3. Check SQL migration output
4. Verify data in Supabase dashboard

Migration created by: GitHub Copilot
Date: January 1, 2026
