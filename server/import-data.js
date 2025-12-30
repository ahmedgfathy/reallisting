#!/usr/bin/env node
/**
 * Import WhatsApp Chat Data to MariaDB
 * 
 * Usage:
 *   node import-data.js                    # Import all files from data-source folder
 *   node import-data.js path/to/file.txt   # Import specific file
 *   node import-data.js --clear            # Clear database and re-import all
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DATA_SOURCE_DIR = path.join(__dirname, '..', 'data-source');

const dbConfig = {
  host: 'localhost',
  user: 'reallisting',
  password: 'reallisting123',
  database: 'reallisting',
  charset: 'utf8mb4'
};

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
  
  for (const keyword of requiredKeywords) {
    if (text.includes(keyword) || textLower.includes(keyword.toLowerCase())) {
      return 'مطلوب';
    }
  }
  
  for (const keyword of offerKeywords) {
    if (text.includes(keyword) || textLower.includes(keyword.toLowerCase())) {
      return 'معروض';
    }
  }
  
  return 'أخرى';
}

// Detect property type from message
function detectPropertyType(text) {
  const propertyTypes = {
    'شقة': ['شقة', 'شقه', 'شقق', 'الشقة', 'الشقه', 'شقتي', 'شقتين'],
    'أرض': ['أرض', 'ارض', 'قطعة', 'قطعه', 'القطعة', 'قطعة أرض', 'قطعه ارض', 'أراضي', 'اراضي'],
    'فيلا': ['فيلا', 'فيللا', 'فلة', 'فله', 'الفيلا', 'فيلات', 'فلل'],
    'بيت': ['بيت', 'منزل', 'البيت', 'المنزل', 'بيوت', 'منازل'],
    'محل': ['محل', 'دكان', 'محلات', 'المحل', 'الدكان', 'دكاكين', 'لوكيشن تجاري', 'محل تجاري'],
    'مكتب': ['مكتب', 'مكاتب', 'المكتب', 'اوفيس', 'أوفيس', 'office'],
    'عمارة': ['عمارة', 'عماره', 'عمارات', 'العمارة', 'العماره', 'مبنى', 'مبني'],
    'استوديو': ['استوديو', 'ستوديو', 'استديو', 'studio'],
    'دوبلكس': ['دوبلكس', 'دوبليكس', 'duplex'],
    'بدروم': ['بدروم', 'البدروم', 'بدرومات'],
    'هنجر': ['هنجر', 'هناجر', 'الهنجر'],
    'مصنع': ['مصنع', 'مصانع', 'المصنع', 'ورشة', 'ورش'],
    'مخزن': ['مخزن', 'مخازن', 'المخزن', 'مستودع'],
    'جراج': ['جراج', 'جاراج', 'الجراج', 'كراج', 'موقف سيارات'],
    'روف': ['روف', 'الروف', 'roof', 'رووف'],
    'بنتهاوس': ['بنتهاوس', 'penthouse', 'بنت هاوس'],
    'شاليه': ['شاليه', 'الشاليه', 'شاليهات'],
    'عيادة': ['عيادة', 'العيادة', 'عيادات', 'كلينيك'],
    'صيدلية': ['صيدلية', 'الصيدلية', 'صيدليات'],
    'كافيه': ['كافيه', 'كافي', 'كوفي شوب', 'مقهى'],
    'مطعم': ['مطعم', 'المطعم', 'مطاعم', 'restaurant'],
    'صالة': ['صالة', 'الصالة', 'صالات', 'جيم', 'gym']
  };
  
  for (const [type, keywords] of Object.entries(propertyTypes)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return type;
      }
    }
  }
  
  return 'أخرى';
}

// Detect region from message
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
  const locationMatch = text.match(/الموقع\s*[:/؛]\s*([^\n\r,،؛]+)/i);
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

// Detect purpose (sale/rent)
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

// Extract mobile from message
function extractMobileFromMessage(text) {
  const patterns = [
    /01\d{9}/,
    /\+20\s*\d{10}/,
    /00\d{10,}/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].replace(/\s/g, '');
    }
  }
  return null;
}

// Parse WhatsApp chat
function parseWhatsAppChat(content, fileName) {
  const messages = [];
  const lines = content.split('\n');
  const messageRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\s*-\s*([^:]+):\s*(.*)$/i;
  
  let currentMessage = null;
  
  for (let line of lines) {
    const match = line.match(messageRegex);
    
    if (match) {
      if (currentMessage) {
        messages.push(currentMessage);
      }
      
      const [, date, time, sender, messageText] = match;
      
      if (messageText.includes('<Media omitted>') || 
          sender.includes('Messages and calls are end-to-end encrypted') ||
          messageText.includes('added you') ||
          messageText.includes('created group')) {
        currentMessage = null;
        continue;
      }
      
      let mobile = '';
      let name = sender.trim();
      
      const phoneMatch = sender.match(/\+?\d[\d\s]+/);
      if (phoneMatch) {
        let cleanNumber = phoneMatch[0].replace(/\s+/g, '');
        if (cleanNumber.startsWith('20') && !cleanNumber.startsWith('+')) {
          cleanNumber = '+' + cleanNumber;
        }
        mobile = cleanNumber;
        name = cleanNumber;
      }
      
      const messagePhoneMatch = messageText.match(/(?:01\d{9}|00\d{10,}|\+\d{10,})/);
      if (messagePhoneMatch && !mobile) {
        mobile = messagePhoneMatch[0].replace(/\s+/g, '');
      }
      
      currentMessage = {
        id: `${fileName}-${messages.length}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        mobile: mobile || extractMobileFromMessage(messageText) || 'N/A',
        message: messageText.trim(),
        dateOfCreation: `${date} ${time}`,
        sourceFile: fileName,
        category: categorizeMessage(messageText),
        propertyType: detectPropertyType(messageText),
        region: detectRegion(messageText),
        purpose: detectPurpose(messageText)
      };
    } else if (currentMessage && line.trim()) {
      currentMessage.message += ' ' + line.trim();
      
      if (currentMessage.mobile === 'N/A') {
        const mobileInMessage = extractMobileFromMessage(line);
        if (mobileInMessage) {
          currentMessage.mobile = mobileInMessage;
        }
      }
    }
  }
  
  if (currentMessage) {
    messages.push(currentMessage);
  }
  
  return messages;
}

async function importFile(db, filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n📄 Processing: ${fileName}`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const messages = parseWhatsAppChat(content, fileName);
  
  // Delete existing messages from this file
  await db.execute('DELETE FROM messages WHERE sourceFile = ?', [fileName]);
  
  // Insert new messages
  let inserted = 0;
  for (const msg of messages) {
    try {
      await db.execute(
        `INSERT INTO messages (id, name, mobile, message, dateOfCreation, sourceFile, category, propertyType, region, purpose) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [msg.id, msg.name, msg.mobile, msg.message, msg.dateOfCreation, msg.sourceFile, msg.category, msg.propertyType, msg.region, msg.purpose]
      );
      inserted++;
    } catch (err) {
      // Skip duplicates
    }
  }
  
  console.log(`   ✅ Imported ${inserted} messages`);
  return inserted;
}

async function main() {
  const args = process.argv.slice(2);
  const clearDb = args.includes('--clear');
  const specificFile = args.find(arg => arg.endsWith('.txt'));
  
  console.log('🚀 WhatsApp Data Import Tool');
  console.log('============================\n');
  
  let db;
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MariaDB\n');
  } catch (err) {
    console.error('❌ Failed to connect to database:', err.message);
    process.exit(1);
  }
  
  try {
    if (clearDb) {
      console.log('🗑️  Clearing all existing data...');
      await db.execute('DELETE FROM messages');
      console.log('✅ Database cleared\n');
    }
    
    let totalImported = 0;
    
    if (specificFile) {
      // Import specific file
      const filePath = path.isAbsolute(specificFile) ? specificFile : path.join(process.cwd(), specificFile);
      if (fs.existsSync(filePath)) {
        totalImported = await importFile(db, filePath);
      } else {
        console.error(`❌ File not found: ${filePath}`);
      }
    } else {
      // Import all files from data-source
      if (!fs.existsSync(DATA_SOURCE_DIR)) {
        console.error(`❌ Data source directory not found: ${DATA_SOURCE_DIR}`);
        process.exit(1);
      }
      
      const files = fs.readdirSync(DATA_SOURCE_DIR).filter(f => f.endsWith('.txt'));
      console.log(`📁 Found ${files.length} text file(s) in data-source\n`);
      
      for (const file of files) {
        totalImported += await importFile(db, path.join(DATA_SOURCE_DIR, file));
      }
    }
    
    // Get total count
    const [rows] = await db.execute('SELECT COUNT(*) as count FROM messages');
    
    console.log('\n============================');
    console.log(`✅ Import complete!`);
    console.log(`📊 Total messages in database: ${rows[0].count}`);
    
  } finally {
    await db.end();
  }
}

main().catch(console.error);
