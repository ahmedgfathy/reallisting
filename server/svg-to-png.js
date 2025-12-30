const sharp = require('sharp');
const fs = require('fs');

const input = 'contaboo_ad_template.svg';
const output = 'contaboo_ad.png';

sharp(input)
  .png()
  .toFile(output)
  .then(() => {
    console.log('✅ PNG created:', output);
  })
  .catch(err => {
    console.error('❌ Error:', err);
  });
