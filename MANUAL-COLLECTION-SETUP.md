# Manual Collection Setup Guide

## Create Collections in Appwrite Console

Go to: https://cloud.appwrite.io/console/project-694ba83300116af11b75/databases/database-695a84140031c5a93745

---

## 1. Create "users" Collection

Click **"Create Collection"**
- Collection ID: `users`
- Collection Name: `Users`

**Add Attributes:**
- `mobile` (String, Size: 20, Required: Yes)
- `role` (String, Size: 20, Required: Yes)
- `isActive` (Boolean, Required: Yes)
- `name` (String, Size: 100, Required: No)
- `createdAt` (DateTime, Required: No)

**Set Permissions:**
- Click "Update Permissions"
- Add Role: **Any**
- Check: ✅ Create ✅ Read ✅ Update ✅ Delete
- Click Update

**Create Indexes:**
- Index 1: Key: `mobile`, Type: Key, Attributes: [mobile]
- Index 2: Key: `role`, Type: Key, Attributes: [role]

---

## 2. Create "messages" Collection

Click **"Create Collection"**
- Collection ID: `messages`
- Collection Name: `Messages`

**Add Attributes:**
- `message` (String, Size: 10000, Required: Yes)
- `category` (String, Size: 50, Required: No)
- `propertyType` (String, Size: 50, Required: No)
- `region` (String, Size: 100, Required: No)
- `purpose` (String, Size: 50, Required: No)
- `sourceFile` (String, Size: 100, Required: No)
- `imageUrl` (String, Size: 500, Required: No)
- `senderName` (String, Size: 100, Required: No)
- `senderMobile` (String, Size: 20, Required: No)
- `dateOfCreation` (DateTime, Required: No)
- `createdAt` (DateTime, Required: No)

**Set Permissions:**
- Add Role: **Any**
- Check: ✅ Create ✅ Read ✅ Update ✅ Delete

**Create Indexes:**
- Index 1: Key: `category`, Type: Key, Attributes: [category]
- Index 2: Key: `propertyType`, Type: Key, Attributes: [propertyType]
- Index 3: Key: `region`, Type: Key, Attributes: [region]
- Index 4: Key: `purpose`, Type: Key, Attributes: [purpose]
- Index 5: Key: `message_search`, Type: Fulltext, Attributes: [message]

---

## 3. Create "regions" Collection

Click **"Create Collection"**
- Collection ID: `regions`
- Collection Name: `Regions`

**Add Attributes:**
- `name` (String, Size: 100, Required: Yes)
- `nameAr` (String, Size: 100, Required: No)
- `count` (Integer, Min: 0, Max: 999999, Required: No)

**Set Permissions:**
- Add Role: **Any**
- Check: ✅ Create ✅ Read ✅ Update ✅ Delete

**Create Indexes:**
- Index 1: Key: `name`, Type: Key, Attributes: [name]

---

## After Creating All Collections:

Run the migration:
```cmd
node scripts\migrate-to-appwrite.js
```

This will copy all your data from PostgreSQL to Appwrite!
