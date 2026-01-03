# WhatsApp Chat File Upload System - Setup Guide

## 🎯 Overview
System to upload WhatsApp chat TXT files directly from the frontend, store them in Supabase Storage, and automatically process them into the `messages` and `sender` tables.

---

## 📋 Setup Steps

### 1. **Run SQL Migration**

Open Supabase Dashboard → SQL Editor and run:
```bash
scripts/database-scripts/chat-uploads-table.sql
```

This creates:
- ✅ `chat_uploads` table (tracks upload history)
- ✅ `whatsapp-chats` storage bucket
- ✅ Storage policies for authenticated users

### 2. **Verify Storage Bucket**

Go to: **Supabase Dashboard → Storage**

You should see a bucket named `whatsapp-chats`. If not:
1. Click "New Bucket"
2. Name: `whatsapp-chats`
3. Public: **NO** (keep private)
4. Click "Create Bucket"

### 3. **Deploy Code**

```bash
git add .
git commit -m "Add WhatsApp file upload system"
git push
```

Vercel will auto-deploy.

---

## 🚀 How to Use

### **For Admins:**

1. **Login as Admin**
2. **Open Admin Dashboard** (click your profile)
3. **Click "📥 استيراد من واتساب" button**
4. **Select .txt file** from your computer (WhatsApp exported chat)
5. **Click "استيراد"**
6. **Wait for processing** (progress bar shows status)
7. **View results** (messages imported, senders created)

### **WhatsApp Chat Export Format:**

```
[15/12/2024, 10:30:00] Ahmed: شقة للبيع في العاشر من رمضان 120 متر اتصل 01234567890
[15/12/2024, 10:35:00] Mohamed: مطلوب فيلا للإيجار
[15/12/2024, 11:00:00] Ali: دوبلكس للبيع 200 متر 01111111111
```

---

## 📁 Files Created/Modified

### **New API Endpoints:**
1. `/api/upload-whatsapp.js` - Uploads file to Supabase Storage
2. `/api/process-whatsapp.js` - Processes uploaded file and inserts into DB

### **Database:**
- `scripts/database-scripts/chat-uploads-table.sql` - SQL schema

### **Frontend:**
- `src/AdminDashboard.js` - Added file upload UI
- `src/AdminDashboard.css` - Added file upload styles

---

## 🗃️ Database Schema

### `chat_uploads` Table:
```sql
- id: SERIAL PRIMARY KEY
- filename: TEXT (original filename)
- file_path: TEXT (path in storage)
- uploaded_by: TEXT (admin mobile)
- status: TEXT (pending/processing/completed/failed)
- uploaded_at: TIMESTAMP
- processed_at: TIMESTAMP
- total_parsed: INTEGER
- total_imported: INTEGER
- senders_created: INTEGER
- errors: INTEGER
- error_message: TEXT
```

### Storage Bucket:
```
whatsapp-chats/
  ├── 01234567890/
  │   ├── 1704329400000_chat1.txt
  │   ├── 1704329500000_chat2.txt
  │   └── ...
  └── 01987654321/
      └── ...
```

---

## 🔄 Processing Flow

```
1. User selects .txt file
   ↓
2. Frontend reads file content
   ↓
3. POST /api/upload-whatsapp
   - Uploads to Supabase Storage
   - Creates record in chat_uploads table
   - Returns uploadId
   ↓
4. POST /api/process-whatsapp
   - Downloads file from storage
   - Parses WhatsApp format
   - Extracts: messages, contacts, property details
   - Inserts into messages + sender tables
   - Updates chat_uploads status
   ↓
5. Shows results to user
```

---

## ✅ What Gets Extracted

From each WhatsApp message:
- **Sender Info** → `sender` table (name, mobile, first_seen_date)
- **Message Content** → `messages` table
- **Property Details:**
  - Category (معروض/مطلوب)
  - Property Type (شقة/فيلا/دوبلكس/محل/etc)
  - Region (العاشر من رمضان/التجمع الخامس/etc)
  - Purpose (بيع/إيجار)
- **Mobile Numbers** (Egyptian format: 01xxxxxxxxx)

---

## 🐛 Troubleshooting

### **Error: "Failed to upload file"**
- Check Supabase Storage bucket exists
- Verify storage policies are set
- Check file size (max 10MB)

### **Error: "No messages parsed"**
- Verify WhatsApp export format
- File must be UTF-8 text
- Format: `[DD/MM/YYYY, HH:MM:SS] Name: Message`

### **Error: "Admin access required"**
- Only admins can upload
- Check user role in `users` table

---

## 📊 Monitor Uploads

View upload history in Supabase:

```sql
SELECT 
  filename,
  uploaded_by,
  status,
  total_imported,
  senders_created,
  uploaded_at
FROM chat_uploads
ORDER BY uploaded_at DESC;
```

---

## 🎉 Success!

Your WhatsApp chat upload system is now ready! Admins can upload .txt files directly and they'll be processed automatically into your database.
