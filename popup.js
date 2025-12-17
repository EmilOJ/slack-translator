// Popup script for Slack Translator settings

// Current UI language cache
let currentUILanguage = 'en';

// Get the appropriate locale messages based on selected language
function getLocalizedMessage(messageName, lang) {
  // Create a map of all messages for the language
  const messages = {
    'en': {
      'extensionName': 'Slack Translator',
      'settingsTitle': '⚡ Slack Translator',
      'enableTranslation': 'Enable Translation',
      'translateOutgoing': 'Translate Outgoing Messages',
      'translateOutgoingDesc': 'When enabled, sends translated message instead of original (preview shown first)',
      'translationService': 'Translation Service',
      'deeplOption': 'DeepL (Requires API Key)',
      'deeplDescription': 'DeepL provides high-quality translations',
      'apiKeyLabel': 'API Key',
      'apiKeyPlaceholder': 'Enter API key',
      'apiKeyDescription': 'Your API key is stored locally and never shared',
      'yourLanguage': 'Your Language',
      'yourLanguageDesc': 'Your messages will be translated FROM this language',
      'othersLanguage': "Others' Language",
      'othersLanguageDesc': 'Their messages will be translated FROM this language',
      'saveSettings': 'Save Settings',
      'settingsSaved': 'Settings saved! Changes will apply immediately.',
      'apiKeyRequired': 'Please enter an API key for the selected translation service',
      'langAuto': 'Auto-detect',
      'langEnglish': 'English',
      'langSpanish': 'Spanish',
      'langFrench': 'French',
      'langGerman': 'German',
      'langItalian': 'Italian',
      'langPortuguese': 'Portuguese',
      'langRussian': 'Russian',
      'langJapanese': 'Japanese',
      'langKorean': 'Korean',
      'langChinese': 'Chinese',
      'langArabic': 'Arabic',
      'langHindi': 'Hindi',
      'langDutch': 'Dutch',
      'langPolish': 'Polish',
      'langTurkish': 'Turkish',
      'uiLanguage': 'Interface Language',
      'uiLanguageDesc': "Choose the language for this extension's interface",
      'uiLangEnglish': 'English',
      'uiLangJapanese': '日本語 (Japanese)',
      'formality': 'Translation Formality',
      'formalityDesc': 'Controls the tone of translations (formal or informal). Supported for: German, French, Italian, Spanish, Dutch, Polish, Portuguese, Japanese, and Russian.',
      'formalityDefault': 'Default',
      'formalityPreferMore': 'Prefer More Formal',
      'formalityPreferLess': 'Prefer More Informal'
    },
    'ja': {
      'extensionName': 'Slack翻訳',
      'settingsTitle': '⚡ Slack翻訳',
      'enableTranslation': '翻訳を有効にする',
      'translateOutgoing': '送信メッセージを翻訳',
      'translateOutgoingDesc': '有効にすると、元のメッセージの代わりに翻訳されたメッセージを送信します（プレビューが最初に表示されます）',
      'translationService': '翻訳サービス',
      'deeplOption': 'DeepL（APIキーが必要）',
      'deeplDescription': 'DeepLは高品質な翻訳を提供します',
      'apiKeyLabel': 'APIキー',
      'apiKeyPlaceholder': 'APIキーを入力',
      'apiKeyDescription': 'APIキーはローカルに保存され、共有されることはありません',
      'yourLanguage': 'あなたの言語',
      'yourLanguageDesc': 'あなたのメッセージはこの言語から翻訳されます',
      'othersLanguage': '相手の言語',
      'othersLanguageDesc': '相手のメッセージはこの言語から翻訳されます',
      'saveSettings': '設定を保存',
      'settingsSaved': '設定が保存されました！変更はすぐに適用されます。',
      'apiKeyRequired': '選択した翻訳サービスのAPIキーを入力してください',
      'langAuto': '自動検出',
      'langEnglish': '英語',
      'langSpanish': 'スペイン語',
      'langFrench': 'フランス語',
      'langGerman': 'ドイツ語',
      'langItalian': 'イタリア語',
      'langPortuguese': 'ポルトガル語',
      'langRussian': 'ロシア語',
      'langJapanese': '日本語',
      'langKorean': '韓国語',
      'langChinese': '中国語',
      'langArabic': 'アラビア語',
      'langHindi': 'ヒンディー語',
      'langDutch': 'オランダ語',
      'langPolish': 'ポーランド語',
      'langTurkish': 'トルコ語',
      'uiLanguage': 'インターフェース言語',
      'uiLanguageDesc': 'この拡張機能のインターフェースの言語を選択',
      'uiLangEnglish': 'English (英語)',
      'uiLangJapanese': '日本語',
      'formality': '翻訳の丁寧さ',
      'formalityDesc': '翻訳のトーン（フォーマル・カジュアル）を制御します。対応言語：ドイツ語、フランス語、イタリア語、スペイン語、オランダ語、ポーランド語、ポルトガル語、日本語、ロシア語',
      'formalityDefault': 'デフォルト',
      'formalityPreferMore': 'フォーマル優先',
      'formalityPreferLess': 'カジュアル優先'
    }
  };

  return messages[lang]?.[messageName] || chrome.i18n.getMessage(messageName) || '';
}

// Apply localization to all elements with data-i18n attributes
function localizeUI(lang) {
  currentUILanguage = lang || 'en';
  
  // Localize text content
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const messageName = element.getAttribute('data-i18n');
    const message = getLocalizedMessage(messageName, currentUILanguage);
    if (message) {
      element.textContent = message;
    }
  });

  // Localize placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const messageName = element.getAttribute('data-i18n-placeholder');
    const message = getLocalizedMessage(messageName, currentUILanguage);
    if (message) {
      element.placeholder = message;
    }
  });

  // Set the HTML lang attribute
  document.documentElement.lang = currentUILanguage;
}

document.addEventListener('DOMContentLoaded', function() {
  const uiLanguageSelect = document.getElementById('uiLanguage');
  const enabledCheckbox = document.getElementById('enabled');
  const translateOutgoingCheckbox = document.getElementById('translateOutgoing');
  const translationProviderSelect = document.getElementById('translationProvider');
  const apiKeyInput = document.getElementById('apiKey');
  const apiKeySection = document.getElementById('apiKeySection');
  const yourLanguageSelect = document.getElementById('yourLanguage');
  const othersLanguageSelect = document.getElementById('othersLanguage');
  const formalitySelect = document.getElementById('formality');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');

  // Load saved settings
  chrome.storage.sync.get(
    ['enabled', 'translateOutgoing', 'translationProvider', 'apiKey', 'yourLanguage', 'othersLanguage', 'sourceLanguage', 'targetLanguage', 'uiLanguage', 'formality'],
    function(result) {
      // Determine UI language: saved preference > browser language > default to English
      let uiLang = result.uiLanguage;
      if (!uiLang) {
        const browserLang = chrome.i18n.getUILanguage().split('-')[0];
        uiLang = (browserLang === 'ja') ? 'ja' : 'en';
      }
      uiLanguageSelect.value = uiLang;
      
      // Apply localization with the determined language
      localizeUI(uiLang);
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
      
      formalitySelect.value = result.formality || 'prefer_more';

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

  // Handle UI language changes
  uiLanguageSelect.addEventListener('change', function() {
    const newLang = uiLanguageSelect.value;
    // Save the UI language preference
    chrome.storage.sync.set({ uiLanguage: newLang }, function() {
      // Re-apply localization with new language
      localizeUI(newLang);
      // Re-populate the select values to maintain state
      uiLanguageSelect.value = newLang;
    });
  });

  // Save settings
  saveButton.addEventListener('click', function() {
    const settings = {
      enabled: enabledCheckbox.checked,
      translateOutgoing: translateOutgoingCheckbox.checked,
      translationProvider: translationProviderSelect.value,
      apiKey: apiKeyInput.value,
      yourLanguage: yourLanguageSelect.value,
      othersLanguage: othersLanguageSelect.value,
      uiLanguage: uiLanguageSelect.value,
      formality: formalitySelect.value
    };

    // Validate settings
    if ((settings.translationProvider === 'chatgpt' || settings.translationProvider === 'deepl') && !settings.apiKey) {
      showStatus(getLocalizedMessage('apiKeyRequired', currentUILanguage), 'error');
      return;
    }

    chrome.storage.sync.set(settings, function() {
      showStatus(getLocalizedMessage('settingsSaved', currentUILanguage), 'success');
      
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
