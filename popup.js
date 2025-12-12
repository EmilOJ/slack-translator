// Popup script for Slack Translator settings
document.addEventListener('DOMContentLoaded', function() {
  const enabledCheckbox = document.getElementById('enabled');
  const translateOutgoingCheckbox = document.getElementById('translateOutgoing');
  const translationProviderSelect = document.getElementById('translationProvider');
  const apiKeyInput = document.getElementById('apiKey');
  const apiKeySection = document.getElementById('apiKeySection');
  const yourLanguageSelect = document.getElementById('yourLanguage');
  const othersLanguageSelect = document.getElementById('othersLanguage');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');

  // Load saved settings
  chrome.storage.sync.get(
    ['enabled', 'translateOutgoing', 'translationProvider', 'apiKey', 'yourLanguage', 'othersLanguage', 'sourceLanguage', 'targetLanguage'],
    function(result) {
      enabledCheckbox.checked = result.enabled !== undefined ? result.enabled : true;
      translateOutgoingCheckbox.checked = result.translateOutgoing !== undefined ? result.translateOutgoing : true;
      translationProviderSelect.value = result.translationProvider || 'deepl';
      apiKeyInput.value = result.apiKey || '';
      
      // Handle migration from old settings (sourceLanguage/targetLanguage) to new (yourLanguage/othersLanguage)
      // Old logic: sourceLanguage (what to translate from) -> targetLanguage (what to translate to)
      // New logic: yourLanguage (your language), othersLanguage (their language)
      // For incoming: othersLanguage -> yourLanguage
      // For outgoing: yourLanguage -> othersLanguage
      if (result.yourLanguage !== undefined) {
        yourLanguageSelect.value = result.yourLanguage;
      } else if (result.targetLanguage !== undefined) {
        // Migrate: targetLanguage was where we translate TO, which is YOUR language for incoming
        yourLanguageSelect.value = result.targetLanguage;
      } else {
        yourLanguageSelect.value = 'en';
      }
      
      if (result.othersLanguage !== undefined) {
        othersLanguageSelect.value = result.othersLanguage;
      } else if (result.sourceLanguage !== undefined) {
        // Migrate: sourceLanguage was where we translate FROM, which is OTHERS' language for incoming
        othersLanguageSelect.value = result.sourceLanguage;
      } else {
        othersLanguageSelect.value = 'auto';
      }

      // Show/hide API key section based on provider
      toggleApiKeySection();
    }
  );

  // Toggle API key section visibility
  function toggleApiKeySection() {
    if (translationProviderSelect.value === 'chatgpt' || translationProviderSelect.value === 'deepl') {
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
      yourLanguage: yourLanguageSelect.value,
      othersLanguage: othersLanguageSelect.value
    };

    // Validate settings
    if ((settings.translationProvider === 'chatgpt' || settings.translationProvider === 'deepl') && !settings.apiKey) {
      showStatus('Please enter an API key for the selected translation service', 'error');
      return;
    }

    chrome.storage.sync.set(settings, function() {
      showStatus('Settings saved! Changes will apply immediately.', 'success');
      
      // Note: Content script listens for storage changes via chrome.storage.onChanged
      // So we don't need to reload tabs - changes apply dynamically
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
