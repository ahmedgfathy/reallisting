const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

const app = express();
const PORT = 3001;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';
const USE_OLLAMA = process.env.USE_OLLAMA !== 'false';

// JWT Secret
const JWT_SECRET = 'reallisting_secret_key_2025_secure';

// Admin credentials (hashed password)
const ADMIN_PASSWORD = 'ZeroCall20!@H';

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

const DATA_SOURCE_DIR = path.join(__dirname, '..', 'data-source');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'reallisting',
  password: 'reallisting123',
  database: 'reallisting',
  charset: 'utf8mb4'
};

let db = null;

const PROPERTY_TYPE_KEYWORDS = {
  'شقة': ['شقة', 'شقه', 'شقق', 'الشقة', 'الشقه', 'شقتي', 'شقتين', 'apartment', 'apartments', 'flat'],
  'أرض': ['أرض', 'ارض', 'قطعة', 'قطعه', 'القطعة', 'قطعة أرض', 'قطعه ارض', 'أراضي', 'اراضي', 'plot', 'land'],
  'فيلا': ['فيلا', 'فيللا', 'فلة', 'فله', 'الفيلا', 'فيلات', 'فلل', 'villa'],
  'بيت': ['بيت', 'منزل', 'البيت', 'المنزل', 'بيوت', 'منازل', 'house', 'home'],
  'مزرعة': ['مزرعة', 'مزرعه', 'مزارع', 'المزرعة', 'المزرعه', 'farm', 'farmland', 'agricultural', 'فدان', 'افدنة', 'أفدنة', '10 فدان', 'فدانين'],
  'محل': ['محل', 'دكان', 'محلات', 'المحل', 'الدكان', 'دكاكين', 'لوكيشن تجاري', 'محل تجاري', 'shop', 'store', 'commercial shop'],
  'مكتب': ['مكتب', 'مكاتب', 'المكتب', 'اوفيس', 'أوفيس', 'office', 'offices'],
  'عمارة': ['عمارة', 'عماره', 'عمارات', 'العمارة', 'العماره', 'مبنى', 'مبني', 'building'],
  'استوديو': ['استوديو', 'ستوديو', 'استديو', 'الاستوديو', 'studio'],
  'دوبلكس': ['دوبلكس', 'دوبليكس', 'الدوبلكس', 'duplex'],
  'بدروم': ['بدروم', 'البدروم', 'بدرومات', 'basement'],
  'هنجر': ['هنجر', 'هناجر', 'الهنجر', 'hangar', 'warehouse'],
  'مصنع': ['مصنع', 'مصانع', 'المصنع', 'factory', 'workshop', 'ورشة', 'ورش'],
  'مخزن': ['مخزن', 'مخازن', 'المخزن', 'مستودع', 'storehouse', 'storage'],
  'جراج': ['جراج', 'جاراج', 'الجراج', 'كراج', 'garage', 'parking'],
  'روف': ['روف', 'الروف', 'roof'],
  'بنتهاوس': ['بنتهاوس', 'البنتهاوس', 'penthouse'],
  'شاليه': ['شاليه', 'الشاليه', 'شاليهات', 'chalet', 'chalets'],
  'عيادة': ['عيادة', 'العيادة', 'عيادات', 'clinic'],
  'صيدلية': ['صيدلية', 'الصيدلية', 'صيدليات', 'pharmacy'],
  'كافيه': ['كافيه', 'كافي', 'كوفي شوب', 'coffeeshop', 'cafe'],
  'مطعم': ['مطعم', 'المطعم', 'مطاعم', 'restaurant'],
  'صالة': ['صالة', 'الصالة', 'صالات', 'gym', 'قاعة', 'قاعة أفراح', 'قاعة مناسبات'],
  'أخرى': ['أخرى', 'other']
};

const CATEGORY_VALUES = new Set(['مطلوب', 'معروض', 'أخرى']);
const PURPOSE_VALUES = new Set(['بيع', 'إيجار', 'أخرى']);

let ollamaWarningLogged = false;

function containsAnyKeyword(text, keywords) {
  if (!text || !Array.isArray(keywords) || keywords.length === 0) {
    return false;
  }
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => {
    if (!keyword) return false;
    return lowerText.includes(keyword.toLowerCase());
  });
}

function shouldApplyPropertyType(currentType, newType, message) {
  if (!newType) return false;
  if (!currentType || currentType === 'أخرى') return true;
  if (currentType === newType) return false;

  const newKeywords = PROPERTY_TYPE_KEYWORDS[newType] || [];
  const currentKeywords = PROPERTY_TYPE_KEYWORDS[currentType] || [];

  const messageHasNewType = containsAnyKeyword(message, newKeywords);
  const messageHasCurrentType = containsAnyKeyword(message, currentKeywords);

  if (messageHasNewType && !messageHasCurrentType) {
    return true;
  }

  if (newType === 'مزرعة' && messageHasNewType) {
    return true;
  }

  return false;
}

// Initialize database connection
async function initDatabase() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('Connected to MariaDB database');
    
    // Create users table if not exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mobile VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'broker',
        isActive BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('Users table ready');
    
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

// Store all parsed messages (in-memory cache)
let allMessages = [];

// Remove all mobile numbers from text
function removeMobileNumbers(text) {
  if (!text) return '';
  return text
    .replace(/01\d{9}/g, '')
    .replace(/\+20\s*\d{10}/g, '')
    .replace(/0020\s*\d{10}/g, '')
    .replace(/00\d{10,}/g, '')
    .replace(/\+\d{10,}/g, '')
    .replace(/\b\d{11,15}\b/g, '');
}

// Sanitize message text by stripping numbers and normalizing whitespace
function sanitizeMessageText(text) {
  const noNumbers = removeMobileNumbers(text || '');
  return noNumbers.replace(/\s{2,}/g, ' ').trim();
}

// Parse WhatsApp chat format
function parseWhatsAppChat(content, fileName) {
  const messages = [];
  const lines = content.split('\n');

  // WhatsApp format: MM/DD/YY, HH:MM AM/PM - Name/Number: Message
  const messageRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\s*-\s*([^:]+):\s*(.*)$/i;

  let currentMessage = null;

  for (let line of lines) {
    const match = line.match(messageRegex);

    if (match) {
      // Save previous message if exists
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const [, date, time, sender, messageText] = match;

      // Skip system messages and media omitted
      if (messageText.includes('<Media omitted>') ||
          sender.includes('Messages and calls are end-to-end encrypted') ||
          messageText.includes('added you') ||
          messageText.includes('created group')) {
        currentMessage = null;
        continue;
      }

      // Extract mobile number from sender
      let mobile = '';
      let name = sender.trim();

      // Check if sender is a phone number format
      const phoneMatch = sender.match(/\+?\d[\d\s]+/);
      if (phoneMatch) {
        // Remove all spaces and format consistently
        let cleanNumber = phoneMatch[0].replace(/\s+/g, '');
        // Ensure it starts with + for international format
        if (cleanNumber.startsWith('20') && !cleanNumber.startsWith('+')) {
          cleanNumber = '+' + cleanNumber;
        }
        mobile = cleanNumber;
        // Also clean the name if it's just a phone number
        name = cleanNumber;
      }

      // Also check message for phone numbers
      const messagePhoneMatch = messageText.match(/(?:01\d{9}|00\d{10,}|\+\d{10,})/);
      if (messagePhoneMatch && !mobile) {
        mobile = messagePhoneMatch[0].replace(/\s+/g, '');
      }

      // Remove all mobile numbers from the message text
      const cleanedMessageText = sanitizeMessageText(messageText.trim());

      // Categorize message type
      const category = categorizeMessage(cleanedMessageText);
      const propertyType = detectPropertyType(cleanedMessageText);
      const region = detectRegion(cleanedMessageText);
      const purpose = detectPurpose(cleanedMessageText);

      currentMessage = {
        id: `${fileName}-${messages.length}-${Date.now()}`,
        name: name,
        mobile: mobile || extractMobileFromMessage(messageText) || 'N/A',
        message: cleanedMessageText,
        dateOfCreation: `${date} ${time}`,
        sourceFile: fileName,
        category: category,
        propertyType: propertyType,
        region: region,
        purpose: purpose
      };
    } else if (currentMessage && line.trim()) {
      // Continuation of previous message
      // Remove mobile numbers from continued lines as well
      const cleanedLine = sanitizeMessageText(line.trim());
      currentMessage.message += ' ' + cleanedLine;

      // Check for mobile in continued message
      if (currentMessage.mobile === 'N/A') {
        const mobileInMessage = extractMobileFromMessage(line);
        if (mobileInMessage) {
          currentMessage.mobile = mobileInMessage;
        }
      }
    }
  }

  // Don't forget the last message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}

// Extract mobile number from message text
function extractMobileFromMessage(text) {
  const patterns = [
    /01\d{9}/,           // Egyptian mobile format
    /\+20\s*\d{10}/,     // International Egyptian format
    /00\d{10,}/,         // International format
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].replace(/\s/g, '');
    }
  }
  return null;
}

// Process a single file
async function processFile(filePath) {
  try {
    const fileName = path.basename(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const messages = parseWhatsAppChat(content, fileName);

    for (const msg of messages) {
      const enriched = await enrichMessageWithOllama(msg);
      if (enriched) {
        if (enriched.propertyType && shouldApplyPropertyType(msg.propertyType, enriched.propertyType, msg.message)) {
          msg.propertyType = enriched.propertyType;
        }
        if (enriched.region && (msg.region === 'أخرى' || !msg.region)) {
          msg.region = enriched.region;
        }
        if (enriched.category && (msg.category === 'أخرى' || !msg.category)) {
          msg.category = enriched.category;
        }
        if (enriched.purpose && (msg.purpose === 'أخرى' || !msg.purpose)) {
          msg.purpose = enriched.purpose;
        }
      }
    }
    
    // Remove old messages from this file (in-memory)
    allMessages = allMessages.filter(msg => msg.sourceFile !== fileName);
    
    // Add new messages to memory
    allMessages = [...allMessages, ...messages];
    
    // Save to database if connected
    if (db) {
      // Delete old messages from this file in database
      await db.execute('DELETE FROM messages WHERE sourceFile = ?', [fileName]);
      
      // Insert new messages
      for (const msg of messages) {
        await db.execute(
          `INSERT INTO messages (id, name, mobile, message, dateOfCreation, sourceFile, category, propertyType, region, purpose) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
           name = VALUES(name), mobile = VALUES(mobile), message = VALUES(message), 
           dateOfCreation = VALUES(dateOfCreation), category = VALUES(category),
           propertyType = VALUES(propertyType), region = VALUES(region), purpose = VALUES(purpose)`,
          [msg.id, msg.name, msg.mobile, msg.message, msg.dateOfCreation, msg.sourceFile, msg.category, msg.propertyType, msg.region, msg.purpose]
        );
      }
      console.log(`Saved ${messages.length} messages to database from ${fileName}`);
    }
    
    console.log(`Processed ${fileName}: ${messages.length} messages found`);
    return messages.length;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return 0;
  }
}
// Categorize message as offer or required
function categorizeMessage(text) {
  const offerKeywords = [
    'للبيع', 'للإيجار', 'للايجار', 'متاح', 'فرصه', 'فرصة',
    'عرض', 'بيع', 'ايجار', 'إيجار', 'for sale', 'for rent',
    'متاحة', 'متاحه', 'فاضي', 'فاضية', 'فاضيه', 'جاهز', 'جاهزة',
    'استلام فوري', 'تسليم فوري', 'تشطيب', 'نص تشطيب', 'سوبر لوكس',
    'لوكس', 'تمليك', 'ملك', 'فيو', 'view', 'بحري', 'قبلي',
    'شارع رئيسي', 'ناصية', 'موقع متميز', 'موقع مميز'
  ];
  
  const requiredKeywords = [
    'مطلوب', 'محتاج', 'أبحث', 'ابحث', 'عايز', 'عاوز', 'needed',
    'wanted', 'looking for', 'طالب', 'بدور على', 'بدور علي',
    'ابي', 'أبي', 'نفسي', 'عاوزين', 'عايزين', 'محتاجين',
    'لو حد عنده', 'لو فيه', 'هل يوجد', 'هل في', 'اللي عنده',
    'يا جماعة', 'يا جماعه', 'حد عنده', 'في حد', 'فيه حد'
  ];
  
  const textLower = text.toLowerCase();
  
  // Check for required first (often more specific)
  for (const keyword of requiredKeywords) {
    if (text.includes(keyword) || textLower.includes(keyword.toLowerCase())) {
      return 'مطلوب';
    }
  }
  
  // Check for offers
  for (const keyword of offerKeywords) {
    if (text.includes(keyword) || textLower.includes(keyword.toLowerCase())) {
      return 'معروض';
    }
  }
  
  return 'أخرى';
}

// Detect property type from message
function detectPropertyType(text) {
  const textLower = text.toLowerCase();

  for (const [type, keywords] of Object.entries(PROPERTY_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword) || textLower.includes(keyword.toLowerCase())) {
        return type;
      }
    }
  }

  return 'أخرى';
}

// Detect purpose (for sale or for rent)
function detectPurpose(text) {
  const saleKeywords = [
    'للبيع', 'بيع', 'للبيع‎', 'بايع', 'ابيع', 'أبيع',
    'مطلوب للشراء', 'للشراء', 'شراء', 'اشتري', 'أشتري',
    'تمليك', 'ملك', 'ملكية', 'كاش', 'cash', 'قسط', 'تقسيط',
    'دفعة', 'مقدم', 'sale', 'buy', 'selling'
  ];
  
  const rentKeywords = [
    'للإيجار', 'للايجار', 'إيجار', 'ايجار', 'أجار', 'اجار',
    'مطلوب للإيجار', 'مطلوب للايجار', 'مؤجر', 'مؤجرة',
    'rent', 'rental', 'يومي', 'شهري', 'سنوي', 'شهريا', 'سنويا',
    'مفروش', 'مفروشة', 'فارغ', 'فارغة', 'furnished'
  ];
  
  // Check for rent keywords first (more specific)
  for (const keyword of rentKeywords) {
    if (text.includes(keyword)) {
      return 'إيجار';
    }
  }
  
  // Check for sale keywords
  for (const keyword of saleKeywords) {
    if (text.includes(keyword)) {
      return 'بيع';
    }
  }
  
  // If "مطلوب" is present with a property type, assume it's for buying
  if (text.includes('مطلوب')) {
    const propertyKeywords = ['شقة', 'شقه', 'قطعة', 'قطعه', 'أرض', 'ارض', 'فيلا', 'بيت', 'محل', 'مكتب', 'عمارة', 'عماره', 'روف', 'دوبلكس', 'استوديو'];
    for (const prop of propertyKeywords) {
      if (text.includes(prop)) {
        return 'بيع';
      }
    }
  }
  
  return 'أخرى';
}

// Detect region/area from message
function detectRegion(text) {
  // Named areas
  const namedAreas = {
    'دار مصر': ['دار مصر', 'دارمصر'],
    'الياسمين': ['الياسمين', 'ياسمين', 'حي الياسمين'],
    'السويفي': ['السويفي', 'سويفي'],
    'الحي اليوناني': ['الحي اليوناني', 'اليوناني'],
    'مساكن الشباب': ['مساكن الشباب', 'مساكن شباب'],
    'الموقف': ['الموقف', 'موقف'],
    'المعهد': ['المعهد', 'معهد'],
    'تقسيم الشرطة': ['تقسيم الشرطة', 'تقسيم شرطة'],
    'الاسكان الاجتماعي': ['الاسكان الاجتماعي', 'اسكان اجتماعي', 'الإسكان الاجتماعي', 'إسكان اجتماعي'],
    'المنطقة الصناعية': ['المنطقة الصناعية', 'منطقة صناعية', 'الصناعية'],
    'الحي المتميز': ['الحي المتميز', 'المتميز', 'حي متميز'],
    'الشروق': ['الشروق', 'مدينة الشروق'],
    'العبور': ['العبور', 'مدينة العبور'],
    'بدر': ['بدر', 'مدينة بدر'],
    'العاشر من رمضان': ['العاشر من رمضان', 'العاشر', '10 رمضان', 'عاشر رمضان'],
    'مدينتي': ['مدينتي', 'madinaty'],
    'الرحاب': ['الرحاب', 'رحاب'],
    'التجمع الخامس': ['التجمع الخامس', 'التجمع', 'خامس'],
    'التجمع الأول': ['التجمع الأول', 'التجمع الاول'],
    'القاهرة الجديدة': ['القاهرة الجديدة', 'new cairo'],
    'المقطم': ['المقطم', 'مقطم'],
    'مدينة نصر': ['مدينة نصر', 'م نصر'],
    'هليوبوليس': ['هليوبوليس', 'مصر الجديدة'],
    'المعادي': ['المعادي', 'معادي'],
    'زهراء المعادي': ['زهراء المعادي', 'زهراء'],
    '6 أكتوبر': ['6 أكتوبر', '٦ أكتوبر', 'اكتوبر', 'أكتوبر', 'السادس من أكتوبر'],
    'الشيخ زايد': ['الشيخ زايد', 'زايد', 'sheikh zayed'],
    'حدائق الأهرام': ['حدائق الأهرام', 'حدائق الاهرام', 'حدائق اهرام'],
    'الهضبة الوسطى': ['الهضبة الوسطى', 'هضبة وسطى'],
    'الحي الأول': ['الحي الأول', 'الحي الاول'],
    'الحي الثاني': ['الحي الثاني'],
    'الحي الثالث': ['الحي الثالث'],
    'الحي الرابع': ['الحي الرابع'],
    'السوق': ['السوق', 'منطقة السوق'],
    'المركز': ['المركز', 'مركز المدينة', 'وسط البلد'],
    'الكمبوند': ['الكمبوند', 'كمبوند'],
    'النادي': ['النادي', 'نادي']
  };
  
  // Check named areas first
  for (const [area, keywords] of Object.entries(namedAreas)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return area;
      }
    }
  }
  
  // Check for الموقع : or الموقع/ pattern to extract location
  const locationMatch = text.match(/الموقع\s*(?:[:/؛\-–]|هو|هي)?\s*([^\n\r,،؛]+)/i);
  if (locationMatch) {
    const location = locationMatch[1].trim();
    // Check if it matches any known pattern
    const hayyInLocation = location.match(/(?:الحي|حي)\s*(\d+)/i);
    if (hayyInLocation) {
      return `الحي ${hayyInLocation[1]}`;
    }
    const mugInLocation = location.match(/(?:مجاورة|مجاوره|مج)\s*(\d+)/i);
    if (mugInLocation) {
      return `مجاورة ${mugInLocation[1]}`;
    }
    // Return the location text if it's reasonable length
    if (location.length > 2 && location.length < 30) {
      return location;
    }
  }

  const locationLineMatch = text.match(/الموقع\s*(?:[:/؛\-–]|هو|هي)?\s*\n?([^\n\r]+)/i);
  if (locationLineMatch) {
    const location = locationLineMatch[1].trim();
    if (location.length > 2 && location.length < 30) {
      return location;
    }
  }
  
  // Check for الحي + number pattern (الحي 35, حي 17, بالحي 20, etc.)
  const hayyMatch = text.match(/(?:بالحي|الحي|حي)\s*(\d+)/i);
  if (hayyMatch) {
    return `الحي ${hayyMatch[1]}`;
  }
  
  // Check for مجاورة/مجاوره + number pattern (including بمجاورة, المجاورة)
  const mugawaraMatch = text.match(/(?:بالمجاورة|بمجاورة|المجاورة|مجاورة|مجاوره|مج)\s*(\d+)/i);
  if (mugawaraMatch) {
    return `مجاورة ${mugawaraMatch[1]}`;
  }
  
  // Check for ح + number (short form like ح35)
  const shortHayyMatch = text.match(/(?:بح|ح)\s*(\d+)/i);
  if (shortHayyMatch) {
    return `الحي ${shortHayyMatch[1]}`;
  }
  
  return 'أخرى';
}

function shouldEnhanceWithOllama(msg) {
  if (!USE_OLLAMA) return false;
  if (!msg) return false;
  return [msg.propertyType, msg.region, msg.category, msg.purpose].some(value => !value || value === 'أخرى');
}

function normalizePropertyType(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === 'أخرى') return 'أخرى';
  const lower = trimmed.toLowerCase();

  for (const [type, keywords] of Object.entries(PROPERTY_TYPE_KEYWORDS)) {
    if (trimmed === type || lower === type.toLowerCase()) {
      return type;
    }
    for (const keyword of keywords) {
      if (lower === keyword.toLowerCase() || lower.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(lower)) {
        return type;
      }
    }
  }

  return null;
}

function normalizeCategory(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (CATEGORY_VALUES.has(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes('معروض') || lower.includes('عرض') || lower.includes('sale') || lower.includes('offer')) {
    return 'معروض';
  }
  if (lower.includes('مطلوب') || lower.includes('طلب') || lower.includes('wanted') || lower.includes('need') || lower.includes('buyer')) {
    return 'مطلوب';
  }

  return null;
}

function normalizePurpose(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (PURPOSE_VALUES.has(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes('بيع') || lower.includes('sale') || lower.includes('sell') || lower.includes('شراء')) {
    return 'بيع';
  }
  if (lower.includes('إيجار') || lower.includes('ايجار') || lower.includes('rent') || lower.includes('lease')) {
    return 'إيجار';
  }

  return null;
}

function normalizeRegion(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === 'أخرى') {
    return 'أخرى';
  }
  if (trimmed.length > 50) {
    return null;
  }
  return trimmed;
}

async function callOllama(prompt) {
  if (!USE_OLLAMA) return null;

  try {
    const url = new URL('/api/generate', OLLAMA_URL);
    const payload = JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const protocol = url.protocol === 'https:' ? https : http;

    return await new Promise((resolve) => {
      const req = protocol.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              resolve(parsed.response || null);
            } catch (err) {
              if (!ollamaWarningLogged) {
                console.warn('Failed to parse Ollama response JSON:', err.message);
                ollamaWarningLogged = true;
              }
              resolve(null);
            }
          } else {
            if (!ollamaWarningLogged) {
              console.warn('Ollama returned status', res.statusCode);
              ollamaWarningLogged = true;
            }
            resolve(null);
          }
        });
      });

      req.on('error', (error) => {
        if (!ollamaWarningLogged) {
          console.warn('Ollama request failed:', error.message);
          ollamaWarningLogged = true;
        }
        resolve(null);
      });

      req.write(payload);
      req.end();
    });
  } catch (error) {
    if (!ollamaWarningLogged) {
      console.warn('Ollama connection error:', error.message);
      ollamaWarningLogged = true;
    }
    return null;
  }
}

function extractJsonBlock(text) {
  if (!text) return null;
  if (text.trim().startsWith('{')) {
    try {
      return JSON.parse(text);
    } catch (err) {
      // Fall through to pattern search
    }
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function enrichMessageWithOllama(msg) {
  if (!shouldEnhanceWithOllama(msg)) {
    return null;
  }

  const propertyChoices = Object.keys(PROPERTY_TYPE_KEYWORDS).join(', ');
  const prompt = [
    'قم بتحليل الرسالة التالية وتحديد بيانات العقار بدقة.',
    'يجب أن تكون الإجابات ضمن القوائم المسموح بها.',
    `نوع_العقار: اختر من (${propertyChoices}).`,
    'المنطقة: اسم قصير يصف الموقع أو كلمة "أخرى" إذا لم يذكر.',
    'الفئة: معروض أو مطلوب أو أخرى.',
    'الغرض: بيع أو إيجار أو أخرى.',
    'أعد الرد في صيغة JSON فقط مثل:',
    '{"property_type":"شقة","region":"الحي 12","category":"معروض","purpose":"إيجار"}',
    'ولا تضف أي نص آخر.',
    '',
    'الرسالة:',
    msg.message
  ].join('\n');

  const responseText = await callOllama(prompt);
  if (!responseText) {
    return null;
  }

  const parsed = extractJsonBlock(responseText);
  if (!parsed) {
    return null;
  }

  const propertyTypeCandidate = parsed.property_type || parsed.propertyType || parsed.type;
  const categoryCandidate = parsed.category || parsed.status || parsed.offer_status;
  const purposeCandidate = parsed.purpose || parsed.intent || parsed.goal;
  const regionCandidate = parsed.region || parsed.area || parsed.location;

  const normalized = {};

  const normalizedProperty = normalizePropertyType(propertyTypeCandidate);
  if (normalizedProperty && normalizedProperty !== 'أخرى') {
    normalized.propertyType = normalizedProperty;
  }

  const normalizedCategory = normalizeCategory(categoryCandidate);
  if (normalizedCategory && normalizedCategory !== 'أخرى') {
    normalized.category = normalizedCategory;
  }

  const normalizedPurpose = normalizePurpose(purposeCandidate);
  if (normalizedPurpose && normalizedPurpose !== 'أخرى') {
    normalized.purpose = normalizedPurpose;
  }

  const normalizedRegion = normalizeRegion(regionCandidate);
  if (normalizedRegion && normalizedRegion !== 'أخرى') {
    normalized.region = normalizedRegion;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

// Process all files in data-source directory
async function processAllFiles() {
  allMessages = [];
  
  if (!fs.existsSync(DATA_SOURCE_DIR)) {
    fs.mkdirSync(DATA_SOURCE_DIR, { recursive: true });
    return;
  }
  
  const files = fs.readdirSync(DATA_SOURCE_DIR);
  
  for (const file of files) {
    if (file.endsWith('.txt')) {
      await processFile(path.join(DATA_SOURCE_DIR, file));
    }
  }
  
  console.log(`Total messages loaded: ${allMessages.length}`);
}

// Load messages from database on startup
async function loadMessagesFromDatabase() {
  if (!db) return;
  
  try {
    const [rows] = await db.execute('SELECT * FROM messages ORDER BY STR_TO_DATE(dateOfCreation, \'%m/%d/%y %h:%i %p\') DESC, createdAt DESC');
    if (rows.length > 0) {
      allMessages = rows.map(row => ({
        ...row,
        message: sanitizeMessageText(row.message)
      }));
      console.log(`Loaded ${rows.length} messages from database (sorted by latest date)`);
    }
  } catch (error) {
    console.error('Error loading messages from database:', error.message);
  }
}

// Watch for file changes
const watcher = chokidar.watch(DATA_SOURCE_DIR, {
  ignored: /(^|[\/\\])\../,
  persistent: true,
  ignoreInitial: true
});

watcher
  .on('add', (filePath) => {
    console.log(`File added: ${filePath}`);
    if (filePath.endsWith('.txt')) {
      processFile(filePath);
    }
  })
  .on('change', (filePath) => {
    console.log(`File changed: ${filePath}`);
    if (filePath.endsWith('.txt')) {
      processFile(filePath);
    }
  })
  .on('unlink', (filePath) => {
    console.log(`File removed: ${filePath}`);
    const fileName = path.basename(filePath);
    allMessages = allMessages.filter(msg => msg.sourceFile !== fileName);
  });

// API endpoints
app.get('/api/messages', (req, res) => {
  const { page = 1, limit = 50, search = '', category = '', propertyType = '', region = '', purpose = '' } = req.query;
  
  let filteredMessages = [...allMessages];
  
  // Sort by date descending (latest first)
  filteredMessages.sort((a, b) => {
    // Parse dates in format MM/DD/YY HH:MM AM/PM
    const parseDate = (dateStr) => {
      if (!dateStr) return new Date(0);
      const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
      if (!match) return new Date(0);
      let [, month, day, year, hour, minute, second, ampm] = match;
      year = parseInt(year);
      if (year < 100) year += 2000;
      hour = parseInt(hour);
      if (ampm && ampm.toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (ampm && ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
      return new Date(year, parseInt(month) - 1, parseInt(day), hour, parseInt(minute), parseInt(second || 0));
    };
    return parseDate(b.dateOfCreation) - parseDate(a.dateOfCreation);
  });
  
  // Filter by category
  if (category && category !== 'الكل') {
    filteredMessages = filteredMessages.filter(msg => msg.category === category);
  }
  
  // Filter by property type
  if (propertyType && propertyType !== 'الكل') {
    filteredMessages = filteredMessages.filter(msg => msg.propertyType === propertyType);
  }
  
  // Filter by region
  if (region && region !== 'الكل') {
    filteredMessages = filteredMessages.filter(msg => msg.region === region);
  }
  
  // Filter by purpose (sale/rent)
  if (purpose && purpose !== 'الكل') {
    filteredMessages = filteredMessages.filter(msg => msg.purpose === purpose);
  }
  
  // Filter by search - search in name, mobile, message, region, propertyType
  if (search) {
    const searchTerm = search.trim();
    const searchLower = searchTerm.toLowerCase();
    filteredMessages = filteredMessages.filter(msg => 
      msg.name.toLowerCase().includes(searchLower) ||
      msg.mobile.includes(searchTerm) ||
      msg.mobile.replace(/\+/g, '').includes(searchTerm.replace(/\+/g, '')) ||
      msg.message.toLowerCase().includes(searchLower) ||
      msg.region.toLowerCase().includes(searchLower) ||
      msg.propertyType.toLowerCase().includes(searchLower)
    );
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  
  const paginatedMessages = filteredMessages.slice(startIndex, endIndex);
  
  res.json({
    total: filteredMessages.length,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(filteredMessages.length / limit),
    data: paginatedMessages
  });
});

app.get('/api/stats', (req, res) => {
  const files = fs.existsSync(DATA_SOURCE_DIR) 
    ? fs.readdirSync(DATA_SOURCE_DIR).filter(f => f.endsWith('.txt'))
    : [];
    
  res.json({
    totalMessages: allMessages.length,
    totalFiles: files.length,
    files: files
  });
});

// Get unique regions from all messages
app.get('/api/regions', (req, res) => {
  const regions = [...new Set(allMessages.map(msg => msg.region))];
  // Sort regions - put الحي numbers first, then مجاورة, then named areas, then أخرى at the end
  const sortedRegions = regions.sort((a, b) => {
    if (a === 'أخرى') return 1;
    if (b === 'أخرى') return -1;
    
    const aIsHayy = a.startsWith('الحي');
    const bIsHayy = b.startsWith('الحي');
    const aIsMug = a.startsWith('مجاورة');
    const bIsMug = b.startsWith('مجاورة');
    
    if (aIsHayy && !bIsHayy) return -1;
    if (!aIsHayy && bIsHayy) return 1;
    if (aIsMug && !bIsMug) return -1;
    if (!aIsMug && bIsMug) return 1;
    
    // Extract numbers for numeric sorting
    const aNum = parseInt(a.match(/\d+/)?.[0] || '999');
    const bNum = parseInt(b.match(/\d+/)?.[0] || '999');
    
    if (aIsHayy && bIsHayy) return aNum - bNum;
    if (aIsMug && bIsMug) return aNum - bNum;
    
    return a.localeCompare(b, 'ar');
  });
  
  res.json(sortedRegions);
});

// Endpoint to manually refresh
app.post('/api/refresh', async (req, res) => {
  await processAllFiles();
  res.json({ success: true, totalMessages: allMessages.length });
});

// Endpoint to re-apply detection rules to database records (without re-importing)
app.post('/api/reprocess', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  try {
    console.log('Re-processing detection rules for all messages in database...');
    let updated = 0;
    
    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i];
      const cleanedMessage = sanitizeMessageText(msg.message);
      const newCategory = categorizeMessage(cleanedMessage);
      const newPropertyType = detectPropertyType(cleanedMessage);
      const newRegion = detectRegion(cleanedMessage);
      const newPurpose = detectPurpose(cleanedMessage);
      
      // Update in memory
      allMessages[i] = {
        ...msg,
        message: cleanedMessage,
        category: newCategory,
        propertyType: newPropertyType,
        region: newRegion,
        purpose: newPurpose
      };

      const enriched = await enrichMessageWithOllama(allMessages[i]);
      if (enriched) {
        if (enriched.propertyType && shouldApplyPropertyType(allMessages[i].propertyType, enriched.propertyType, allMessages[i].message)) {
          allMessages[i].propertyType = enriched.propertyType;
        }
        if (enriched.region && (allMessages[i].region === 'أخرى' || !allMessages[i].region)) {
          allMessages[i].region = enriched.region;
        }
        if (enriched.category && (allMessages[i].category === 'أخرى' || !allMessages[i].category)) {
          allMessages[i].category = enriched.category;
        }
        if (enriched.purpose && (allMessages[i].purpose === 'أخرى' || !allMessages[i].purpose)) {
          allMessages[i].purpose = enriched.purpose;
        }
      }

      const updatedMessage = allMessages[i];

      // Update in database
      await db.execute(
        `UPDATE messages SET message = ?, category = ?, propertyType = ?, region = ?, purpose = ? WHERE id = ?`,
        [updatedMessage.message, updatedMessage.category, updatedMessage.propertyType, updatedMessage.region, updatedMessage.purpose, msg.id]
      );
      
      updated++;
      if (updated % 1000 === 0) {
        console.log(`Processed ${updated}/${allMessages.length} messages...`);
      }
    }
    
    console.log(`Re-processing complete. Updated ${updated} messages.`);
    res.json({ success: true, updatedCount: updated, totalMessages: allMessages.length });
  } catch (error) {
    console.error('Error re-processing:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to delete messages
app.post('/api/messages/delete', async (req, res) => {
  const { ids } = req.body;
  
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'Invalid request. Expected array of message IDs.' });
  }
  
  const idsSet = new Set(ids);
  const initialCount = allMessages.length;
  
  // Filter out the messages to delete from memory
  allMessages = allMessages.filter(msg => !idsSet.has(msg.id));
  
  // Delete from database if connected
  if (db) {
    try {
      const placeholders = ids.map(() => '?').join(',');
      await db.execute(`DELETE FROM messages WHERE id IN (${placeholders})`, ids);
    } catch (error) {
      console.error('Error deleting from database:', error.message);
    }
  }
  
  const deletedCount = initialCount - allMessages.length;
  
  console.log(`Deleted ${deletedCount} messages`);
  
  res.json({ 
    success: true, 
    deletedCount, 
    remainingMessages: allMessages.length 
  });
});

// Generate simple token
function generateToken(username, role = 'broker') {
  const payload = {
    username,
    role,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  const data = JSON.stringify(payload);
  const hash = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
  return Buffer.from(data).toString('base64') + '.' + hash;
}

// Verify token
function verifyToken(token) {
  try {
    const [dataB64, hash] = token.split('.');
    const data = Buffer.from(dataB64, 'base64').toString();
    const expectedHash = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
    if (hash !== expectedHash) return null;
    const payload = JSON.parse(data);
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.user = payload;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
}

// Hash password helper
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

// Register endpoint for brokers
app.post('/api/auth/register', async (req, res) => {
  const { mobile, password } = req.body;
  
  // Validate mobile
  if (!mobile || !/^01[0-9]{9}$/.test(mobile)) {
    return res.status(400).json({ error: 'رقم الموبايل يجب أن يبدأ بـ 01 ويتكون من 11 رقم' });
  }
  
  // Validate password
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }
  
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }
  
  try {
    // Check if user exists
    const [existing] = await db.execute('SELECT id FROM users WHERE mobile = ?', [mobile]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'رقم الموبايل مسجل بالفعل' });
    }
    
    // Create user (inactive by default - needs payment)
    const hashedPassword = hashPassword(password);
    await db.execute(
      'INSERT INTO users (mobile, password, role, isActive) VALUES (?, ?, ?, ?)',
      [mobile, hashedPassword, 'broker', false]
    );
    
    // Generate token
    const token = generateToken(mobile, 'broker');
    
    res.json({
      success: true,
      token,
      user: { username: mobile, role: 'broker', isActive: false }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'حدث خطأ أثناء التسجيل' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Check if admin
  if (username === 'admin' && password === ADMIN_PASSWORD) {
    const token = generateToken('admin', 'admin');
    return res.json({ 
      success: true, 
      token,
      user: { username: 'admin', role: 'admin', isActive: true }
    });
  }
  
  // Check broker login
  if (!db) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  
  try {
    const [users] = await db.execute('SELECT * FROM users WHERE mobile = ?', [username]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'رقم الموبايل أو كلمة المرور غير صحيحة' });
    }
    
    const user = users[0];
    const hashedPassword = hashPassword(password);
    
    if (user.password !== hashedPassword) {
      return res.status(401).json({ error: 'رقم الموبايل أو كلمة المرور غير صحيحة' });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ error: 'الحساب قيد المراجعة. يرجى التواصل مع الإدارة للتفعيل.' });
    }
    
    const token = generateToken(user.mobile, user.role);
    res.json({
      success: true,
      token,
      user: { username: user.mobile, role: user.role, isActive: !!user.isActive }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

// Check auth status
app.get('/api/auth/verify', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ authenticated: false });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ authenticated: false });
  }
  
  // Get latest user info from database for brokers
  if (payload.role !== 'admin' && db) {
    try {
      const [users] = await db.execute('SELECT * FROM users WHERE mobile = ?', [payload.username]);
      if (users.length > 0) {
        const user = users[0];
        return res.json({ 
          authenticated: true, 
          user: { username: user.mobile, role: user.role, isActive: !!user.isActive } 
        });
      }
    } catch (error) {
      console.error('Verify error:', error.message);
    }
  }
  
  res.json({ authenticated: true, user: { username: payload.username, role: payload.role || 'admin', isActive: true } });
});

app.get('/api/admin/users', authMiddleware, requireAdmin, async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    const [rows] = await db.execute('SELECT id, mobile, role, isActive, createdAt FROM users ORDER BY createdAt DESC');
    const users = rows.map((row) => ({
      id: row.id,
      mobile: row.mobile,
      role: row.role,
      isActive: !!row.isActive,
      createdAt: row.createdAt
    }));
    res.json(users);
  } catch (error) {
    console.error('Admin list users error:', error.message);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

app.post('/api/admin/users/:id/status', authMiddleware, requireAdmin, async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }

  const { id } = req.params;
  const { isActive } = req.body || {};

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'Invalid isActive flag' });
  }

  try {
    const [result] = await db.execute('UPDATE users SET isActive = ? WHERE id = ?', [isActive ? 1 : 0, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [rows] = await db.execute('SELECT id, mobile, role, isActive, createdAt FROM users WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = rows[0];
    res.json({
      success: true,
      user: {
        id: updated.id,
        mobile: updated.mobile,
        role: updated.role,
        isActive: !!updated.isActive,
        createdAt: updated.createdAt
      }
    });
  } catch (error) {
    console.error('Admin update user error:', error.message);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Initialize and start server
async function startServer() {
  // Connect to database
  await initDatabase();
  
  // Load existing messages from database ONLY
  await loadMessagesFromDatabase();
  
  // Only process files if database is empty (first time setup)
  if (allMessages.length === 0) {
    console.log('Database empty, processing text files for initial import...');
    await processAllFiles();
  } else {
    console.log(`Using ${allMessages.length} messages from database (not re-processing text files)`);
  }
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Watching for files in: ${DATA_SOURCE_DIR}`);
    console.log(`Database: ${db ? 'Connected' : 'Not connected (using in-memory only)'}`);
    console.log(`Total messages: ${allMessages.length}`);
  });
}

startServer();
