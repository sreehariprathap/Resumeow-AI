# Chrome Extension Installation Guide

## Quick Installation Steps

### 1. Build the Extension
```bash
npm install
npm run build:extension
```

### 2. Load in Chrome
1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle switch in top-right corner)
4. Click **"Load unpacked"** button
5. Navigate to and select your project's `build` folder
6. The extension should now appear in your extensions list

### 3. Pin the Extension (Recommended)
1. Click the **Extensions** icon (puzzle piece) in Chrome toolbar
2. Find **"Resumeow - Resume & Cover Letter Assistant"**
3. Click the **pin icon** to keep it visible in the toolbar

### 4. Test the Extension
1. Click the Resumeow icon in your Chrome toolbar
2. The side panel should open on the right side of the browser showing the application interface
3. You can now use the extension to generate resume and cover letter prompts

## Side Panel Features
- **Persistent**: The side panel stays open as you navigate between tabs
- **Resizable**: You can adjust the width by dragging the panel edge
- **Full functionality**: All features work the same as the web version
- **Easy access**: Click the extension icon to toggle the side panel open/closed

## Troubleshooting

### Extension doesn't load
- Make sure you selected the `build` folder, not the project root
- Check that `manifest.json` exists in the build folder
- Run `npm run validate:extension` to check the build

### Popup doesn't open
- Check the Chrome extensions page for any error messages
- Right-click the extension icon and select "Inspect" to see console errors for the side panel
- Ensure all required permissions are granted
- Make sure the sidePanel permission is included in the manifest

### Authentication issues
- Make sure you have an internet connection
- Check that the Google OAuth client ID is correctly configured
- Firebase authentication requires the proper domains to be whitelisted

## File Structure
After building, your `build` folder should contain:
```
build/
├── manifest.json      # Extension configuration
├── sidepanel.html     # Side panel HTML entry point
├── service-worker.js  # Background service worker
├── icon.png          # Extension icon
├── assets/
│   ├── main.js       # Main application bundle
│   └── main.css      # Compiled styles
└── screenshots/      # App screenshots
```
├── icon.png          # Extension icon
└── assets/
    ├── main.js       # Application JavaScript
    └── main.css      # Application styles
```

## Updating the Extension
When you make changes to the code:
1. Run `npm run build:extension` again
2. Go to `chrome://extensions/`
3. Click the **refresh icon** on your extension card
4. The extension will reload with your changes
