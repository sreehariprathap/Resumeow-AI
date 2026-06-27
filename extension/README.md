# Resumeow Chrome Extension

Smart job autofill powered by your Resumeow resume profile and Gemini AI.

## Build

```bash
cd extension
npm install
npm run build
```

Output lands in `extension/dist/`.

## Load in Chrome (dev)

1. Go to `chrome://extensions`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/dist/` folder

## How it works

1. Sign in to [resumeow.app](https://resumeow.app) and complete your resume profile
2. Navigate to a supported job listing
3. Click the Resumeow extension icon
4. Hit **Auto-Fill Application** — the extension fills your name, email, phone, location, LinkedIn, and AI-generated cover letter + answers

## Supported job sites

| Site | Match pattern |
|------|--------------|
| LinkedIn | `linkedin.com/jobs/*` |
| Indeed | `indeed.com/*` |
| Greenhouse | `*.greenhouse.io/jobs/*` |
| Lever | `*.lever.co/*` |
| Ashby | `*.ashby.io/*` / `jobs.ashbyhq.com/*` |
| Workday | `*.workday.com/*` |
| Glassdoor | `glassdoor.com/job-listing/*` |
| SmartRecruiters | `*.smartrecruiters.com/*` |

## AI features

The extension uses **Gemini 2.0 Flash** (via background service worker) to generate:
- Tailored cover letter
- "Why this company" answer
- Additional info / pitch statement
- Years of experience

To use AI answers you need a Gemini API key stored in `chrome.storage.local` under the key `geminiApiKey`. Open the Chrome DevTools console on any extension page and run:

```js
chrome.storage.local.set({ geminiApiKey: 'YOUR_KEY_HERE' });
```

## Known limitations

- **React-controlled inputs**: uses native setter + synthetic events to bypass React's state tracking. Works on most sites; some Workday/SuccessFactors screens may need manual confirmation.
- **File upload fields** (resume PDF): not handled — upload your resume manually after autofill.
- **CAPTCHA / multi-step forms**: the extension fills one screen at a time; re-click after each page transition.
- **Auth sharing**: the extension reads Firebase auth from the same browser session as the web app. If you use a different browser profile, sign in again via the popup.

## Publishing to Chrome Web Store

1. Replace placeholder icons in `icons/` with real 16×16, 48×48, 128×128 PNGs
2. Set your Gemini API key strategy (store securely, not hardcoded)
3. `npm run build`
4. Zip `extension/dist/`: `cd dist && zip -r ../resumeow-extension.zip .`
5. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
