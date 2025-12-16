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

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  // Handle translation requests
  if (request.action === 'translate') {
    handleTranslationRequest(request)
      .then(result => sendResponse({ success: true, translation: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
  return true;
});

// Handle translation requests based on provider
async function handleTranslationRequest(request) {
  const { text, sourceLang, targetLang, provider, apiKey } = request;
  
  if (!text || text.length < 2) {
    return text;
  }
  
  try {
    if (provider === 'deepl' && apiKey) {
      return await translateWithDeepL(text, sourceLang, targetLang, apiKey);
    } else if (provider === 'chatgpt' && apiKey) {
      return await translateWithChatGPT(text, sourceLang, targetLang, apiKey);
    } else {
      return await translateWithMyMemory(text, sourceLang, targetLang);
    }
  } catch (error) {
    console.error('Background translation error:', error);
    throw error;
  }
}

// DeepL translation function
async function translateWithDeepL(text, sourceLang, targetLang, apiKey) {
  try {
    // Determine API endpoint based on API key type
    // Free API keys end with ':fx', Pro keys don't
    const isFreeApiKey = apiKey.endsWith(':fx');
    const apiUrl = isFreeApiKey 
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate';
    
    // Map language codes to DeepL format
    // For target language, DeepL requires specific variants for EN and PT
    const deeplTargetMap = {
      'en': 'EN-US',
      'pt': 'PT-PT'
    };
    const targetLangDeepL = deeplTargetMap[targetLang.toLowerCase()] || targetLang.toUpperCase();
    
    // Build request body
    const body = new URLSearchParams({
      'text': text,
      'target_lang': targetLangDeepL
    });
    
    // Add source language if not auto-detect
    if (sourceLang !== 'auto') {
      // For source language, DeepL accepts EN and PT without variants
      body.append('source_lang', sourceLang.toUpperCase());
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    
    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.translations && data.translations.length > 0) {
      return data.translations[0].text;
    }
    
    throw new Error('Translation failed: Invalid response from DeepL');
  } catch (error) {
    console.error('DeepL translation error:', error);
    throw error;
  }
}

// ChatGPT translation function
async function translateWithChatGPT(text, sourceLang, targetLang, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a translator. Translate the following text to ${targetLang}. Only return the translation, nothing else.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`ChatGPT API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content.trim();
  }
  
  throw new Error('ChatGPT translation failed');
}

// MyMemory translation function
async function translateWithMyMemory(text, sourceLang, targetLang) {
  try {
    const source = sourceLang === 'auto' ? '' : sourceLang;
    // When auto-detect, don't specify source language - let API detect it
    const langPair = source ? `${source}|${targetLang}` : targetLang;
    
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData) {
      return data.responseData.translatedText;
    }
    
    throw new Error('Translation failed: Invalid response');
  } catch (error) {
    console.error('MyMemory translation error:', error);
    throw error;
  }
}
