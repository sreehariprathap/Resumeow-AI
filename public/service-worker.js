// Chrome Extension Service Worker for Prompter Side Panel

// Set up the side panel on extension installation
chrome.runtime.onInstalled.addListener(() => {
  // Enable the side panel to open when clicking the action icon
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Failed to set panel behavior:', error));
});

// Optional: Handle action icon clicks to ensure side panel opens
chrome.action.onClicked.addListener((tab) => {
  // Open the side panel in the current window
  chrome.sidePanel.open({ windowId: tab.windowId })
    .catch((error) => console.error('Failed to open side panel:', error));
});

// Optional: Log side panel events for debugging
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    console.log('Side panel connected');
    
    port.onDisconnect.addListener(() => {
      console.log('Side panel disconnected');
    });
  }
});
