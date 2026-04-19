# RealListing | Contaboo

<div align="center">
  <img src="./public/logo.svg" alt="RealListing Logo" width="110" />
  <img src="./public/favicon-32.png" alt="RealListing Icon" width="32" height="32" />
</div>

منصة **RealListing (Contaboo | كونتابو)** هي تطبيق لإدارة الإعلانات العقارية العربية، مع تركيز على استيراد محادثات واتساب وتحويلها إلى بيانات عقارية منظمة قابلة للبحث والتصفية والمتابعة.

## Purpose of the Application

- تجميع رسائل الوسطاء العقاريين في مكان واحد.
- تحويل النصوص غير المنظمة (WhatsApp) إلى بيانات منظمة.
- تمكين البحث والتصفية حسب المنطقة، النوع، والغرض.
- تسهيل التواصل السريع مع المرسل عبر WhatsApp برسالة جاهزة.
- دعم إدارة المشرفين للاستيراد، التنظيف، وإدارة المستخدمين.

## App Preview

![RealListing App Preview](https://github.com/user-attachments/assets/e15b7e8d-a6a9-4901-91f8-0bf8ffa94f64)

## App Images & Icons

| Type | Preview | File |
|---|---|---|
| Main logo | <img src="./public/logo.svg" alt="logo" width="80" /> | `public/logo.svg` |
| App icon (192) | <img src="./public/logo192.png" alt="logo192" width="64" /> | `public/logo192.png` |
| App icon (512) | <img src="./public/logo512.png" alt="logo512" width="64" /> | `public/logo512.png` |
| Apple icon | <img src="./public/apple-touch-icon.png" alt="apple icon" width="64" /> | `public/apple-touch-icon.png` |
| Browser favicon | <img src="./public/favicon-32.png" alt="favicon" width="32" height="32" /> | `public/favicon-32.png` |

## Core Features

- تسجيل دخول وإدارة صلاحيات (Admin / User).
- لوحة متابعة للإعلانات العقارية مع فلاتر متقدمة.
- استيراد رسائل واتساب (ملف TXT أو لصق نص مباشر).
- إزالة الرسائل المكررة (Deduplication).
- دعم التفاعل مع العملاء عبر رابط WhatsApp مباشر.
- PWA-ready (manifest + service worker) للاستخدام بشكل أقرب لتجربة التطبيقات.

## Technology Stack

- **Frontend:** React 18 + CSS
- **Backend API:** Node.js handlers (Express-compatible) داخل `api/`
- **Local API Server:** Express (`server.js`)
- **Database:**
  - Production: Supabase
  - Local fallback: JSON DB (`lib/database.js`)
- **AI & NLP:**
  - OpenAI (`gpt-4o-mini`) عند توفر المفتاح
  - Google Gemini (`gemini-1.5-flash`) كخيار بديل
  - Regex extraction fallback بدون اعتماد خارجي
- **Deployment target:** Vercel (`vercel.json`)

## Hosting & Server

التطبيق مصمم ليستضاف على:

- **Vercel** للواجهة + API serverless routing
- **Supabase** كقاعدة البيانات الأساسية للإنتاج

وأثناء التطوير المحلي:

- **Express server** عبر `npm run server` على المنفذ `5001`
- **React dev server** عبر `npm start` على المنفذ `3000`

## AI (Including Batch Processing During Import)

منظومة الذكاء الاصطناعي تعمل على السيرفر فقط (لحماية المفاتيح) وتشمل:

1. **Regex-first pass** لاستخراج سريع ومجاني.
2. **AI enhancement** عند وجود مفاتيح API (OpenAI أو Gemini).
3. **Concurrent batch processing** داخل نفس طلب الاستيراد:
   - الرسائل تُقسَّم إلى مجموعات صغيرة
   - يتم تحليل كل مجموعة بالتوازي (`Promise.all`) لتسريع الإدخال
   - الواجهة تعرض تقدم الاستيراد وسجل تصنيفات ذكي مباشر
   - لا يوجد worker منفصل؛ التنفيذ يتم أثناء دورة الطلب على الخادم

الملفات المرتبطة:

- `api/import-whatsapp.js`
- `lib/ai.js`
- `api/analyze.js`

## Quick Start

```bash
npm install
npm run dev
```

أو تشغيل كل جزء منفصل:

```bash
npm run server
npm start
```

## Environment Variables

ابدأ من:

```bash
cp .env.example .env
```

ثم اضبط القيم المطلوبة مثل:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `REACT_APP_API_URL`
- `OPENAI_API_KEY` (اختياري)
- `GEMINI_API_KEY` (اختياري)

## Deployment

- أمر البناء: `npm run build`
- إعدادات Vercel موجودة في `vercel.json`
- دليل نشر مفصل: `technical-documentation/DEPLOYMENT.md`

## Additional Technical Documentation

- `technical-documentation/README.md`
- `technical-documentation/LOCAL-DEVELOPMENT.md`
- `technical-documentation/DEPLOYMENT.md`

