#!/usr/bin/env node
/**
 * Import WhatsApp Chat Data to Supabase
 * Only imports NEW files that haven't been imported yet
 * 
 * Usage:
 *   node import-to-supabase.js                    # Import only new files from data-source folder
 *   node import-to-supabase.js path/to/file.txt   # Import specific file (if not already imported)
 *   node import-to-supabase.js --force            # Force re-import all files
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_SOURCE_DIR = path.join(__dirname, '..', 'data-source');

// Generate UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

// Supabase connection
const SUPABASE_URL = 'https://gxyrpboyubpycejlkxue.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eXJwYm95dWJweWNlamxreHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNjU5OSwiZXhwIjoyMDgyNjgyNTk5fQ.jaQO9OmympAlJqrClhxQ-NFkmp74tB-IpRPqRf0eXvk';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
  
  for (const [area, keywords] of Object.entries(namedAreas)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return area;
      }
    }
  }
  
  const locationMatch = text.match(/الموقع\s*[:/؛]\s*([^\n\r,،؛]+)/i);
  if (locationMatch) {
    const location = locationMatch[1].trim();
    const hayyInLocation = location.match(/(?:الحي|حي)\s*(\d+)/i);
    if (hayyInLocation) {
      return `الحي ${hayyInLocation[1]}`;
    }
    const mugInLocation = location.match(/(?:مجاورة|مجاوره|مج)\s*(\d+)/i);
    if (mugInLocation) {
      return `مجاورة ${mugInLocation[1]}`;
    }
    if (location.length > 2 && location.length < 30) {
      return location;
    }
  }
  
  const hayyMatch = text.match(/(?:بالحي|الحي|حي)\s*(\d+)/i);
  if (hayyMatch) {
    return `الحي ${hayyMatch[1]}`;
  }
  
  const mugawaraMatch = text.match(/(?:بالمجاورة|بمجاورة|المجاورة|مجاورة|مجاوره|مج)\s*(\d+)/i);
  if (mugawaraMatch) {
    return `مجاورة ${mugawaraMatch[1]}`;
  }
  
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
  
  for (const keyword of rentKeywords) {
    if (text.includes(keyword)) {
      return 'إيجار';
    }
  }
  
  for (const keyword of saleKeywords) {
    if (text.includes(keyword)) {
      return 'بيع';
    }
  }
  
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
        id: generateUUID(),
        name: name,
        mobile: mobile || extractMobileFromMessage(messageText) || 'N/A',
        message: messageText.trim(),
        date_of_creation: `${date} ${time}`,
        source_file: fileName,
        category: categorizeMessage(messageText),
        property_type: detectPropertyType(messageText),
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

async function getImportedFiles() {
  console.log('📋 Checking already imported files...');
  
  const { data, error } = await supabase
    .from('messages')
    .select('source_file')
    .not('source_file', 'is', null);
  
  if (error) {
    console.error('Error fetching imported files:', error);
    return new Set();
  }
  
  const files = new Set(data.map(row => row.source_file));
  console.log(`   Found ${files.size} files already imported\n`);
  return files;
}

async function importFile(filePath, fileName, deleteAfterImport = false) {
  console.log(`\n📄 Processing: ${fileName}`);
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const messages = parseWhatsAppChat(content, fileName);
  
  console.log(`   Found ${messages.length} messages to import`);
  
  if (messages.length === 0) {
    console.log('   ⚠️ No messages found in file');
    return 0;
  }
  
  // Insert in batches of 500
  const batchSize = 500;
  let inserted = 0;
  let hasError = false;
  
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('messages')
      .insert(batch);
    
    if (error) {
      console.error(`   ❌ Error inserting batch: ${error.message}`);
      hasError = true;
      continue;
    }
    
    inserted += batch.length;
    console.log(`   ⏳ Inserted ${inserted}/${messages.length} messages...`);
  }
  
  console.log(`   ✅ Imported ${inserted} messages`);
  
  // Delete file after successful import
  if (deleteAfterImport && inserted > 0 && !hasError) {
    try {
      fs.unlinkSync(filePath);
      console.log(`   🗑️ Deleted source file: ${fileName}`);
    } catch (err) {
      console.error(`   ⚠️ Could not delete file: ${err.message}`);
    }
  }
  
  return inserted;
}

async function main() {
  const args = process.argv.slice(2);
  const forceImport = args.includes('--force');
  const deleteAfterImport = args.includes('--delete') || true; // Always delete after import
  const specificFile = args.find(arg => arg.endsWith('.txt'));
  
  console.log('🚀 WhatsApp Data Import to Supabase');
  console.log('====================================\n');
  console.log('⚠️  Files will be DELETED after successful import!\n');
  
  // Get already imported files
  const importedFiles = forceImport ? new Set() : await getImportedFiles();
  
  if (forceImport) {
    console.log('⚠️ Force mode: Will re-import all files\n');
  }
  
  let totalImported = 0;
  let newFilesCount = 0;
  
  if (specificFile) {
    // Import specific file
    const filePath = path.isAbsolute(specificFile) ? specificFile : path.join(process.cwd(), specificFile);
    const fileName = path.basename(filePath);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
    
    if (importedFiles.has(fileName) && !forceImport) {
      console.log(`⏭️ Skipping ${fileName} - already imported`);
      console.log('   Use --force to re-import');
    } else {
      if (forceImport && importedFiles.has(fileName)) {
        // Delete existing records for this file
        console.log(`🗑️ Deleting existing records for ${fileName}...`);
        await supabase.from('messages').delete().eq('source_file', fileName);
      }
      totalImported = await importFile(filePath, fileName, deleteAfterImport);
      newFilesCount = 1;
    }
  } else {
    // Import all files from data-source (new or all with --force)
    if (!fs.existsSync(DATA_SOURCE_DIR)) {
      console.error(`❌ Data source directory not found: ${DATA_SOURCE_DIR}`);
      process.exit(1);
    }
    
    const allFiles = fs.readdirSync(DATA_SOURCE_DIR).filter(f => f.endsWith('.txt'));
    
    console.log(`📁 Found ${allFiles.length} text file(s) in data-source`);
    
    if (allFiles.length === 0) {
      console.log('\n✅ No files to import.');
    } else {
      for (const file of allFiles) {
        const filePath = path.join(DATA_SOURCE_DIR, file);
        
        // Check if already imported (skip if not forcing)
        if (importedFiles.has(file) && !forceImport) {
          console.log(`\n⏭️ Skipping ${file} - already imported`);
          // Delete the file since it's already in DB
          try {
            fs.unlinkSync(filePath);
            console.log(`   🗑️ Deleted duplicate source file`);
          } catch (err) {}
          continue;
        }
        
        // If forcing and file exists in DB, delete old records first
        if (forceImport && importedFiles.has(file)) {
          console.log(`\n🗑️ Deleting existing records for ${file}...`);
          await supabase.from('messages').delete().eq('source_file', file);
        }
        
        totalImported += await importFile(filePath, file, deleteAfterImport);
        newFilesCount++;
      }
    }
  }
  
  // Get total count
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });
  
  console.log('\n====================================');
  console.log(`✅ Import complete!`);
  console.log(`📁 Files imported: ${newFilesCount}`);
  console.log(`📨 Messages imported: ${totalImported}`);
  console.log(`📊 Total messages in Supabase: ${count || 'unknown'}`);
}

main().catch(console.error);
