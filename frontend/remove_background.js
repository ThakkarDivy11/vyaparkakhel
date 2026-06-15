const { Jimp } = require('jimp');
const path = require('path');

async function processLogo() {
  try {
    const inputPath = path.join(__dirname, 'public', 'dashboard_logo_original.png');
    const outputPath = path.join(__dirname, 'public', 'dashboard_logo.png');
    
    console.log('Reading original logo from:', inputPath);
    const image = await Jimp.read(inputPath);
    
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    // Process pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = image.getPixelColor(x, y);
        const r = (color >> 24) & 0xff;
        const g = (color >> 16) & 0xff;
        const b = (color >> 8) & 0xff;
        const a = color & 0xff;
        
        // Check if the pixel matches the gray/white checkerboard pattern
        // The pattern is gray (~200 to ~225) or white (~250 to 255)
        const isGray = (r > 190 && g > 190 && b > 190) && (Math.max(r, g, b) - Math.min(r, g, b) < 12);
        
        if (isGray) {
          // Set pixel to fully transparent
          image.setPixelColor(0x00000000, x, y);
        }
      }
    }
    
    // Auto crop transparent borders
    image.autocrop();
    
    console.log('Writing processed logo to:', outputPath);
    await image.write(outputPath);
    console.log('Processed image saved successfully!');
    console.log('New dimensions:', image.bitmap.width, 'x', image.bitmap.height);
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

processLogo();
