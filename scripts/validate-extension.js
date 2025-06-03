#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildDir = path.join(__dirname, '../build');

console.log('🔍 Validating Chrome Extension Build...\n');

// Check if build directory exists
if (!fs.existsSync(buildDir)) {
  console.error('❌ Build directory not found. Run "npm run build:extension" first.');
  process.exit(1);
}

// Required files for Chrome extension
const requiredFiles = [
  'manifest.json',
  'sidepanel.html',
  'service-worker.js',
  'icon.png',
  'assets/main.js',
  'assets/main.css'
];

let allFilesPresent = true;

requiredFiles.forEach(file => {
  const filePath = path.join(buildDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesPresent = false;
  }
});

// Validate manifest.json
try {
  const manifestPath = path.join(buildDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  console.log('\n📋 Manifest Validation:');
  console.log(`✅ Name: ${manifest.name}`);
  console.log(`✅ Version: ${manifest.version}`);
  console.log(`✅ Manifest Version: ${manifest.manifest_version}`);
  console.log(`✅ Permissions: ${manifest.permissions.join(', ')}`);
    if (!manifest.side_panel?.default_path) {
    console.log('❌ Missing side_panel.default_path');
    allFilesPresent = false;
  } else {
    console.log(`✅ Side Panel: ${manifest.side_panel.default_path}`);
  }
  
  if (!manifest.background?.service_worker) {
    console.log('❌ Missing background.service_worker');
    allFilesPresent = false;
  } else {
    console.log(`✅ Service Worker: ${manifest.background.service_worker}`);
  }
  
} catch (error) {
  console.log('❌ Invalid manifest.json:', error.message);
  allFilesPresent = false;
}

// Final result
console.log('\n' + '='.repeat(50));
if (allFilesPresent) {
  console.log('🎉 Extension build is valid and ready for installation!');
  console.log('\nTo install:');
  console.log('1. Open Chrome and go to chrome://extensions/');
  console.log('2. Enable "Developer mode"');
  console.log('3. Click "Load unpacked"');
  console.log(`4. Select the "build" folder: ${buildDir}`);
} else {
  console.log('❌ Extension build has issues. Please fix them before installation.');
  process.exit(1);
}
