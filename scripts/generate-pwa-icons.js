/**
 * Generate PWA Icons Script
 * Resizes the CityFreshKart.png logo to create PWA-ready icon files
 * 
 * Usage: node scripts/generate-pwa-icons.js
 * 
 * Prerequisites: npm install sharp (if not already installed)
 * 
 * Generated files:
 * - client/public/icons/icon-192x192.png
 * - client/public/icons/icon-192x192-maskable.png
 * - client/public/icons/icon-512x512.png
 * - client/public/icons/icon-512x512-maskable.png
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

const SOURCE_LOGO = path.join(__dirname, '../client/public/CityFreshKart.png');
const ICONS_DIR = path.join(__dirname, '../client/public/icons');

const SIZES = [
  { size: 192, name: '192x192' },
  { size: 512, name: '512x512' },
];

async function generateIcons() {
  try {
    // Ensure icons directory exists
    await fs.mkdir(ICONS_DIR, { recursive: true });

    // Check if source logo exists
    try {
      await fs.access(SOURCE_LOGO);
    } catch {
      console.error(`❌ Source logo not found: ${SOURCE_LOGO}`);
      process.exit(1);
    }

    console.log('🎨 Generating PWA icons from source logo...\n');

    for (const { size, name } of SIZES) {
      // Generate standard icon
      const standardIconPath = path.join(ICONS_DIR, `icon-${name}.png`);
      await sharp(SOURCE_LOGO)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png()
        .toFile(standardIconPath);
      console.log(`✅ Generated: icon-${name}.png (${size}×${size})`);

      // Generate maskable icon (for adaptive icons on Android)
      // Maskable icons should have content in the center circle (visible area)
      const maskableIconPath = path.join(ICONS_DIR, `icon-${name}-maskable.png`);
      await sharp(SOURCE_LOGO)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 108, b: 73, alpha: 1 }, // CityFreshKart theme color (#006C49)
        })
        .png()
        .toFile(maskableIconPath);
      console.log(`✅ Generated: icon-${name}-maskable.png (${size}×${size}, masked)`);
    }

    console.log('\n✨ All PWA icons generated successfully!');
    console.log(`📁 Icons saved to: ${ICONS_DIR}`);
    console.log('\n📱 Manifest reference (already configured):');
    console.log('  - icon-192x192.png (purpose: any)');
    console.log('  - icon-192x192-maskable.png (purpose: maskable)');
    console.log('  - icon-512x512.png (purpose: any)');
    console.log('  - icon-512x512-maskable.png (purpose: maskable)');

  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

// Run the script
generateIcons();
