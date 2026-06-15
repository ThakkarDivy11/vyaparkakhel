const { Jimp } = require('jimp');
const path = require('path');

async function cropBackground() {
  try {
    const inputPath = path.join(__dirname, 'public', 'bg_project.jpg');
    const backupPath = path.join(__dirname, 'public', 'bg_project_original.jpg');
    
    console.log('Reading background from:', inputPath);
    const image = await Jimp.read(inputPath);
    
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    console.log(`Original dimensions: ${width}x${height}`);
    
    // Save a backup of the original if it doesn't already exist
    const fs = require('fs');
    if (!fs.existsSync(backupPath)) {
      console.log('Creating a backup of the original background...');
      fs.copyFileSync(inputPath, backupPath);
    }
    
    // Let's crop the border.
    // Looking at the image, the border seems to occupy about 4% on each side.
    // We can define safe margins to crop. Let's calculate:
    const cropLeft = Math.floor(width * 0.045);
    const cropRight = Math.floor(width * 0.045);
    const cropTop = Math.floor(height * 0.05);
    const cropBottom = Math.floor(height * 0.05);
    
    const cropWidth = width - cropLeft - cropRight;
    const cropHeight = height - cropTop - cropBottom;
    
    console.log(`Cropping from: x=${cropLeft}, y=${cropTop}, w=${cropWidth}, h=${cropHeight}`);
    
    image.crop({
      x: cropLeft,
      y: cropTop,
      w: cropWidth,
      h: cropHeight
    });
    
    console.log('Writing processed background to:', inputPath);
    await image.write(inputPath);
    console.log('Successfully cropped the border and saved the background!');
  } catch (error) {
    console.error('Error cropping background:', error);
  }
}

cropBackground();
