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

// Maskable icons must fill the canvas with an opaque background (no
// transparency) so Android's adaptive-icon mask never reveals the
// system background (shows up as a black box on the home screen /
// splash screen). Logo content stays inside the 80% safe-zone circle.
const MASKABLE_SIZES = [
  { size: 192, name: '192x192-maskable' },
  { size: 512, name: '512x512-maskable' },
];

// apple-touch-icon: iOS fills transparent PNG areas with black on the
// home screen icon and default splash screen, so this must be opaque
// white too. Not masked by the OS, so the logo can fill more of the
// canvas than the maskable safe zone allows.
const APPLE_TOUCH_ICON = { size: 180, fillRatio: 0.92, fileName: 'apple-touch-icon.png' };

async function generateIcon(outputPath, size, fillRatio) {
  const logoSize = Math.floor(size * fillRatio);

  const whiteCanvas = await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }, // White background
    },
  }).png().toBuffer();

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
}

async function generateWhiteBackgroundIcons() {
  try {
    // Ensure icons directory exists
    await fs.mkdir(ICONS_DIR, { recursive: true });

    console.log('Generating PWA icons with white background...');

    for (const { size, name } of SIZES) {
      const outputPath = path.join(ICONS_DIR, `icon-${name}-white.png`);
      await generateIcon(outputPath, size, 0.8);
      console.log(`✓ Generated: icon-${name}-white.png`);
    }

    for (const { size, name } of MASKABLE_SIZES) {
      const outputPath = path.join(ICONS_DIR, `icon-${name}.png`);
      await generateIcon(outputPath, size, 0.8);
      console.log(`✓ Generated: icon-${name}.png`);
    }

    await generateIcon(
      path.join(ICONS_DIR, APPLE_TOUCH_ICON.fileName),
      APPLE_TOUCH_ICON.size,
      APPLE_TOUCH_ICON.fillRatio
    );
    console.log(`✓ Generated: ${APPLE_TOUCH_ICON.fileName}`);

    console.log('\n✓ All white-background icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error.message);
    process.exit(1);
  }
}

generateWhiteBackgroundIcons();
