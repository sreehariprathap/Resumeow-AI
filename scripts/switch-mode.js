#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const mode = process.argv[2];

if (!mode || !['pwa', 'extension'].includes(mode)) {
  console.log('Usage: node switch-mode.js [pwa|extension]');
  console.log('');
  console.log('This script helps switch between PWA and Extension development modes.');
  console.log('');
  console.log('Modes:');
  console.log('  pwa        - Configure for Progressive Web App development');
  console.log('  extension  - Configure for Chrome Extension development');
  process.exit(1);
}

const indexPath = path.join(__dirname, '..', 'index.html');
const webPath = path.join(__dirname, '..', 'web.html');

if (mode === 'pwa') {
  // Copy web.html to index.html for PWA development
  if (fs.existsSync(webPath)) {
    fs.copyFileSync(webPath, indexPath);
    console.log('✅ Switched to PWA mode');
    console.log('   - Copied web.html to index.html');
    console.log('   - Run: npm run dev (will use PWA configuration)');
    console.log('   - Build: npm run build:pwa');
  } else {
    console.error('❌ web.html not found');
    process.exit(1);
  }
} else if (mode === 'extension') {
  // Restore original extension index.html
  const extensionIndexContent = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/icon.png" />
    <meta name="viewport" content="width=400, initial-scale=1.0" />
    <meta name="description" content="Create optimized resume and cover letter prompts for AI assistants" />
    <title>Prompter - Resume & Cover Letter Assistant</title>
    <style>
      body {
        width: 400px;
        min-height: 600px;
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/extension.tsx"></script>
  </body>
</html>`;
  
  fs.writeFileSync(indexPath, extensionIndexContent);
  console.log('✅ Switched to Extension mode');
  console.log('   - Restored extension index.html');
  console.log('   - Run: npm run dev (will use Extension configuration)');
  console.log('   - Build: npm run build');
}

console.log('');
console.log('Available commands:');
console.log('  Development: npm run dev');
console.log('  Build:       npm run build');
if (mode === 'pwa') {
  console.log('  PWA Dev:     npm run dev:pwa');
  console.log('  PWA Build:   npm run build:pwa');
  console.log('  PWA Preview: npm run preview:pwa');
}
