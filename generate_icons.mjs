import sharp from 'sharp';
import fs from 'fs';

async function generate() {
  const iconSvg = fs.readFileSync('public/icon-base.svg', 'utf8');
  
  // Apple Touch Icon (180x180)
  await sharp(Buffer.from(iconSvg))
    .resize(180, 180)
    .png()
    .toFile('public/app-touch-icon-v2.png');
    
  // Favicon (32x32)
  await sharp(Buffer.from(iconSvg))
    .resize(32, 32)
    .png()
    .toFile('public/app-favicon-v2.png');
    
  // PWA Icons (192, 512)
  await sharp(Buffer.from(iconSvg))
    .resize(192, 192)
    .png()
    .toFile('public/app-icon-192-v2.png');
    
  await sharp(Buffer.from(iconSvg))
    .resize(512, 512)
    .png()
    .toFile('public/app-icon-512-v2.png');
    
  console.log('Icons generated successfully.');
}

generate().catch(console.error);
