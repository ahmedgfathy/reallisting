# Manual Cleaning Guide

## 🚨 When to Run Manual Cleaning

Run manual cleaning scripts after:
- Importing new messages from WhatsApp exports
- Adding bulk properties data
- Any time you see unwanted contact info appearing

## 📋 Available Methods

### Method 1: API Endpoint (Easiest)
Visit this URL in your browser after deployment:
```
https://your-app.vercel.app/api/clean-now
```

This will:
- Clean ALL messages in database
- Show progress in real-time
- Return summary when done

### Method 2: Node Script (Most Powerful)
Run locally on your machine:
```bash
node scripts/data-cleaning/clean-contact-info-enhanced.js
```

This cleans:
- ✅ All messages (54k+)
- ✅ All properties (2.2k+)
- ✅ Security code messages
- ✅ Mobile numbers (all formats)
- ✅ Arabic digit phone numbers
- ✅ Contact patterns

### Method 3: Fast Mobile Cleanup Only
If you only need to remove mobile numbers quickly:
```bash
node scripts/data-cleaning/clean-mobile-numbers-fast.js
```

## 🤖 Automatic Cleaning

Vercel Cron runs `/api/clean-mobiles-cron` **every hour** automatically.

**Note**: Vercel Cron continues working even after deployments. However, if you import large amounts of new data, run manual cleaning right after for immediate results.

## 🔍 What Gets Removed

### Security Messages
- "PM - Your security code..."
- "security code changed"
- "verification code"
- "Tap to learn more"
- Any line containing "sbdalslamsyd79"

### Phone Numbers
- Egyptian format: 01xxxxxxxxx
- International: +201xxxxxxxxx
- Arabic digits: ٠١...
- 7+ consecutive digits

### Contact Patterns
- "Call: 01234567890" → removed
- "Mobile: ..." → removed
- "واتساب: ..." → removed
- "رقم: ..." → removed

## ⏱️ Performance

- **Messages**: ~1,000/second
- **Properties**: ~300/second
- **Full cleanup**: ~60 seconds for 54k messages + 2.2k properties

## 🔐 Frontend Protection

Even if data isn't cleaned from database yet:
- ✅ Public users see `***` instead of numbers
- ✅ Security messages hidden from display
- ✅ Contact info only visible to active subscribers

## 🆘 Troubleshooting

If contact info still appears:
1. Check user subscription status (only active users see contacts)
2. Run manual cleaning: `node scripts/data-cleaning/clean-contact-info-enhanced.js`
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Check Vercel logs to ensure cron is running
