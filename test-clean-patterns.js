/**
 * Test file to validate contact information cleaning patterns
 */

// Import the cleanText function from the enhanced script
const { cleanText } = require('./clean-contact-info-enhanced');

// Test cases based on the issue description
const testCases = [
  {
    name: 'Security code message',
    input: '37 PM - Your security code with ~ 201279233999 changed. Tap to learn more.',
    expectedClean: true,
    description: 'Should remove entire security code message line'
  },
  {
    name: 'Egyptian mobile with name',
    input: 'مها الهواري 01234567890',
    expectedClean: true,
    description: 'Should remove 01xxxxxxxxx format'
  },
  {
    name: 'Mobile with prefix text',
    input: 'Call me at 01098765432',
    expectedClean: true,
    description: 'Should remove mobile number but keep surrounding text'
  },
  {
    name: 'International format mobile',
    input: 'Contact: +201156789012',
    expectedClean: true,
    description: 'Should remove +201xxxxxxxxx format'
  },
  {
    name: 'Mobile without country code',
    input: 'Phone: 201223456789',
    expectedClean: true,
    description: 'Should remove 201xxxxxxxxx format'
  },
  {
    name: 'Arabic digits mobile',
    input: 'رقم الموبايل: ٠١٢٣٤٥٦٧٨٩٠',
    expectedClean: true,
    description: 'Should remove Arabic digit sequences'
  },
  {
    name: 'WhatsApp pattern',
    input: 'واتساب: 01234567890',
    expectedClean: true,
    description: 'Should remove WhatsApp contact pattern'
  },
  {
    name: 'Property description with mobile',
    input: 'شقة للبيع 150 متر\nسعر ممتاز\nللتواصل: 01234567890',
    expectedClean: true,
    description: 'Should remove mobile from property description'
  },
  {
    name: 'Multiple mobiles in text',
    input: 'اتصل على 01234567890 او 01098765432 للاستفسار',
    expectedClean: true,
    description: 'Should remove all mobile numbers'
  },
  {
    name: 'Clean text without contact info',
    input: 'شقة 3 غرف للبيع في التجمع الخامس\nمساحة 150 متر\nسعر 2,500,000 جنيه',
    expectedClean: false,
    description: 'Should not modify text without contact info'
  },
  {
    name: 'Mixed Arabic and English with mobile',
    input: 'Apartment in New Cairo - للاستفسار اتصل 01234567890',
    expectedClean: true,
    description: 'Should remove mobile from mixed language text'
  }
];

console.log('🧪 Testing Contact Information Cleaning Patterns\n');
console.log('═══════════════════════════════════════════════════\n');

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`Description: ${test.description}`);
  console.log(`Input: "${test.input}"`);
  
  const cleaned = cleanText(test.input);
  const hasChanged = cleaned !== test.input;
  const shouldChange = test.expectedClean;
  
  console.log(`Output: "${cleaned}"`);
  console.log(`Changed: ${hasChanged ? 'YES' : 'NO'}`);
  console.log(`Expected to change: ${shouldChange ? 'YES' : 'NO'}`);
  
  if (hasChanged === shouldChange) {
    console.log(`✅ PASS`);
    passed++;
  } else {
    console.log(`❌ FAIL`);
    failed++;
  }
  
  console.log('');
});

console.log('═══════════════════════════════════════════════════');
console.log(`Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log('✅ All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed!');
  process.exit(1);
}
