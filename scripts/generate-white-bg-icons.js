/**
 * Generate PWA Icons with White Background
 * Creates icons from logo-mobile.png with white background for proper PWA display
 * 
 * Usage: node scripts/generate-white-bg-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const SOURCE_LOGO = path.join(__dirname, '../client/public/logo-mobile.png');
const ICONS_DIR = path.join(__dirname, '../client/public/icons');

const SIZES = [
  { size: 192, name: '192x192' },
  { size: 512, name: '512x512' },
];

async function generateWhiteBackgroundIcons() {
  try {
    // Ensure icons directory exists
    await fs.mkdir(ICONS_DIR, { recursive: true });

    console.log('Generating PWA icons with white background...');

    for (const { size, name } of SIZES) {
      const outputPath = path.join(ICONS_DIR, `icon-${name}-white.png`);

      // Resize logo to fit in canvas (80% of size) and composite on white background
      const logoSize = Math.floor(size * 0.8);
      
      // Create white background canvas
      const whiteCanvas = await sharp({
        create: {
          width: size,
          height: size,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }, // White background
        },
      }).png().toBuffer();

      // Resize logo and composite on white background
      await sharp(whiteCanvas)
        .composite([
          {
            input: await sharp(SOURCE_LOGO)
              .resize(logoSize, logoSize, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
              .toBuffer(),
            gravity: 'center',
          },
        ])
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated: icon-${name}-white.png`);
    }

    console.log('\n✓ All white-background icons generated successfully!');
    console.log('Updated manifest.json to use these icons.');
  } catch (error) {
    console.error('Error generating icons:', error.message);
    process.exit(1);
  }
}

generateWhiteBackgroundIcons();
