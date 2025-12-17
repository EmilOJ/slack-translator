// Content script for Slack Translator
(function() {
  'use strict';

  // Configuration constants
  const DEBOUNCE_DELAY_MS = 1000; // Wait time before translating while typing (increased from 500ms)
  const DOM_UPDATE_DELAY_MS = 50; // Wait for DOM updates before sending
  const STATE_RESET_DELAY_MS = 100; // Wait for events to complete before resetting state
  const CONTENT_REPLACEMENT_DELAY_MS = 50; // Wait for input event to finish processing after content replacement

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
  const messageTranslationState = new WeakMap(); // Store translation state per message element

  console.log('[Slack Translator] Content script loaded');

  // Load settings from storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
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
          othersLanguage = 'ja';
        }
        
        translationProvider = result.translationProvider || 'deepl';
        apiKey = result.apiKey || '';
        translateOutgoing = result.translateOutgoing !== undefined ? result.translateOutgoing : true;
        
        if (isEnabled) {
          init();
        }
      }
    );
  } else {
    // Chrome storage API not available, init with defaults
    init();
  }

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
    // Set up event delegation for message clicks
    setupMessageClickDelegation();
    
    // Also process messages on scroll to catch virtually scrolled messages
    let scrollTimeout;
    document.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function() {
        if (!isEnabled) return;
        const messages = document.querySelectorAll('.c-message__message_blocks[data-qa="message-text"]');
        messages.forEach(function(messageElement) {
          processMessage(messageElement);
        });
      }, 100);
    }, true); // Use capture phase to catch all scroll events
  }

  function cleanup() {
    // Remove all translation elements
    document.querySelectorAll('.slack-translator-translation').forEach(el => el.remove());
    if (previewElement) {
      previewElement.remove();
      previewElement = null;
    }
    // Clear the periodic check
    if (window._slackTranslatorPeriodicCheck) {
      clearInterval(window._slackTranslatorPeriodicCheck);
      window._slackTranslatorPeriodicCheck = null;
    }
    // Clear the processed messages set
    processedMessages.clear();
  }

  // Observe for new messages in Slack
  function observeMessages() {
    // Process all messages periodically to catch any that were missed
    const periodicCheck = setInterval(function() {
      if (!isEnabled) return;
      
      const messages = document.querySelectorAll('.c-message__message_blocks[data-qa="message-text"]');
      messages.forEach(function(messageElement) {
        processMessage(messageElement);
      });
    }, 2000); // Check every 2 seconds

    const observer = new MutationObserver(function(mutations) {
      if (!isEnabled) return;
      
      // Process messages in the mutated subtrees
      mutations.forEach(function(mutation) {
        // Check if any added nodes contain or are message elements
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the node itself is a message
            if (node.matches && node.matches('.c-message__message_blocks[data-qa="message-text"]')) {
              processMessage(node);
            }
            // Check for messages within the node
            const messages = node.querySelectorAll ? node.querySelectorAll('.c-message__message_blocks[data-qa="message-text"]') : [];
            messages.forEach(function(messageElement) {
              processMessage(messageElement);
            });
          }
        });
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
    
    // Store the interval ID for cleanup
    window._slackTranslatorPeriodicCheck = periodicCheck;
  }

  function processMessage(messageElement) {
    // Check if translation element already exists (more reliable than just checking attribute)
    const existingTranslation = messageElement.querySelector('.slack-translator-translation');
    if (existingTranslation) {
      return;
    }

    // Create a unique identifier for this message
    const messageId = getMessageId(messageElement);
    if (!messageId) {
      return;
    }
    
    // If we already processed this messageId but the element doesn't have the translation
    // (happens when Slack replaces the DOM node), remove it from the set so we can re-process
    if (processedMessages.has(messageId)) {
      processedMessages.delete(messageId);
    }

    // Find the text content of the message - looking for p-rich_text_section elements and lists
    const textElements = messageElement.querySelectorAll('.p-rich_text_section');
    const listElements = messageElement.querySelectorAll('.p-rich_text_list');

    if (textElements.length === 0 && listElements.length === 0) {
      return;
    }

    let messageText = '';
    
    // Extract text from regular text sections
    textElements.forEach(function(el) {
      const text = el.textContent.trim();
      if (text) {
        messageText += text + ' ';
      }
    });
    
    // Extract text from list items (li elements directly)
    listElements.forEach(function(listEl) {
      const listItems = listEl.querySelectorAll('li');
      listItems.forEach(function(item) {
        // Get only the direct text content of this li, not nested uls
        let itemText = '';
        item.childNodes.forEach(function(node) {
          if (node.nodeType === Node.TEXT_NODE) {
            itemText += node.textContent.trim() + ' ';
          }
        });
        if (itemText.trim()) {
          messageText += itemText;
        }
      });
    });

    messageText = messageText.trim();
    if (!messageText || messageText.length < 2) {
      return;
    }

    // Mark as processed
    processedMessages.add(messageId);

    // Find a good place to insert the translation
    const insertionPoint = findInsertionPoint(messageElement);
    if (!insertionPoint) return;

    // Create translation element (but don't translate yet)
    const translationElement = document.createElement('div');
    translationElement.className = 'slack-translator-translation';
    translationElement.innerHTML = '<span class="slack-translator-label">Click to translate</span>';
    
    insertionPoint.appendChild(translationElement);

    // Store message text in element's dataset for later retrieval
    messageElement.dataset.translatorText = messageText;
    
    // Initialize translation state for this message
    messageTranslationState.set(messageElement, {
      isTranslated: false,
      isTranslating: false
    });
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

  // Set up event delegation for message clicks
  function setupMessageClickDelegation() {
    document.body.addEventListener('click', function(e) {
      if (!isEnabled) return;
      
      // Find if we clicked on or inside a message element
      const messageElement = e.target.closest('.c-message__message_blocks[data-qa="message-text"]');
      if (!messageElement) return;
      
      // Don't trigger if clicking on links or buttons within the message
      if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || 
          e.target.closest('button') || e.target.closest('a')) {
        return;
      }
      
      // Find the translation element
      const translationElement = messageElement.querySelector('.slack-translator-translation');
      if (!translationElement) return;
      
      // Get or initialize state for this message
      let state = messageTranslationState.get(messageElement);
      if (!state) {
        state = { isTranslated: false, isTranslating: false };
        messageTranslationState.set(messageElement, state);
      }
      
      // Toggle visibility
      translationElement.classList.toggle('visible');
      
      // Only translate on first click when becoming visible
      if (!state.isTranslated && !state.isTranslating && translationElement.classList.contains('visible')) {
        state.isTranslating = true;
        translationElement.innerHTML = '<span class="slack-translator-loading">Translating...</span>';
        
        // Get the message text from dataset
        const messageText = messageElement.dataset.translatorText;
        if (!messageText) {
          translationElement.innerHTML = '<span class="slack-translator-text" style="color: #d32f2f; font-style: italic;">No message text found</span>';
          state.isTranslating = false;
          return;
        }
        
        // Translate incoming message: from others' language to your language
        translateText(messageText, othersLanguage, yourLanguage)
          .then(function(translation) {
            if (translation && translation !== messageText) {
              translationElement.innerHTML = `
                <span class="slack-translator-label">Translation:</span>
                <span class="slack-translator-text">${escapeHtml(translation)}</span>
              `;
              state.isTranslated = true;
            } else {
              translationElement.innerHTML = '<span class="slack-translator-text" style="color: #616061; font-style: italic;">No translation needed</span>';
              state.isTranslated = true;
            }
          })
          .catch(function(error) {
            console.error('Translation error:', error);
            translationElement.innerHTML = '<span class="slack-translator-text" style="color: #d32f2f; font-style: italic;">Translation error</span>';
          })
          .finally(function() {
            state.isTranslating = false;
          });
      }
    });
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

    // Add keyboard shortcut for Alt+Ctrl+Enter to replace with translation
    inputField.addEventListener('keydown', function(e) {
      if (e.altKey && e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (lastTranslation) {
          replaceInputWithTranslation(inputField);
        }
      }
      
      // Detect Enter key (message send)
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        // Reset state after a delay to allow message to be sent
        setTimeout(function() {
          resetTranslationState();
        }, STATE_RESET_DELAY_MS);
      }
    });
    
    // Also observe for DOM changes that indicate message was sent
    // (Slack clears the input field after sending)
    const sendObserver = new MutationObserver(function(mutations) {
      const currentContent = (inputField.textContent || '').trim();
      // If input was cleared (likely after send), reset state and remove preview
      if (!currentContent && (translationAccepted || previewElement)) {
        setTimeout(function() {
          resetTranslationState();
        }, STATE_RESET_DELAY_MS);
      }
    });
    
    sendObserver.observe(inputField, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }
  
  function resetTranslationState() {
    translationAccepted = false;
    lastTranslation = '';
    lastInputValue = '';
    removePreview();
  }

  function handleInputChange(inputField) {
    if (!isEnabled) return;

    // Skip if we're programmatically replacing content
    if (isReplacingContent) {
      return;
    }

    const currentValue = inputField.textContent || inputField.value || '';
    
    if (currentValue === lastInputValue) return;
    
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
      lastInputValue = '';
      return;
    }

    // Don't translate if a translation has been accepted (until message is sent or input cleared)
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
      replaceButton.textContent = 'Replace (Ctrl+Alt+Enter)';
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
    }, CONTENT_REPLACEMENT_DELAY_MS);
  }

  console.log('Slack Translator: Content script loaded');
})();
