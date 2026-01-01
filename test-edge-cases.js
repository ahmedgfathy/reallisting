/**
 * Additional edge case tests for contact information cleaning
 */

const { cleanText } = require('./clean-contact-info-enhanced');

const edgeCases = [
  {
    name: 'Price that looks like phone (should not remove)',
    input: 'السعر: 2,500,000 جنيه',
    shouldChange: false
  },
  {
    name: 'Area that looks like phone (should not remove)',
    input: 'المساحة: 150 متر',
    shouldChange: false
  },
  {
    name: 'Phone in middle of sentence',
    input: 'للتواصل اتصل 01234567890 في اي وقت',
    shouldChange: true
  },
  {
    name: 'Multiple spaces after phone removal',
    input: 'اتصل   01234567890   للمعاينة',
    shouldChange: true
  },
  {
    name: 'Empty message after removal',
    input: '01234567890',
    shouldChange: true
  },
  {
    name: 'Phone at start',
    input: '01234567890 للتواصل',
    shouldChange: true
  },
  {
    name: 'Phone at end',
    input: 'للتواصل 01234567890',
    shouldChange: true
  },
  {
    name: 'Mixed format phones',
    input: 'Contact: +201234567890 or 01098765432',
    shouldChange: true
  },
  {
    name: 'Numbers in URL (should be careful)',
    input: 'Visit https://example.com/property/12345',
    shouldChange: false
  },
  {
    name: 'Date format (should not remove)',
    input: 'تاريخ النشر: 2024/01/15',
    shouldChange: false
  },
  {
    name: 'Security code variant 1',
    input: 'Your security code with 123456 changed',
    shouldChange: true
  },
  {
    name: 'Security code variant 2',
    input: 'security code ~ 987654 changed',
    shouldChange: true
  },
  {
    name: 'Partial phone number (9 digits, should not match)',
    input: 'الرقم: 123456789',
    shouldChange: false
  },
  {
    name: 'Phone with dashes',
    input: 'Tel: 0123-456-7890',
    shouldChange: true
  },
  {
    name: 'Phone with parentheses',
    input: 'Phone: (012) 3456-7890',
    shouldChange: true
  }
];

console.log('🧪 Edge Case Testing for Contact Information Cleaning\n');
console.log('═══════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;
const failures = [];

edgeCases.forEach((test, index) => {
  const cleaned = cleanText(test.input);
  const hasChanged = cleaned !== test.input;
  
  const success = hasChanged === test.shouldChange;
  
  if (success) {
    console.log(`✅ Test ${index + 1}: ${test.name}`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: ${test.name}`);
    console.log(`   Input: "${test.input}"`);
    console.log(`   Output: "${cleaned}"`);
    console.log(`   Expected to change: ${test.shouldChange ? 'YES' : 'NO'}, Actually changed: ${hasChanged ? 'YES' : 'NO'}`);
    failed++;
    failures.push(test.name);
  }
});

console.log('\n═══════════════════════════════════════════════════');
console.log(`Results: ${passed} passed, ${failed} failed out of ${edgeCases.length} tests`);

if (failed > 0) {
  console.log('\n❌ Failed tests:');
  failures.forEach(name => console.log(`   - ${name}`));
  process.exit(1);
} else {
  console.log('✅ All edge case tests passed!');
  process.exit(0);
}
