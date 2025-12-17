// Background service worker for Slack Translator

// Request queue and rate limiting
const requestQueue = [];
let isProcessingQueue = false;
const RATE_LIMIT_DELAY_MS = 200; // 200ms between requests = 5 requests per second
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000; // Start with 1 second backoff

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
    // Add request to queue
    queueTranslationRequest(request)
      .then(result => sendResponse({ success: true, translation: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
  return true;
});

// Queue a translation request
async function queueTranslationRequest(request) {
  return new Promise((resolve, reject) => {
    // Add request to queue with its resolver/rejecter
    requestQueue.push({
      request,
      resolve,
      reject,
      retryCount: 0
    });
    
    // Start processing queue if not already processing
    if (!isProcessingQueue) {
      processQueue();
    }
  });
}

// Process the request queue with rate limiting
async function processQueue() {
  if (isProcessingQueue) return;
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const queueItem = requestQueue.shift();
    
    try {
      // Process the request
      const result = await handleTranslationRequest(queueItem.request);
      queueItem.resolve(result);
      
      // Wait for rate limit delay before processing next request
      if (requestQueue.length > 0) {
        await sleep(RATE_LIMIT_DELAY_MS);
      }
    } catch (error) {
      // Check if it's a 429 error
      if (error.message.includes('429') && queueItem.retryCount < MAX_RETRIES) {
        // Exponential backoff
        const backoffDelay = INITIAL_BACKOFF_MS * Math.pow(2, queueItem.retryCount);
        console.log(`Rate limited (429), retrying in ${backoffDelay}ms (attempt ${queueItem.retryCount + 1}/${MAX_RETRIES})`);
        
        // Increment retry count and re-queue
        queueItem.retryCount++;
        
        // Wait for backoff delay
        await sleep(backoffDelay);
        
        // Add back to the front of the queue for retry
        requestQueue.unshift(queueItem);
      } else {
        // If max retries exceeded or different error, reject
        queueItem.reject(error);
      }
    }
  }
  
  isProcessingQueue = false;
}

// Helper function for delays
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    
    // Normalize language codes
    const normalizedTargetLang = targetLang.toLowerCase();
    const normalizedSourceLang = sourceLang.toLowerCase();
    
    // Map language codes to DeepL format
    // For target language, DeepL requires specific variants for EN and PT
    const deeplTargetMap = {
      'en': 'EN-US',
      'pt': 'PT-PT'
    };
    const targetLangDeepL = deeplTargetMap[normalizedTargetLang] || targetLang.toUpperCase();
    
    // Build request body
    const body = new URLSearchParams({
      'text': text,
      'target_lang': targetLangDeepL,
      'formality': 'prefer_more'
    });
    
    // Add source language if not auto-detect
    if (normalizedSourceLang !== 'auto') {
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
