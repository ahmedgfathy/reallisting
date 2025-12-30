// Script to generate PWA icons from SVG
// Run: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// Read the SVG file
const svgPath = path.join(__dirname, '../public/logo.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

console.log('SVG file found at:', svgPath);
console.log('\nTo generate PNG icons, you can use one of these methods:\n');

console.log('1. ONLINE TOOL (Easiest):');
console.log('   - Go to https://cloudconvert.com/svg-to-png');
console.log('   - Upload public/logo.svg');
console.log('   - Set width/height to 192x192, download and save as public/logo192.png');
console.log('   - Repeat with 512x512 for public/logo512.png\n');

console.log('2. INSTALL IMAGEMAGICK:');
console.log('   brew install imagemagick');
console.log('   convert -background none -resize 192x192 public/logo.svg public/logo192.png');
console.log('   convert -background none -resize 512x512 public/logo.svg public/logo512.png\n');

console.log('3. USE FIGMA/CANVA:');
console.log('   - Import the SVG');
console.log('   - Export as PNG at 192x192 and 512x512\n');

// For now, let's create a simple HTML-based icon generator that the user can open in browser
const htmlGenerator = `<!DOCTYPE html>
<html>
<head>
  <title>Generate كونتابو Icons</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { color: #3b5998; }
    canvas { border: 1px solid #ccc; margin: 10px; background: white; }
    button { padding: 10px 20px; margin: 5px; cursor: pointer; background: #3b5998; color: white; border: none; border-radius: 5px; }
    button:hover { background: #4267B2; }
    .downloads { margin-top: 20px; }
    a { display: inline-block; margin: 5px; padding: 10px 20px; background: #25D366; color: white; text-decoration: none; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏠 Generate كونتابو PWA Icons</h1>
    <p>Click the buttons below to generate and download the icons:</p>
    
    <div>
      <canvas id="canvas192" width="192" height="192"></canvas>
      <canvas id="canvas512" width="512" height="512"></canvas>
    </div>
    
    <div class="downloads" id="downloads"></div>
    
    <button onclick="generateIcons()">Generate Icons</button>
  </div>
  
  <script>
    const svgString = \`${svgContent.replace(/`/g, '\\`')}\`;
    
    function generateIcons() {
      const sizes = [192, 512];
      const downloads = document.getElementById('downloads');
      downloads.innerHTML = '';
      
      sizes.forEach(size => {
        const canvas = document.getElementById('canvas' + size);
        const ctx = canvas.getContext('2d');
        
        const img = new Image();
        const blob = new Blob([svgString], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        
        img.onload = function() {
          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(img, 0, 0, size, size);
          URL.revokeObjectURL(url);
          
          // Create download link
          const link = document.createElement('a');
          link.download = 'logo' + size + '.png';
          link.href = canvas.toDataURL('image/png');
          link.textContent = 'Download logo' + size + '.png';
          downloads.appendChild(link);
        };
        
        img.src = url;
      });
    }
    
    // Auto-generate on load
    window.onload = generateIcons;
  </script>
</body>
</html>`;

const htmlPath = path.join(__dirname, '../public/generate-icons.html');
fs.writeFileSync(htmlPath, htmlGenerator);
console.log('4. BROWSER METHOD:');
console.log('   Open this file in your browser: public/generate-icons.html');
console.log('   Click the download buttons to get the PNG files');
console.log('   Then delete the generate-icons.html file\n');
