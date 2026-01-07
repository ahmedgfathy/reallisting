const fs = require('fs');
const path = require('path');
const { messages, users, regions } = require('../lib/mariadb');

const WHATSAPP_CHAT_FILE = path.join(__dirname, '..', 'whatsapp-chat.txt');

// Parse WhatsApp chat format: "MM/DD/YY, HH:MM AM/PM - +20 XXXXXXXXXX: message"
function parseWhatsAppChat(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const entries = [];
  let currentEntry = null;

  const linePattern = /^(\d{1,2}\/\d{1,2}\/\d{2,4},\s+\d{1,2}:\d{2}\s+(?:AM|PM))\s+-\s+([^:]+):\s*(.*)$/;

  for (const line of lines) {
    const match = line.match(linePattern);
    
    if (match) {
      // New message
      if (currentEntry && currentEntry.message.trim()) {
        entries.push(currentEntry);
      }

      const [, dateStr, sender, messageText] = match;
      
      // Extract phone from sender (format: "+20 XX XXXXXXXX" or name)
      const phoneMatch = sender.match(/\+20\s*(\d{2})\s*(\d{8})/);
      const mobile = phoneMatch ? `0${phoneMatch[1]}${phoneMatch[2]}` : '';
      
      currentEntry = {
        date: parseWhatsAppDate(dateStr),
        sender: sender.trim(),
        mobile,
        message: messageText.trim()
      };
    } else if (currentEntry && line.trim()) {
      // Continuation of previous message
      currentEntry.message += '\n' + line.trim();
    }
  }

  if (currentEntry && currentEntry.message.trim()) {
    entries.push(currentEntry);
  }

  return entries;
}

function parseWhatsAppDate(dateStr) {
  try {
    // Format: "9/14/25, 8:10 PM" -> ISO
    const [datePart, timePart] = dateStr.split(', ');
    const [month, day, year] = datePart.split('/').map(Number);
    const fullYear = year < 100 ? 2000 + year : year;
    
    let [time, period] = timePart.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const date = new Date(fullYear, month - 1, day, hours, minutes);
    
    // Check if date is valid and return null if invalid/future
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date.toISOString();
  } catch (err) {
    return null;
  }
}

function extractPhoneNumbers(text) {
  // Egyptian mobile patterns: 01XXXXXXXXX
  const phones = [];
  const patterns = [
    /\b(01[0-9]{9})\b/g,
    /\b0\s*1\s*[0-9]\s*[0-9]{8}\b/g
  ];
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const cleaned = match[0].replace(/\s+/g, '');
      if (cleaned.length === 11 && cleaned.startsWith('01')) {
        phones.push(cleaned);
      }
    }
  }
  
  return [...new Set(phones)]; // Remove duplicates
}

function categorizeMessage(text) {
  const lower = text.toLowerCase();
  
  // Property type detection
  let propertyType = 'أخرى';
  if (lower.includes('شقة') || lower.includes('شقه')) propertyType = 'شقة';
  else if (lower.includes('بيت') || lower.includes('فيلا')) propertyType = 'بيت/فيلا';
  else if (lower.includes('محل') || lower.includes('محلات')) propertyType = 'محل';
  else if (lower.includes('مزرعة') || lower.includes('مزرعه')) propertyType = 'مزرعة';
  else if (lower.includes('ارض') || lower.includes('أرض') || lower.includes('قطعة')) propertyType = 'أرض';
  
  // Purpose detection
  let purpose = 'أخرى';
  if (lower.includes('للبيع') || lower.includes('بيع')) purpose = 'بيع';
  else if (lower.includes('للايجار') || lower.includes('للإيجار') || lower.includes('ايجار')) purpose = 'إيجار';
  else if (lower.includes('مطلوب')) purpose = 'مطلوب';
  
  // Region detection (حي XX pattern) - avoid phone numbers
  let region = 'أخرى';
  const regionMatch = text.match(/(?:حي|الحي)\s*(\d{1,3})(?!\d)/);
  if (regionMatch) {
    region = `الحي ${regionMatch[1]}`;
  }
  
  return { propertyType, purpose, region };
}

async function importMessages() {
  console.log('📂 Reading WhatsApp chat file...');
  
  if (!fs.existsSync(WHATSAPP_CHAT_FILE)) {
    console.error('❌ File not found:', WHATSAPP_CHAT_FILE);
    process.exit(1);
  }

  const entries = parseWhatsAppChat(WHATSAPP_CHAT_FILE);
  console.log(`📊 Found ${entries.length} messages`);

  // Collect unique users and regions
  const uniqueUsers = new Map();
  const uniqueRegions = new Set();

  console.log('\n📋 Analyzing data...');
  for (const entry of entries) {
    if (entry.mobile && entry.mobile.startsWith('01') && entry.mobile.length === 11) {
      if (!uniqueUsers.has(entry.mobile)) {
        uniqueUsers.set(entry.mobile, entry.sender);
      }
    }
    
    const { region } = categorizeMessage(entry.message);
    if (region !== 'أخرى') {
      uniqueRegions.add(region);
    }
  }

  // Create users
  console.log(`\n👥 Creating ${uniqueUsers.size} users...`);
  let usersCreated = 0;
  for (const [mobile, name] of uniqueUsers) {
    try {
      await users.create({
        mobile,
        password: 'default123', // Default password
        name: name || mobile,
        role: 'broker',
        isActive: 1
      });
      usersCreated++;
    } catch (err) {
      // User might already exist, skip
    }
  }
  console.log(`✅ Created ${usersCreated} users`);

  // Create regions
  console.log(`\n🗺️  Creating ${uniqueRegions.size} regions...`);
  let regionsCreated = 0;
  for (const regionName of uniqueRegions) {
    try {
      await regions.create(regionName);
      regionsCreated++;
    } catch (err) {
      // Region might already exist, skip
    }
  }
  console.log(`✅ Created ${regionsCreated} regions`);

  console.log('\n📥 Importing messages...');
  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    // Skip system messages
    if (!entry.message || 
        entry.message.includes('end-to-end encrypted') ||
        entry.message.includes('created group') ||
        entry.message.includes('joined using') ||
        entry.message.includes('<Media omitted>')) {
      skipped++;
      continue;
    }

    const phones = extractPhoneNumbers(entry.message);
    const { propertyType, purpose, region } = categorizeMessage(entry.message);

    try {
      await messages.create({
        message: entry.message,
        sender_name: entry.sender,
        sender_mobile: entry.mobile || (phones[0] || ''),
        date_of_creation: entry.date || new Date('2021-01-01').toISOString(),
        source_file: 'whatsapp-chat.txt',
        image_url: '',
        category: purpose === 'مطلوب' ? 'مطلوب' : 'معروض',
        property_type: propertyType,
        region: region,
        purpose: purpose
      });
      imported++;
    } catch (err) {
      console.error(`Failed to import message: ${err.message}`);
    }
  }

  console.log(`✅ Import complete!`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped: ${skipped}`);
  process.exit(0);
}

importMessages().catch(err => {
  console.error('❌ Import failed:', err);
  process.exit(1);
});
