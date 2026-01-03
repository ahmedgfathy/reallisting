# Data Cleaning Scripts

Scripts for cleaning contact information and mobile numbers from imported data.

## 📋 Available Scripts

### `clean-mobile-numbers-fast.js`
Fast mobile number cleaning for large datasets.
```bash
node scripts/data-cleaning/clean-mobile-numbers-fast.js
```

### `clean-contact-info-enhanced.js`
Enhanced cleaning with multiple pattern detection.
```bash
node scripts/data-cleaning/clean-contact-info-enhanced.js
```

### `clean-mobiles-ultra-fast.js`
Ultra-fast batch cleaning for production use.
```bash
node scripts/data-cleaning/clean-mobiles-ultra-fast.js
```

### `clean-mobile-numbers.js`
Standard mobile number cleaning script.
```bash
node scripts/data-cleaning/clean-mobile-numbers.js
```

## 🔄 Automated Cleaning

The `/api/clean-mobiles-cron.js` endpoint runs automatically via Vercel Cron to clean new messages every hour.

## 📝 Usage

Run these scripts when:
- Importing new data from external sources
- Bulk message uploads
- After database migrations
- Manual data quality checks

## ⚠️ Important

Always backup your database before running cleaning scripts on production data.
