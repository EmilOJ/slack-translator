// Content script for Slack Translator
(function() {
  'use strict';

  // Configuration constants
  const DEBOUNCE_DELAY_MS = 1000; // Wait time before translating while typing (increased from 500ms)
  const DOM_UPDATE_DELAY_MS = 50; // Wait for DOM updates before sending

  let isEnabled = true;
  let yourLanguage = 'en'; // Your language (user's language)
  let othersLanguage = 'auto'; // Others' language (people you're communicating with)
  let translationProvider = 'deepl';
  let apiKey = '';
  let translateOutgoing = true; // Translate outgoing messages before sending
  let processedMessages = new Set();
  let lastInputValue = '';
  let lastTranslation = ''; // Store the last translation for sending
  let previewElement = null;
  let debounceTimer = null;
  let translationAccepted = false; // Flag to prevent re-translation after accepting
  let isReplacingContent = false; // Flag to indicate programmatic content replacement
  let isSendingMessage = false; // Flag to prevent re-triggering during send

  // Load settings from storage
  chrome.storage.sync.get(
    ['enabled', 'yourLanguage', 'othersLanguage', 'sourceLanguage', 'targetLanguage', 'translationProvider', 'apiKey', 'translateOutgoing'],
    function(result) {
      isEnabled = result.enabled !== undefined ? result.enabled : true;
      
      // Handle migration from old settings (sourceLanguage/targetLanguage) to new (yourLanguage/othersLanguage)
      if (result.yourLanguage !== undefined) {
        yourLanguage = result.yourLanguage;
      } else if (result.targetLanguage !== undefined) {
        yourLanguage = result.targetLanguage;
      } else {
        yourLanguage = 'en';
      }
      
      if (result.othersLanguage !== undefined) {
        othersLanguage = result.othersLanguage;
      } else if (result.sourceLanguage !== undefined) {
        othersLanguage = result.sourceLanguage;
      } else {
        othersLanguage = 'auto';
      }
      
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
      if (changes.yourLanguage) yourLanguage = changes.yourLanguage.newValue;
      if (changes.othersLanguage) othersLanguage = changes.othersLanguage.newValue;
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
    // Clear the processed data attributes - only look in message containers
    const messageContainers = document.querySelectorAll('.c-message__message_blocks, .c-virtual_list__item');
    messageContainers.forEach(container => {
      const processed = container.querySelectorAll('[data-translator-processed]');
      processed.forEach(el => el.removeAttribute('data-translator-processed'));
    });
    processedMessages.clear();
  }

  // Observe for new messages in Slack
  function observeMessages() {
    const observer = new MutationObserver(function(mutations) {
      if (!isEnabled) return;
      
      // Find all message elements - looking for the message blocks that contain text
      const messages = document.querySelectorAll('.c-message__message_blocks[data-qa="message-text"]');
      
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
      const messages = document.querySelectorAll('.c-message__message_blocks[data-qa="message-text"]');
      messages.forEach(function(messageElement) {
        processMessage(messageElement);
      });
    }, 1000);
  }

  function processMessage(messageElement) {
    // Check if this element has already been processed using a data attribute
    if (messageElement.getAttribute('data-translator-processed') === 'true') {
      return;
    }

    // Create a unique identifier for this message
    const messageId = getMessageId(messageElement);
    if (!messageId || processedMessages.has(messageId)) {
      messageElement.setAttribute('data-translator-processed', 'true');
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

    // Mark as processed with both the Set and data attribute
    processedMessages.add(messageId);
    messageElement.setAttribute('data-translator-processed', 'true');

    // Find a good place to insert the translation
    const insertionPoint = findInsertionPoint(messageElement);
    if (!insertionPoint) return;

    // Create translation element (but don't translate yet)
    const translationElement = document.createElement('div');
    translationElement.className = 'slack-translator-translation';
    translationElement.innerHTML = '<span class="slack-translator-label">Click to translate</span>';
    
    insertionPoint.appendChild(translationElement);

    // Add click handler to toggle translation visibility and translate on-demand
    if (!messageElement.hasAttribute('data-translator-click-attached')) {
      messageElement.setAttribute('data-translator-click-attached', 'true');
      let isTranslated = false;
      let isTranslating = false;
      
      messageElement.addEventListener('click', function(e) {
        // Don't trigger if clicking on links or buttons within the message
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('a')) {
          return;
        }
        
        // Toggle visibility
        translationElement.classList.toggle('visible');
        
        // Only translate on first click when becoming visible
        if (!isTranslated && !isTranslating && translationElement.classList.contains('visible')) {
          isTranslating = true;
          translationElement.innerHTML = '<span class="slack-translator-loading">Translating...</span>';
          
          // Translate incoming message: from others' language to your language
          translateText(messageText, othersLanguage, yourLanguage)
            .then(function(translation) {
              if (translation && translation !== messageText) {
                translationElement.innerHTML = `
                  <span class="slack-translator-label">Translation:</span>
                  <span class="slack-translator-text">${escapeHtml(translation)}</span>
                `;
                isTranslated = true;
              } else {
                translationElement.innerHTML = '<span class="slack-translator-text" style="color: #616061; font-style: italic;">No translation needed</span>';
                isTranslated = true;
              }
            })
            .catch(function(error) {
              console.error('Translation error:', error);
              translationElement.innerHTML = '<span class="slack-translator-text" style="color: #d32f2f; font-style: italic;">Translation error</span>';
            })
            .finally(function() {
              isTranslating = false;
            });
        }
      });
    }
  }

  function getMessageId(element) {
    // Look for the parent message container which has more stable identifiers
    let messageContainer = element.closest('[data-qa="virtual-list-item"]');
    if (!messageContainer) {
      messageContainer = element.closest('.c-virtual_list__item');
    }
    if (!messageContainer) {
      messageContainer = element.closest('[id^="message-"]');
    }
    
    // Try to find a timestamp attribute in the container
    if (messageContainer) {
      const tsElement = messageContainer.querySelector('[data-ts]');
      if (tsElement) {
        const tsAttr = tsElement.getAttribute('data-ts');
        if (tsAttr) return `ts_${tsAttr}`;
      }
      
      const idAttr = messageContainer.getAttribute('id');
      if (idAttr) return `id_${idAttr}`;
    }
    
    // Try to find data-ts or id on the element itself
    const tsAttr = element.getAttribute('data-ts');
    if (tsAttr) return `ts_${tsAttr}`;
    
    const idAttr = element.getAttribute('id');
    if (idAttr) return `id_${idAttr}`;
    
    // Try to find timestamp in sibling or parent elements
    const parentWithTs = element.closest('[data-ts]');
    if (parentWithTs) {
      const ts = parentWithTs.getAttribute('data-ts');
      if (ts) return `ts_${ts}`;
    }
    
    // Use a combination of text content and position as a last resort
    const text = element.textContent.trim().substring(0, 100);
    if (text) {
      // Try to find user/sender information
      let userId = '';
      if (messageContainer) {
        const userElement = messageContainer.querySelector('[data-qa*="message_sender"]');
        if (userElement) {
          userId = userElement.textContent.trim().substring(0, 30);
        }
      }
      
      return `combined_${hashCode(userId + '|' + text)}`;
    }
    
    return null;
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
    // The messageElement is the .c-message__message_blocks container
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

    // Add keyboard shortcut for Ctrl+Enter to replace with translation
    inputField.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (lastTranslation) {
          replaceInputWithTranslation(inputField);
        }
      }
    });
  }

  function handleInputChange(inputField) {
    if (!isEnabled) return;

    // Skip if we're programmatically replacing content
    if (isReplacingContent) {
      return;
    }

    const currentValue = inputField.textContent || inputField.value || '';
    
    if (currentValue === lastInputValue) return;
    
    // If user has manually changed the content after accepting a translation,
    // reset the flag to allow new translations
    if (translationAccepted && currentValue !== lastTranslation) {
      translationAccepted = false;
    }
    
    lastInputValue = currentValue;

    // Clear previous debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // If input is empty, remove preview and reset all state
    if (!currentValue.trim()) {
      removePreview();
      translationAccepted = false;
      lastTranslation = '';
      return;
    }

    // Don't translate if a translation has been accepted and content hasn't changed
    if (translationAccepted) {
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

    // Find the input container - we need to insert in a fixed space
    const inputContainer = findInputContainer(inputField);
    if (!inputContainer) return;

    // Create or find preview container (a fixed space above input)
    let previewContainer = inputContainer.querySelector('.slack-translator-preview-container');
    if (!previewContainer) {
      previewContainer = document.createElement('div');
      previewContainer.className = 'slack-translator-preview-container';
      
      // Create the preview element
      previewElement = document.createElement('div');
      previewElement.className = 'slack-translator-preview';
      previewElement.innerHTML = '<span class="slack-translator-loading">Translating...</span>';
      
      // Create action buttons
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'slack-translator-preview-actions';
      
      const replaceButton = document.createElement('button');
      replaceButton.className = 'slack-translator-replace-btn';
      replaceButton.textContent = 'Replace (Ctrl+Enter)';
      replaceButton.title = 'Replace your text with the translation';
      replaceButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (lastTranslation) {
          replaceInputWithTranslation(inputField);
        }
      });
      
      actionsDiv.appendChild(replaceButton);
      
      previewContainer.appendChild(previewElement);
      previewContainer.appendChild(actionsDiv);
      
      // Insert at the beginning of the input container
      inputContainer.insertBefore(previewContainer, inputContainer.firstChild);
    } else {
      previewElement = previewContainer.querySelector('.slack-translator-preview');
    }

    // Show loading state
    previewElement.innerHTML = '<span class="slack-translator-loading">Translating...</span>';

    // Translate outgoing message: from your language to others' language
    translateText(text, yourLanguage, othersLanguage).then(function(translation) {
      if (translation && translation !== text) {
        lastTranslation = translation; // Store for sending
        const label = translateOutgoing ? 'Will send:' : 'Preview:';
        previewElement.innerHTML = `
          <span class="slack-translator-label">${label}</span>
          <span class="slack-translator-text">${escapeHtml(translation)}</span>
        `;
      } else {
        lastTranslation = text; // No translation, use original
        previewElement.innerHTML = '<span class="slack-translator-text" style="color: #616061; font-style: italic;">No translation needed</span>';
      }
    }).catch(function(error) {
      console.error('Preview translation error:', error);
      lastTranslation = text; // On error, use original
      previewElement.innerHTML = '<span class="slack-translator-text" style="color: #d32f2f; font-style: italic;">Translation error</span>';
    });
  }

  function findInputContainer(inputField) {
    // The input field is the .ql-editor, we need to find the message form container
    // Try to find a suitable parent container with better fallback handling
    let container = inputField.closest('[data-qa="message_input"]');
    if (!container) {
      container = inputField.closest('.c-wysiwyg_container');
    }
    if (!container) {
      container = inputField.closest('.ql-container')?.parentElement;
    }
    if (!container && inputField.parentElement) {
      // Last resort fallback: go up a few levels with null checks
      let current = inputField.parentElement;
      for (let i = 0; i < 3 && current; i++) {
        current = current.parentElement;
      }
      container = current;
    }
    return container;
  }

  function replaceInputWithTranslation(inputField) {
    if (!lastTranslation) return;
    
    // Set flag to prevent re-translation
    translationAccepted = true;
    
    // Replace content
    replaceInputContent(inputField, lastTranslation);
    
    // Update lastInputValue to match the new content
    lastInputValue = lastTranslation;
    
    // Remove preview
    removePreview();
  }

  function removePreview() {
    const containers = document.querySelectorAll('.slack-translator-preview-container');
    containers.forEach(container => container.remove());
    previewElement = null;
  }

  // Translation function - now takes source and target languages
  async function translateText(text, sourceLang, targetLang) {
    if (!text || text.length < 2) return text;

    try {
      if (translationProvider === 'deepl' && apiKey) {
        return await translateWithDeepL(text, sourceLang, targetLang);
      } else if (translationProvider === 'chatgpt' && apiKey) {
        return await translateWithChatGPT(text, sourceLang, targetLang);
      } else {
        return await translateWithMyMemory(text, sourceLang, targetLang);
      }
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }

  async function translateWithMyMemory(text, sourceLang, targetLang) {
    return sendTranslationRequest(text, sourceLang, targetLang, 'mymemory', '');
  }

  async function translateWithDeepL(text, sourceLang, targetLang) {
    return sendTranslationRequest(text, sourceLang, targetLang, 'deepl', apiKey);
  }

  async function translateWithChatGPT(text, sourceLang, targetLang) {
    return sendTranslationRequest(text, sourceLang, targetLang, 'chatgpt', apiKey);
  }

  // Helper function to send translation requests to background script
  async function sendTranslationRequest(text, sourceLang, targetLang, provider, apiKey) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: 'translate',
          text: text,
          sourceLang: sourceLang,
          targetLang: targetLang,
          provider: provider,
          apiKey: apiKey
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response && response.success) {
            resolve(response.translation);
          } else {
            reject(new Error(response ? response.error : 'Translation failed'));
          }
        }
      );
    });
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
      
      // Skip if already sending a message to prevent double-send
      if (isSendingMessage) return;
      
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
            
            // Set flag to prevent double-send
            isSendingMessage = true;
            
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
              
              // Reset all state immediately after dispatching
              setTimeout(function() {
                lastTranslation = '';
                lastInputValue = '';
                translationAccepted = false;
                isSendingMessage = false;
                removePreview();
              }, 100);
            }, DOM_UPDATE_DELAY_MS);
          } else {
            // No translation to apply, reset state after send
            setTimeout(function() {
              lastTranslation = '';
              lastInputValue = '';
              translationAccepted = false;
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
            
            // Skip if already sending
            if (isSendingMessage) return;
            
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
              
              // Set flag to prevent double-send
              isSendingMessage = true;
              
              // Replace the content with the translation
              replaceInputContent(inputField, lastTranslation);
              
              // Trigger the send after DOM updates are complete
              setTimeout(function() {
                button.click();
                
                // Reset all state immediately after clicking
                setTimeout(function() {
                  lastTranslation = '';
                  lastInputValue = '';
                  translationAccepted = false;
                  isSendingMessage = false;
                  removePreview();
                }, 100);
              }, DOM_UPDATE_DELAY_MS);
            } else {
              // No translation to apply, reset state after send
              setTimeout(function() {
                lastTranslation = '';
                lastInputValue = '';
                translationAccepted = false;
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
    // Set flag to prevent input event handler from running
    isReplacingContent = true;
    
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
    
    // Reset flag after a brief delay to ensure event has finished processing
    setTimeout(function() {
      isReplacingContent = false;
    }, 50);
  }

  console.log('Slack Translator: Content script loaded');
})();
