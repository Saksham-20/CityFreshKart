// Fix for Render deployment - create public directory and index.html
const fs = require('fs');
const path = require('path');

console.log('=== Creating public directory and index.html ===');

// Check if we're in the right directory
console.log('Current working directory:', process.cwd());
console.log('Contents of current directory:', fs.readdirSync('.'));

// Create public directory if it doesn't exist
if (!fs.existsSync('public')) {
  console.log('Creating public directory...');
  fs.mkdirSync('public');
}

// Create index.html file
const indexHtmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#81D8D0" />
    <meta name="description" content="CityFreshKart - Fresh vegetables and fruits delivered quickly to your doorstep" />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
    <title>CityFreshKart | Fresh Produce Delivered Daily</title>
    
    <!-- Preconnect to Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`;

console.log('Creating index.html...');
fs.writeFileSync('public/index.html', indexHtmlContent);

// Create manifest.json
const manifestContent = `{
  "short_name": "CityFreshKart",
  "name": "CityFreshKart",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#81D8D0",
  "background_color": "#ffffff"
}`;

console.log('Creating manifest.json...');
fs.writeFileSync('public/manifest.json', manifestContent);

// Create favicon.ico (empty file for now)
console.log('Creating favicon.ico...');
fs.writeFileSync('public/favicon.ico', '');

console.log('✅ Public directory and files created successfully');
console.log('Contents of public directory:', fs.readdirSync('public'));

console.log('=== Path fix completed ===');
