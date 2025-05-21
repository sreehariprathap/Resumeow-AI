// Helper for debugging Chrome extension issues
export const extensionLogger = (message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = '[Extension Auth]';
  
  if (data) {
    console.log(`${prefix} ${timestamp} - ${message}`, data);
  } else {
    console.log(`${prefix} ${timestamp} - ${message}`);
  }
};

// Helper to check if key Firebase APIs are available
export const checkFirebaseAccess = () => {
  const checks = {
    chrome: typeof window.chrome !== 'undefined',
    identity: typeof window.chrome?.identity !== 'undefined',
    runtime: typeof window.chrome?.runtime !== 'undefined',
    runtimeId: typeof window.chrome?.runtime?.id === 'string',
    localStorage: typeof localStorage !== 'undefined',
    indexedDB: typeof indexedDB !== 'undefined',
    fetch: typeof fetch !== 'undefined',
    googleAPIs: true
  };

  // Test access to key Google/Firebase domains
  const testConnections = async () => {
    try {
      // Test connection to Google APIs
      const googleResponse = await fetch('https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword', { 
        method: 'OPTIONS'
      });
      checks.googleAPIs = googleResponse.ok || googleResponse.status === 204;
    } catch (error) {
      checks.googleAPIs = false;
      console.error('Firebase API access check failed:', error);
    }
    
    extensionLogger('Environment compatibility check results:', checks);
    return checks;
  };
  
  return testConnections();
};
