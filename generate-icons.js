const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

async function generateIcons() {
  const svgPath = path.join(__dirname, 'icons', 'icon.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  
  // Create a data URL from the SVG content
  const svgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svgContent).toString('base64');
  
  const sizes = [16, 48, 128];
  
  for (const size of sizes) {
    const outputPath = path.join(__dirname, 'icons', `icon${size}.png`);
    
    try {
      // Load the SVG as an image
      const img = await loadImage(svgDataUrl);
      
      // Create a canvas with the target size
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0, size, size);
      
      // Save as PNG
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(outputPath, buffer);
      
      console.log(`✓ Generated icon${size}.png`);
    } catch (error) {
      console.error(`✗ Error generating icon${size}.png:`, error.message);
    }
  }
  
  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);
