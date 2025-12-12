// Background service worker for Slack Translator
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // Set default settings on install
    chrome.storage.sync.set({
      enabled: true,
      translateOutgoing: true,
      translationProvider: 'deepl',
      sourceLanguage: 'auto',
      targetLanguage: 'en',
      apiKey: ''
    });
    
    // Open welcome page or settings
    console.log('Slack Translator installed successfully!');
  }
});

// Listen for messages from content scripts if needed
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Handle any background tasks if needed in the future
  return true;
});
