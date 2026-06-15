const { Jimp } = require('jimp');
const path = require('path');

async function checkLogo() {
  try {
    const imgPath = path.join(__dirname, 'public', 'dashboard_logo.png');
    const img = await Jimp.read(imgPath);
    console.log('dashboard_logo.png dimensions:', img.bitmap.width, 'x', img.bitmap.height);
    
    let transparentCount = 0;
    let opaqueCount = 0;
    for (let y = 0; y < img.bitmap.height; y++) {
      for (let x = 0; x < img.bitmap.width; x++) {
        const color = img.getPixelColor(x, y);
        const alpha = color & 0xff;
        if (alpha < 10) {
          transparentCount++;
        } else {
          opaqueCount++;
        }
      }
    }
    console.log('Transparent pixels:', transparentCount);
    console.log('Opaque pixels:', opaqueCount);
  } catch (error) {
    console.error('Error:', error);
  }
}

checkLogo();
