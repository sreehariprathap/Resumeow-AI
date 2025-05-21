// chrome.d.ts - TypeScript declarations for Chrome Extension API
interface ChromeIdentity {
  launchWebAuthFlow(
    options: { url: string; interactive: boolean },
    callback: (redirectUrl?: string) => void
  ): void;
  
  getAuthToken(
    details: { interactive: boolean },
    callback: (token?: string) => void
  ): void;
  
  removeCachedAuthToken(
    details: { token: string },
    callback: () => void
  ): void;
}

interface ChromeRuntime {
  id: string;
  lastError?: { message: string };
}

interface Chrome {
  identity: ChromeIdentity;
  runtime: ChromeRuntime;
}

declare global {
  interface Window {
    chrome?: Chrome;
  }
  var chrome: Chrome | undefined;
}

export {};
