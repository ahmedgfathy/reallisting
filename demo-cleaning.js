/**
 * Demo script showing the contact information cleaning functionality
 * This demonstrates what the cleaning script does without touching the database
 */

const { cleanText } = require('./clean-contact-info-enhanced');

console.log('🎯 Contact Information Cleaning - Demonstration\n');
console.log('═══════════════════════════════════════════════════════════\n');

const examples = [
  {
    title: '1️⃣  Security Code Message',
    input: '37 PM - Your security code with ~ 201279233999 changed. Tap to learn more.',
  },
  {
    title: '2️⃣  Property with Mobile Number',
    input: 'شقة للبيع في التجمع الخامس\nمساحة 150 متر\nللاستفسار: 01234567890',
  },
  {
    title: '3️⃣  Multiple Contact Methods',
    input: 'اتصل على 01234567890 او واتساب: +201098765432',
  },
  {
    title: '4️⃣  Arabic Digits Phone',
    input: 'للتواصل مع المالك ٠١٢٣٤٥٦٧٨٩٠',
  },
  {
    title: '5️⃣  Clean Property Description (No Contact Info)',
    input: 'شقة 3 غرف للبيع في التجمع الخامس\nمساحة 150 متر\nسعر 2,500,000 جنيه\nبالقرب من الخدمات',
  },
];

examples.forEach((example) => {
  console.log(`${example.title}`);
  console.log('─────────────────────────────────────────────────────────');
  console.log('📥 Input:');
  console.log(`   ${example.input.replace(/\n/g, '\n   ')}`);
  console.log('');
  
  const cleaned = cleanText(example.input);
  const hasChanged = cleaned !== example.input;
  
  console.log('📤 Output:');
  if (hasChanged) {
    console.log(`   ${cleaned.replace(/\n/g, '\n   ') || '(removed entirely)'}`);
    console.log('   ✅ Contact information REMOVED');
  } else {
    console.log(`   ${cleaned.replace(/\n/g, '\n   ')}`);
    console.log('   ℹ️  No changes needed (no contact info found)');
  }
  console.log('\n');
});

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ All examples processed successfully!\n');
console.log('What happens in the database:');
console.log('  • Messages table: Contact info removed from message field');
console.log('  • Properties table:');
console.log('    - description field: Contact info removed');
console.log('    - note field: Contact info removed');
console.log('    - mobileno field: Cleared entirely');
console.log('    - tel field: Cleared entirely\n');
console.log('What happens in API responses:');
console.log('  • mobileno and tel fields are excluded from all responses');
console.log('  • Only cleaned text is returned to users\n');
