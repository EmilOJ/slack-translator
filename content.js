// Content script for Slack Translator
(function() {
  'use strict';

  // Configuration constants
  const DEBOUNCE_DELAY_MS = 500; // Wait time before translating while typing
  const DOM_UPDATE_DELAY_MS = 50; // Wait for DOM updates before sending

  let isEnabled = true;
  let sourceLanguage = 'auto';
  let targetLanguage = 'en';
  let translationProvider = 'deepl';
  let apiKey = '';
  let translateOutgoing = true; // Translate outgoing messages before sending
  let processedMessages = new Set();
  let lastInputValue = '';
  let lastTranslation = ''; // Store the last translation for sending
  let previewElement = null;
  let debounceTimer = null;

  // Load settings from storage
  chrome.storage.sync.get(
    ['enabled', 'sourceLanguage', 'targetLanguage', 'translationProvider', 'apiKey', 'translateOutgoing'],
    function(result) {
      isEnabled = result.enabled !== undefined ? result.enabled : true;
      sourceLanguage = result.sourceLanguage || 'auto';
      targetLanguage = result.targetLanguage || 'en';
      translationProvider = result.translationProvider || 'deepl';
      apiKey = result.apiKey || '';
      translateOutgoing = result.translateOutgoing !== undefined ? result.translateOutgoing : true;
      
      if (isEnabled) {
        init();
      }
    }
  );

  // Listen for settings changes
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync') {
      if (changes.enabled) {
        isEnabled = changes.enabled.newValue;
        if (isEnabled) {
          init();
        } else {
          cleanup();
        }
      }
      if (changes.sourceLanguage) sourceLanguage = changes.sourceLanguage.newValue;
      if (changes.targetLanguage) targetLanguage = changes.targetLanguage.newValue;
      if (changes.translationProvider) translationProvider = changes.translationProvider.newValue;
      if (changes.apiKey) apiKey = changes.apiKey.newValue;
      if (changes.translateOutgoing !== undefined) translateOutgoing = changes.translateOutgoing.newValue;
    }
  });

  function init() {
    // Start observing for new messages
    observeMessages();
    // Start observing input field for typing
    observeInputField();
    // Intercept message sending if translateOutgoing is enabled
    if (translateOutgoing) {
      interceptMessageSending();
    }
  }

  function cleanup() {
    // Remove all translation elements
    document.querySelectorAll('.slack-translator-translation').forEach(el => el.remove());
    if (previewElement) {
      previewElement.remove();
      previewElement = null;
    }
    processedMessages.clear();
  }

  // Observe for new messages in Slack
  function observeMessages() {
    const observer = new MutationObserver(function(mutations) {
      if (!isEnabled) return;
      
      // Find all message elements - looking for the message blocks that contain text
      const messages = document.querySelectorAll('.c-message_kit__blocks[data-qa="message-text"]');
      
      messages.forEach(function(messageElement) {
        processMessage(messageElement);
      });
    });

    // Start observing the document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Process existing messages
    setTimeout(function() {
      const messages = document.querySelectorAll('.c-message_kit__blocks[data-qa="message-text"]');
      messages.forEach(function(messageElement) {
        processMessage(messageElement);
      });
    }, 1000);
  }

  function processMessage(messageElement) {
    // Create a unique identifier for this message
    const messageId = getMessageId(messageElement);
    if (!messageId || processedMessages.has(messageId)) {
      return;
    }

    // Find the text content of the message - looking for p-rich_text_section elements
    const textElements = messageElement.querySelectorAll('.p-rich_text_section');

    if (textElements.length === 0) return;

    let messageText = '';
    textElements.forEach(function(el) {
      const text = el.textContent.trim();
      if (text) {
        messageText += text + ' ';
      }
    });

    messageText = messageText.trim();
    if (!messageText || messageText.length < 2) return;

    // Mark as processed
    processedMessages.add(messageId);

    // Find a good place to insert the translation
    const insertionPoint = findInsertionPoint(messageElement);
    if (!insertionPoint) return;

    // Create translation element
    const translationElement = document.createElement('div');
    translationElement.className = 'slack-translator-translation';
    translationElement.innerHTML = '<span class="slack-translator-loading">Translating...</span>';
    
    insertionPoint.appendChild(translationElement);

    // Translate the message
    translateText(messageText).then(function(translation) {
      if (translation && translation !== messageText) {
        translationElement.innerHTML = `
          <span class="slack-translator-label">Translation:</span>
          <span class="slack-translator-text">${escapeHtml(translation)}</span>
        `;
      } else {
        translationElement.remove();
      }
    }).catch(function(error) {
      console.error('Translation error:', error);
      translationElement.remove();
    });
  }

  function getMessageId(element) {
    // Try to find a unique identifier
    const tsAttr = element.getAttribute('data-ts');
    if (tsAttr) return tsAttr;
    
    const idAttr = element.getAttribute('id');
    if (idAttr) return idAttr;
    
    // Use the text content as a fallback
    const text = element.textContent.trim().substring(0, 100);
    return text ? `text_${hashCode(text)}` : null;
  }

  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  function findInsertionPoint(messageElement) {
    // The messageElement is the .c-message_kit__blocks container itself
    // We can append directly to it
    return messageElement;
  }

  // Observe input field for typing
  function observeInputField() {
    const observer = new MutationObserver(function(mutations) {
      if (!isEnabled) return;
      
      // Look for the Quill editor used by Slack
      const inputFields = document.querySelectorAll('.ql-editor[contenteditable="true"][role="textbox"]');
      
      inputFields.forEach(function(inputField) {
        if (!inputField.hasAttribute('data-translator-attached')) {
          inputField.setAttribute('data-translator-attached', 'true');
          attachInputListener(inputField);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Attach to existing input fields
    setTimeout(function() {
      const inputFields = document.querySelectorAll('.ql-editor[contenteditable="true"][role="textbox"]');
      
      inputFields.forEach(function(inputField) {
        if (!inputField.hasAttribute('data-translator-attached')) {
          inputField.setAttribute('data-translator-attached', 'true');
          attachInputListener(inputField);
        }
      });
    }, 1000);
  }

  function attachInputListener(inputField) {
    inputField.addEventListener('input', function() {
      handleInputChange(inputField);
    });

    inputField.addEventListener('focus', function() {
      handleInputChange(inputField);
    });
  }

  function handleInputChange(inputField) {
    if (!isEnabled) return;

    const currentValue = inputField.textContent || inputField.value || '';
    
    if (currentValue === lastInputValue) return;
    lastInputValue = currentValue;

    // Clear previous debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // If input is empty, remove preview
    if (!currentValue.trim()) {
      removePreview();
      return;
    }

    // Debounce translation
    debounceTimer = setTimeout(function() {
      showTranslationPreview(inputField, currentValue.trim());
    }, DEBOUNCE_DELAY_MS);
  }

  function showTranslationPreview(inputField, text) {
    if (!text || text.length < 2) {
      removePreview();
      return;
    }

    // Create or update preview element
    if (!previewElement) {
      previewElement = document.createElement('div');
      previewElement.className = 'slack-translator-preview';
    }

    previewElement.innerHTML = '<span class="slack-translator-loading">Translating preview...</span>';

    // Find where to insert the preview (above the input field)
    // The input field is the .ql-editor, its parent is .ql-container
    const inputContainer = inputField.parentElement;
    if (inputContainer && !inputContainer.contains(previewElement)) {
      inputContainer.insertBefore(previewElement, inputField);
    }

    // Translate and show preview
    translateText(text).then(function(translation) {
      if (translation && translation !== text) {
        lastTranslation = translation; // Store for sending
        const label = translateOutgoing ? 'Will send:' : 'Translation:';
        previewElement.innerHTML = `
          <span class="slack-translator-label">${label}</span>
          <span class="slack-translator-text">${escapeHtml(translation)}</span>
        `;
      } else {
        lastTranslation = text; // No translation, use original
        removePreview();
      }
    }).catch(function(error) {
      console.error('Preview translation error:', error);
      lastTranslation = text; // On error, use original
      removePreview();
    });
  }

  function removePreview() {
    if (previewElement && previewElement.parentElement) {
      previewElement.remove();
    }
    previewElement = null;
  }

  // Translation function
  async function translateText(text) {
    if (!text || text.length < 2) return text;

    try {
      if (translationProvider === 'deepl' && apiKey) {
        return await translateWithDeepL(text);
      } else if (translationProvider === 'chatgpt' && apiKey) {
        return await translateWithChatGPT(text);
      } else {
        return await translateWithMyMemory(text);
      }
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }

  async function translateWithMyMemory(text) {
    try {
      const sourceLang = sourceLanguage === 'auto' ? '' : sourceLanguage;
      // When auto-detect, don't specify source language - let API detect it
      const langPair = sourceLang ? `${sourceLang}|${targetLanguage}` : targetLanguage;
      
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

  async function translateWithDeepL(text) {
    try {
      // Determine API endpoint based on API key type
      // Free API keys end with ':fx', Pro keys don't
      const isFreeApiKey = apiKey.endsWith(':fx');
      const apiUrl = isFreeApiKey 
        ? 'https://api-free.deepl.com/v2/translate'
        : 'https://api.deepl.com/v2/translate';
      
      // Map language codes to DeepL format (DeepL uses uppercase)
      const targetLang = targetLanguage.toUpperCase();
      
      // Build request body
      const body = new URLSearchParams({
        'text': text,
        'target_lang': targetLang
      });
      
      // Add source language if not auto-detect
      if (sourceLanguage !== 'auto') {
        body.append('source_lang', sourceLanguage.toUpperCase());
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

  async function translateWithChatGPT(text) {
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
            content: `You are a translator. Translate the following text to ${targetLanguage}. Only return the translation, nothing else.`
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

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim();
    }
    
    throw new Error('ChatGPT translation failed');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Intercept message sending to replace with translation
  function interceptMessageSending() {
    // Observe for send button and Enter key presses
    document.addEventListener('keydown', function(e) {
      if (!isEnabled || !translateOutgoing) return;
      
      // Check if Enter was pressed (without Shift, which adds a new line)
      if (e.key === 'Enter' && !e.shiftKey) {
        const target = e.target;
        
        // Check if we're in a Slack input field
        if (target.classList.contains('ql-editor') && 
            target.getAttribute('role') === 'textbox' &&
            target.getAttribute('contenteditable') === 'true') {
          
          const originalText = target.textContent.trim();
          
          // If we have a translation ready and it's different from original
          if (lastTranslation && lastTranslation !== originalText && originalText) {
            e.preventDefault();
            e.stopPropagation();
            
            // Replace the content with the translation
            replaceInputContent(target, lastTranslation);
            
            // Trigger the send after DOM updates are complete
            setTimeout(function() {
              // Simulate Enter key press to send the message
              const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
              });
              target.dispatchEvent(enterEvent);
              
              // Clear the stored translation
              lastTranslation = '';
              lastInputValue = '';
              removePreview();
            }, DOM_UPDATE_DELAY_MS);
          }
        }
      }
    }, true); // Use capture phase to intercept before Slack's handlers

    // Also observe for send button clicks
    const observer = new MutationObserver(function() {
      const sendButtons = document.querySelectorAll('[data-qa="texty_send_button"]');
      
      sendButtons.forEach(function(button) {
        if (!button.hasAttribute('data-translator-send-attached')) {
          button.setAttribute('data-translator-send-attached', 'true');
          
          button.addEventListener('click', function(e) {
            if (!isEnabled || !translateOutgoing) return;
            
            // Find the associated input field
            const form = button.closest('[data-qa="message_input"]')?.parentElement;
            if (!form) return;
            
            const inputField = form.querySelector('.ql-editor[contenteditable="true"]');
            if (!inputField) return;
            
            const originalText = inputField.textContent.trim();
            
            // If we have a translation ready
            if (lastTranslation && lastTranslation !== originalText && originalText) {
              e.preventDefault();
              e.stopPropagation();
              
              // Replace the content with the translation
              replaceInputContent(inputField, lastTranslation);
              
              // Trigger the send after DOM updates are complete
              setTimeout(function() {
                button.click();
                
                // Clear the stored translation
                lastTranslation = '';
                lastInputValue = '';
                removePreview();
              }, DOM_UPDATE_DELAY_MS);
            }
          }, true);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function replaceInputContent(inputField, newText) {
    // Clear existing content
    inputField.innerHTML = '';
    
    // Create a paragraph with the new text
    const p = document.createElement('p');
    p.textContent = newText;
    inputField.appendChild(p);
    
    // Place cursor at the end
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(inputField);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    
    // Trigger input event so Slack knows the content changed
    inputField.dispatchEvent(new Event('input', { bubbles: true }));
  }

  console.log('Slack Translator: Content script loaded');
})();
