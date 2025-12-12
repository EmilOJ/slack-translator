// Popup script for Slack Translator settings
document.addEventListener('DOMContentLoaded', function() {
  const enabledCheckbox = document.getElementById('enabled');
  const translateOutgoingCheckbox = document.getElementById('translateOutgoing');
  const translationProviderSelect = document.getElementById('translationProvider');
  const apiKeyInput = document.getElementById('apiKey');
  const apiKeySection = document.getElementById('apiKeySection');
  const sourceLanguageSelect = document.getElementById('sourceLanguage');
  const targetLanguageSelect = document.getElementById('targetLanguage');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');

  // Load saved settings
  chrome.storage.sync.get(
    ['enabled', 'translateOutgoing', 'translationProvider', 'apiKey', 'sourceLanguage', 'targetLanguage'],
    function(result) {
      enabledCheckbox.checked = result.enabled !== undefined ? result.enabled : true;
      translateOutgoingCheckbox.checked = result.translateOutgoing !== undefined ? result.translateOutgoing : true;
      translationProviderSelect.value = result.translationProvider || 'mymemory';
      apiKeyInput.value = result.apiKey || '';
      sourceLanguageSelect.value = result.sourceLanguage || 'auto';
      targetLanguageSelect.value = result.targetLanguage || 'en';

      // Show/hide API key section based on provider
      toggleApiKeySection();
    }
  );

  // Toggle API key section visibility
  function toggleApiKeySection() {
    if (translationProviderSelect.value === 'chatgpt') {
      apiKeySection.style.display = 'block';
    } else {
      apiKeySection.style.display = 'none';
    }
  }

  translationProviderSelect.addEventListener('change', toggleApiKeySection);

  // Save settings
  saveButton.addEventListener('click', function() {
    const settings = {
      enabled: enabledCheckbox.checked,
      translateOutgoing: translateOutgoingCheckbox.checked,
      translationProvider: translationProviderSelect.value,
      apiKey: apiKeyInput.value,
      sourceLanguage: sourceLanguageSelect.value,
      targetLanguage: targetLanguageSelect.value
    };

    // Validate settings
    if (settings.translationProvider === 'chatgpt' && !settings.apiKey) {
      showStatus('Please enter an OpenAI API key', 'error');
      return;
    }

    chrome.storage.sync.set(settings, function() {
      showStatus('Settings saved successfully!', 'success');
      
      // Reload any open Slack tabs to apply changes
      chrome.tabs.query({ url: 'https://*.slack.com/*' }, function(tabs) {
        tabs.forEach(function(tab) {
          chrome.tabs.reload(tab.id);
        });
      });
    });
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';

    setTimeout(function() {
      statusDiv.style.display = 'none';
    }, 3000);
  }

  // Save on Enter key in API key field
  apiKeyInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      saveButton.click();
    }
  });
});
