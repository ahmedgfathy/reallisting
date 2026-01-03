const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../public/logo.svg');
const svg = fs.readFileSync(svgPath);

async function generateIcons() {
  try {
    // Generate 192x192 icon
    await sharp(svg)
      .resize(192, 192)
      .png()
      .toFile(path.join(__dirname, '../public/logo192.png'));
    console.log('✅ Generated logo192.png');

    // Generate 512x512 icon
    await sharp(svg)
      .resize(512, 512)
      .png()
      .toFile(path.join(__dirname, '../public/logo512.png'));
    console.log('✅ Generated logo512.png');

    // Generate favicon (32x32)
    await sharp(svg)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, '../public/favicon-32.png'));
    console.log('✅ Generated favicon-32.png');

    // Generate apple touch icon (180x180)
    await sharp(svg)
      .resize(180, 180)
      .png()
      .toFile(path.join(__dirname, '../public/apple-touch-icon.png'));
    console.log('✅ Generated apple-touch-icon.png');

    console.log('\n🎉 All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
