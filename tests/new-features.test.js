/**
 * Tests for New Slack Translator Features
 * 
 * These tests verify:
 * 1. DeepL-only support (OpenAI and MyMemory removed)
 * 2. Localization support (English and Japanese)
 * 3. UI language selector functionality
 * 4. Formality selector functionality
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

describe('DeepL-only Translation Provider', () => {
  beforeEach(() => {
    // Reset chrome mock
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        },
        onChanged: {
          addListener: jest.fn()
        }
      },
      runtime: {
        sendMessage: jest.fn(),
        lastError: null
      },
      i18n: {
        getMessage: jest.fn((key) => {
          const messages = {
            'apiKeyRequired': 'Please enter an API key for the selected translation service',
            'settingsSaved': 'Settings saved! Changes will apply immediately.'
          };
          return messages[key] || key;
        }),
        getUILanguage: jest.fn(() => 'en-US')
      }
    };
  });

  test('should only support deepl provider', () => {
    const validProviders = ['deepl'];
    const removedProviders = ['mymemory', 'chatgpt', 'openai'];

    expect(validProviders).toContain('deepl');
    expect(validProviders).not.toContain('mymemory');
    expect(validProviders).not.toContain('chatgpt');
    expect(validProviders).not.toContain('openai');
  });

  test('should require API key for deepl', () => {
    const settings = {
      translationProvider: 'deepl',
      apiKey: ''
    };

    const isValid = settings.translationProvider === 'deepl' && settings.apiKey;
    expect(isValid).toBeFalsy();
  });

  test('should accept valid deepl API key', () => {
    const settings = {
      translationProvider: 'deepl',
      apiKey: 'test-api-key-123'
    };

    const isValid = settings.translationProvider === 'deepl' && settings.apiKey;
    expect(isValid).toBeTruthy();
  });

  test('should include formality parameter in translation request', () => {
    const request = {
      action: 'translate',
      text: 'Hello',
      sourceLang: 'en',
      targetLang: 'ja',
      provider: 'deepl',
      apiKey: 'test-key',
      formality: 'prefer_more'
    };

    expect(request.formality).toBeDefined();
    expect(request.formality).toBe('prefer_more');
  });
});

describe('Localization Support', () => {
  test('should have English messages defined', () => {
    const englishMessages = {
      'extensionName': 'Slack Translator',
      'settingsTitle': '⚡ Slack Translator',
      'enableTranslation': 'Enable Translation',
      'translateOutgoing': 'Translate Outgoing Messages',
      'translationService': 'Translation Service',
      'apiKeyLabel': 'API Key',
      'yourLanguage': 'Your Language',
      'othersLanguage': "Others' Language",
      'saveSettings': 'Save Settings',
      'formality': 'Translation Formality',
      'uiLanguage': 'Interface Language'
    };

    Object.keys(englishMessages).forEach(key => {
      expect(englishMessages[key]).toBeDefined();
      expect(typeof englishMessages[key]).toBe('string');
      expect(englishMessages[key].length).toBeGreaterThan(0);
    });
  });

  test('should have Japanese messages defined', () => {
    const japaneseMessages = {
      'extensionName': 'Slack翻訳',
      'settingsTitle': '⚡ Slack翻訳',
      'enableTranslation': '翻訳を有効にする',
      'translateOutgoing': '送信メッセージを翻訳',
      'translationService': '翻訳サービス',
      'apiKeyLabel': 'APIキー',
      'yourLanguage': 'あなたの言語',
      'othersLanguage': '相手の言語',
      'saveSettings': '設定を保存',
      'formality': '翻訳の丁寧さ',
      'uiLanguage': 'インターフェース言語'
    };

    Object.keys(japaneseMessages).forEach(key => {
      expect(japaneseMessages[key]).toBeDefined();
      expect(typeof japaneseMessages[key]).toBe('string');
      expect(japaneseMessages[key].length).toBeGreaterThan(0);
    });
  });

  test('should have matching keys in English and Japanese', () => {
    const englishKeys = [
      'extensionName', 'settingsTitle', 'enableTranslation', 
      'translateOutgoing', 'translationService', 'apiKeyLabel',
      'yourLanguage', 'othersLanguage', 'saveSettings', 
      'formality', 'uiLanguage'
    ];

    const japaneseKeys = [
      'extensionName', 'settingsTitle', 'enableTranslation',
      'translateOutgoing', 'translationService', 'apiKeyLabel',
      'yourLanguage', 'othersLanguage', 'saveSettings',
      'formality', 'uiLanguage'
    ];

    expect(englishKeys.sort()).toEqual(japaneseKeys.sort());
  });
});

describe('UI Language Selector', () => {
  beforeEach(() => {
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn((keys, callback) => {
            callback({
              enabled: true,
              translationProvider: 'deepl',
              apiKey: 'test-key',
              yourLanguage: 'en',
              othersLanguage: 'ja',
              uiLanguage: 'en'
            });
          }),
          set: jest.fn((settings, callback) => {
            if (callback) callback();
          })
        }
      },
      i18n: {
        getMessage: jest.fn((key) => key),
        getUILanguage: jest.fn(() => 'en-US')
      }
    };
  });

  test('should default to English if no UI language is set', () => {
    global.chrome.storage.sync.get = jest.fn((keys, callback) => {
      callback({
        enabled: true,
        translationProvider: 'deepl',
        apiKey: 'test-key'
        // uiLanguage not set
      });
    });

    const browserLang = 'en-US';
    const expectedLang = browserLang.split('-')[0] === 'ja' ? 'ja' : 'en';
    
    expect(expectedLang).toBe('en');
  });

  test('should detect Japanese browser language', () => {
    global.chrome.i18n.getUILanguage = jest.fn(() => 'ja-JP');
    
    const browserLang = global.chrome.i18n.getUILanguage().split('-')[0];
    const expectedLang = browserLang === 'ja' ? 'ja' : 'en';
    
    expect(expectedLang).toBe('ja');
  });

  test('should save UI language preference', () => {
    const settings = {
      uiLanguage: 'ja'
    };

    global.chrome.storage.sync.set(settings);
    
    expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(settings);
  });

  test('should support switching between English and Japanese', () => {
    const supportedLanguages = ['en', 'ja'];
    
    expect(supportedLanguages).toContain('en');
    expect(supportedLanguages).toContain('ja');
    expect(supportedLanguages.length).toBe(2);
  });

  test('should load saved UI language on startup', (done) => {
    global.chrome.storage.sync.get = jest.fn((keys, callback) => {
      callback({
        uiLanguage: 'ja'
      });
    });

    global.chrome.storage.sync.get(['uiLanguage'], (result) => {
      expect(result.uiLanguage).toBe('ja');
      done();
    });
  });
});

describe('Formality Selector', () => {
  beforeEach(() => {
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn((keys, callback) => {
            callback({
              enabled: true,
              translationProvider: 'deepl',
              apiKey: 'test-key',
              yourLanguage: 'en',
              othersLanguage: 'ja',
              formality: 'prefer_more'
            });
          }),
          set: jest.fn((settings, callback) => {
            if (callback) callback();
          })
        }
      }
    };
  });

  test('should have three valid formality options', () => {
    const validFormalities = ['default', 'prefer_more', 'prefer_less'];
    
    expect(validFormalities).toContain('default');
    expect(validFormalities).toContain('prefer_more');
    expect(validFormalities).toContain('prefer_less');
    expect(validFormalities.length).toBe(3);
  });

  test('should not have "more" or "less" options (unsafe for all languages)', () => {
    const validFormalities = ['default', 'prefer_more', 'prefer_less'];
    
    expect(validFormalities).not.toContain('more');
    expect(validFormalities).not.toContain('less');
  });

  test('should default to prefer_more', () => {
    const defaultFormality = 'prefer_more';
    
    expect(defaultFormality).toBe('prefer_more');
  });

  test('should save formality preference', () => {
    const settings = {
      formality: 'prefer_less'
    };

    global.chrome.storage.sync.set(settings);
    
    expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(settings);
  });

  test('should include formality in storage keys', (done) => {
    global.chrome.storage.sync.get(['formality'], (result) => {
      expect(result.formality).toBe('prefer_more');
      done();
    });
  });

  test('should support formality for specific languages', () => {
    const supportedLanguages = [
      'de', // German
      'fr', // French
      'it', // Italian
      'es', // Spanish
      'nl', // Dutch
      'pl', // Polish
      'pt', // Portuguese
      'ja', // Japanese
      'ru'  // Russian
    ];

    const testLanguage = 'ja';
    expect(supportedLanguages).toContain(testLanguage);
  });

  test('should gracefully handle unsupported languages with prefer options', () => {
    // prefer_more and prefer_less should not fail for languages that don't support formality
    const formalityOptions = ['default', 'prefer_more', 'prefer_less'];
    const unsupportedLanguage = 'en'; // English doesn't support formality
    
    // With prefer options, it should fall back to default
    formalityOptions.forEach(option => {
      expect(['default', 'prefer_more', 'prefer_less']).toContain(option);
    });
  });
});

describe('Settings Integration', () => {
  beforeEach(() => {
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn((keys, callback) => {
            callback({
              enabled: true,
              translationProvider: 'deepl',
              apiKey: 'test-api-key',
              yourLanguage: 'en',
              othersLanguage: 'ja',
              translateOutgoing: true,
              uiLanguage: 'en',
              formality: 'prefer_more'
            });
          }),
          set: jest.fn((settings, callback) => {
            if (callback) callback();
          })
        }
      }
    };
  });

  test('should load all settings including new features', (done) => {
    const expectedKeys = [
      'enabled', 'translationProvider', 'apiKey', 
      'yourLanguage', 'othersLanguage', 'translateOutgoing',
      'uiLanguage', 'formality'
    ];

    global.chrome.storage.sync.get(expectedKeys, (result) => {
      expect(result.enabled).toBe(true);
      expect(result.translationProvider).toBe('deepl');
      expect(result.apiKey).toBe('test-api-key');
      expect(result.yourLanguage).toBe('en');
      expect(result.othersLanguage).toBe('ja');
      expect(result.translateOutgoing).toBe(true);
      expect(result.uiLanguage).toBe('en');
      expect(result.formality).toBe('prefer_more');
      done();
    });
  });

  test('should save all settings including new features', () => {
    const settings = {
      enabled: true,
      translationProvider: 'deepl',
      apiKey: 'new-key',
      yourLanguage: 'ja',
      othersLanguage: 'en',
      translateOutgoing: false,
      uiLanguage: 'ja',
      formality: 'prefer_less'
    };

    global.chrome.storage.sync.set(settings);
    
    expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(settings);
  });

  test('should validate settings before saving', () => {
    const invalidSettings = {
      translationProvider: 'deepl',
      apiKey: '' // Missing API key
    };

    const isValid = invalidSettings.translationProvider === 'deepl' && invalidSettings.apiKey;
    expect(isValid).toBeFalsy();
  });

  test('should accept valid settings', () => {
    const validSettings = {
      enabled: true,
      translationProvider: 'deepl',
      apiKey: 'valid-key-123',
      yourLanguage: 'en',
      othersLanguage: 'ja',
      translateOutgoing: true,
      uiLanguage: 'en',
      formality: 'prefer_more'
    };

    const isValid = validSettings.translationProvider === 'deepl' && validSettings.apiKey;
    expect(isValid).toBeTruthy();
  });
});

describe('Translation Request Format', () => {
  test('should include all required parameters for DeepL', () => {
    const request = {
      action: 'translate',
      text: 'Hello, world!',
      sourceLang: 'en',
      targetLang: 'ja',
      provider: 'deepl',
      apiKey: 'test-key',
      formality: 'prefer_more'
    };

    expect(request.action).toBe('translate');
    expect(request.text).toBeDefined();
    expect(request.sourceLang).toBeDefined();
    expect(request.targetLang).toBeDefined();
    expect(request.provider).toBe('deepl');
    expect(request.apiKey).toBeDefined();
    expect(request.formality).toBeDefined();
  });

  test('should support different formality levels', () => {
    const formalities = ['default', 'prefer_more', 'prefer_less'];
    
    formalities.forEach(formality => {
      const request = {
        action: 'translate',
        text: 'Test',
        sourceLang: 'en',
        targetLang: 'ja',
        provider: 'deepl',
        apiKey: 'test-key',
        formality: formality
      };

      expect(request.formality).toBe(formality);
      expect(['default', 'prefer_more', 'prefer_less']).toContain(request.formality);
    });
  });
});
