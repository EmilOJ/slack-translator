/**
 * Tests for Slack Translator State Management
 * 
 * These tests verify the intended behavior:
 * 1. User types message → translation preview appears
 * 2. If user edits message → translate again
 * 3. User replaces with translation → stop translating until message sent OR input cleared
 * 4. The fix ensures no re-translation loop after replacement
 */

const { describe, test, expect, beforeEach } = require('@jest/globals');

// Mock Chrome API
global.chrome = {
  storage: {
    sync: {
      get: jest.fn((keys, callback) => {
        callback({
          enabled: true,
          yourLanguage: 'en',
          othersLanguage: 'ja',
          translationProvider: 'deepl',
          apiKey: 'test-api-key',
          translateOutgoing: true
        });
      }),
      set: jest.fn()
    },
    onChanged: {
      addListener: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn((message, callback) => {
      // Mock translation response
      setTimeout(() => {
        callback({
          success: true,
          translation: `TRANSLATED: ${message.text}`
        });
      }, 0);
    }),
    lastError: null
  }
};

// State management simulation based on content.js
class TranslationStateManager {
  constructor() {
    this.DEBOUNCE_DELAY_MS = 1000;
    this.DOM_UPDATE_DELAY_MS = 50;
    this.STATE_RESET_DELAY_MS = 100;
    this.CONTENT_REPLACEMENT_DELAY_MS = 50;
    
    this.isEnabled = true;
    this.lastInputValue = '';
    this.lastTranslation = '';
    this.translationAccepted = false;
    this.isReplacingContent = false;
    this.isSendingMessage = false;
    this.debounceTimer = null;
  }

  handleInputChange(currentValue) {
    if (!this.isEnabled) return null;

    // Skip if we're programmatically replacing content
    if (this.isReplacingContent) {
      return 'SKIP_PROGRAMMATIC';
    }

    if (currentValue === this.lastInputValue) return 'SKIP_SAME_VALUE';
    
    this.lastInputValue = currentValue;

    // Clear previous debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // If input is empty, remove preview and reset all state
    if (!currentValue.trim()) {
      this.translationAccepted = false;
      this.lastTranslation = '';
      return 'RESET_EMPTY';
    }

    // Don't translate if a translation has been accepted (until message is sent or input cleared)
    if (this.translationAccepted) {
      return 'SKIP_ACCEPTED';
    }

    // Would debounce and translate here
    return 'TRANSLATE';
  }

  replaceInputWithTranslation(translation) {
    if (!translation) return;
    
    this.translationAccepted = true;
    this.isReplacingContent = true;
    
    // Simulate content replacement
    this.lastInputValue = translation;
    
    // Simulate async reset of flag
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isReplacingContent = false;
        resolve();
      }, this.CONTENT_REPLACEMENT_DELAY_MS);
    });
  }

  simulateSend() {
    if (this.isSendingMessage) return 'ALREADY_SENDING';
    
    this.isSendingMessage = true;
    
    return new Promise((resolve) => {
      setTimeout(() => {
        this.resetTranslationState();
        resolve('SENT');
      }, this.STATE_RESET_DELAY_MS);
    });
  }

  resetTranslationState() {
    this.lastTranslation = '';
    this.lastInputValue = '';
    this.translationAccepted = false;
    this.isSendingMessage = false;
  }

  clearInput() {
    return this.handleInputChange('');
  }
}

describe('Translation State Management', () => {
  let manager;

  beforeEach(() => {
    manager = new TranslationStateManager();
  });

  test('Initial state should allow translation', () => {
    const result = manager.handleInputChange('Hello world');
    expect(result).toBe('TRANSLATE');
    expect(manager.translationAccepted).toBe(false);
  });

  test('After replace, should NOT translate again (no re-translation loop)', async () => {
    // Step 1: User types
    manager.handleInputChange('Hello world');
    expect(manager.translationAccepted).toBe(false);
    
    // Step 2: Translation happens
    manager.lastTranslation = 'TRANSLATED: Hello world';
    
    // Step 3: User replaces with translation
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    expect(manager.translationAccepted).toBe(true);
    expect(manager.lastInputValue).toBe('TRANSLATED: Hello world');
    
    // Step 4: Same content - should skip (already processed)
    const result1 = manager.handleInputChange('TRANSLATED: Hello world');
    expect(result1).toBe('SKIP_SAME_VALUE');
    
    // Step 5: If content somehow changes but translationAccepted is true, should not translate
    manager.lastInputValue = ''; // Reset to force processing
    const result2 = manager.handleInputChange('TRANSLATED: Hello world');
    expect(result2).toBe('SKIP_ACCEPTED');
  });

  test('After replace, editing should NOT trigger new translation', async () => {
    // Replace with translation
    manager.lastTranslation = 'Bonjour';
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    expect(manager.translationAccepted).toBe(true);
    
    // User edits the replaced text
    const result = manager.handleInputChange('Bonjour mon ami');
    expect(result).toBe('SKIP_ACCEPTED');
    expect(manager.translationAccepted).toBe(true); // Should REMAIN true
  });

  test('After replace, deleting part should NOT trigger new translation', async () => {
    // Replace with translation
    manager.lastTranslation = 'Bonjour le monde';
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    
    // User deletes part of the text
    const result = manager.handleInputChange('Bonjour');
    expect(result).toBe('SKIP_ACCEPTED');
    expect(manager.translationAccepted).toBe(true); // Should REMAIN true
  });

  test('After replace, clearing input completely should reset state', async () => {
    // Replace with translation
    manager.lastTranslation = 'Hola';
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    expect(manager.translationAccepted).toBe(true);
    
    // User clears all input
    const result = manager.clearInput();
    expect(result).toBe('RESET_EMPTY');
    expect(manager.translationAccepted).toBe(false);
    expect(manager.lastTranslation).toBe('');
    
    // Now new input should allow translation
    const result2 = manager.handleInputChange('New message');
    expect(result2).toBe('TRANSLATE');
  });

  test('After sending message, state should reset', async () => {
    // Replace with translation
    manager.lastTranslation = 'Hola';
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    expect(manager.translationAccepted).toBe(true);
    
    // Send message
    const result = await manager.simulateSend();
    expect(result).toBe('SENT');
    expect(manager.translationAccepted).toBe(false);
    expect(manager.lastTranslation).toBe('');
    expect(manager.lastInputValue).toBe('');
    expect(manager.isSendingMessage).toBe(false);
    
    // Now new input should allow translation
    const result2 = manager.handleInputChange('Another message');
    expect(result2).toBe('TRANSLATE');
  });

  test('Double-send should be prevented', async () => {
    manager.isSendingMessage = true;
    const result = await manager.simulateSend();
    expect(result).toBe('ALREADY_SENDING');
  });

  test('User types → edits → should translate again', () => {
    // User types
    const result1 = manager.handleInputChange('Hello');
    expect(result1).toBe('TRANSLATE');
    
    // User edits (without replacing)
    const result2 = manager.handleInputChange('Hello world');
    expect(result2).toBe('TRANSLATE');
    expect(manager.translationAccepted).toBe(false);
  });

  test('Programmatic content replacement should be ignored', async () => {
    manager.isReplacingContent = true;
    const result = manager.handleInputChange('Some content');
    expect(result).toBe('SKIP_PROGRAMMATIC');
  });

  test('Same input value should be skipped', () => {
    manager.lastInputValue = 'Hello';
    const result = manager.handleInputChange('Hello');
    expect(result).toBe('SKIP_SAME_VALUE');
  });

  test('Complete workflow: type → replace → edit → send → type new', async () => {
    // 1. User types
    let result = manager.handleInputChange('Hello');
    expect(result).toBe('TRANSLATE');
    expect(manager.translationAccepted).toBe(false);
    
    // 2. Translation appears
    manager.lastTranslation = 'Hola';
    
    // 3. User replaces with translation
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    expect(manager.translationAccepted).toBe(true);
    
    // 4. User edits the replaced text
    result = manager.handleInputChange('Hola amigo');
    expect(result).toBe('SKIP_ACCEPTED'); // Should NOT translate
    expect(manager.translationAccepted).toBe(true);
    
    // 5. User sends
    await manager.simulateSend();
    expect(manager.translationAccepted).toBe(false);
    
    // 6. User types new message
    result = manager.handleInputChange('Goodbye');
    expect(result).toBe('TRANSLATE'); // Should translate again
  });

  test('Complete workflow: type → replace → clear → type new', async () => {
    // 1. User types
    manager.handleInputChange('Hello');
    
    // 2. Replace with translation
    manager.lastTranslation = 'Hola';
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    expect(manager.translationAccepted).toBe(true);
    
    // 3. User clears input
    manager.clearInput();
    expect(manager.translationAccepted).toBe(false);
    expect(manager.lastTranslation).toBe('');
    
    // 4. User types new message
    const result = manager.handleInputChange('Goodbye');
    expect(result).toBe('TRANSLATE');
  });

  test('Replace → partial delete → should NOT translate', async () => {
    // Replace
    manager.lastTranslation = 'Bonjour le monde';
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    
    // Partial delete
    const result = manager.handleInputChange('Bonjour');
    expect(result).toBe('SKIP_ACCEPTED');
    
    // Continue typing
    const result2 = manager.handleInputChange('Bonjour mon');
    expect(result2).toBe('SKIP_ACCEPTED');
  });

  test('Replace → add text → should NOT translate', async () => {
    // Replace
    manager.lastTranslation = 'Hola';
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    
    // Add more text
    const result = manager.handleInputChange('Hola mundo');
    expect(result).toBe('SKIP_ACCEPTED');
  });
});

describe('Backspace Behavior After Replace', () => {
  let manager;

  beforeEach(() => {
    manager = new TranslationStateManager();
  });

  test('After replace, backspace once should NOT trigger translation', async () => {
    // User types
    manager.handleInputChange('Hello world');
    
    // Replace with translation
    manager.lastTranslation = 'Bonjour le monde';
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    expect(manager.translationAccepted).toBe(true);
    
    // Simulate backspace (removing last character)
    const result = manager.handleInputChange('Bonjour le mond');
    expect(result).toBe('SKIP_ACCEPTED');
    expect(manager.translationAccepted).toBe(true); // Should remain true
  });

  test('After replace, backspace twice should NOT trigger translation', async () => {
    // User types
    manager.handleInputChange('Hello world');
    
    // Replace with translation
    manager.lastTranslation = 'Bonjour le monde';
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    expect(manager.translationAccepted).toBe(true);
    
    // First backspace
    let result = manager.handleInputChange('Bonjour le mond');
    expect(result).toBe('SKIP_ACCEPTED');
    expect(manager.translationAccepted).toBe(true);
    
    // Second backspace
    result = manager.handleInputChange('Bonjour le mon');
    expect(result).toBe('SKIP_ACCEPTED');
    expect(manager.translationAccepted).toBe(true); // Should STILL remain true
  });

  test('After replace, multiple backspaces should NOT trigger translation', async () => {
    // User types
    manager.handleInputChange('Hello');
    
    // Replace with translation
    manager.lastTranslation = 'Bonjour';
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    expect(manager.translationAccepted).toBe(true);
    
    // Simulate multiple backspaces (note: first one will be SKIP_SAME_VALUE since we just set it)
    const deletionSequence = ['Bonjou', 'Bonjo', 'Bonj', 'Bon', 'Bo', 'B'];
    
    for (const text of deletionSequence) {
      const result = manager.handleInputChange(text);
      // Any non-empty text after replace should skip (not translate)
      expect(result).toBe('SKIP_ACCEPTED');
      expect(manager.translationAccepted).toBe(true);
    }
  });

  test('After replace, delete to empty should reset and allow new translation', async () => {
    // User types
    manager.handleInputChange('Hello');
    
    // Replace with translation
    manager.lastTranslation = 'Bonjour';
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    expect(manager.translationAccepted).toBe(true);
    
    // Delete everything
    const result = manager.handleInputChange('');
    expect(result).toBe('RESET_EMPTY');
    expect(manager.translationAccepted).toBe(false);
    expect(manager.lastTranslation).toBe('');
    
    // Now typing new content should translate
    const result2 = manager.handleInputChange('Goodbye');
    expect(result2).toBe('TRANSLATE');
  });

  test('After replace with newline, backspace once removes newline, NOT translate', async () => {
    // User types
    manager.handleInputChange('Hello');
    
    // Replace with translation that includes newline
    manager.lastTranslation = 'Bonjour\n';
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    expect(manager.translationAccepted).toBe(true);
    
    // Backspace removes the newline
    const result = manager.handleInputChange('Bonjour');
    expect(result).toBe('SKIP_ACCEPTED');
    expect(manager.translationAccepted).toBe(true);
  });
});

describe('Edge Cases', () => {
  let manager;

  beforeEach(() => {
    manager = new TranslationStateManager();
  });

  test('Empty input should reset state', () => {
    manager.translationAccepted = true;
    manager.lastTranslation = 'something';
    manager.lastInputValue = 'something'; // Set this so the check doesn't skip
    
    const result = manager.handleInputChange('');
    expect(result).toBe('RESET_EMPTY');
    expect(manager.translationAccepted).toBe(false);
    expect(manager.lastTranslation).toBe('');
  });

  test('Whitespace-only input should reset state', () => {
    manager.translationAccepted = true;
    
    const result = manager.handleInputChange('   ');
    expect(result).toBe('RESET_EMPTY');
    expect(manager.translationAccepted).toBe(false);
  });

  test('Disabled state should skip all processing', () => {
    manager.isEnabled = false;
    const result = manager.handleInputChange('Hello');
    expect(result).toBe(null);
  });
});

describe('Page Load and Reload Scenarios', () => {
  let manager;

  beforeEach(() => {
    manager = new TranslationStateManager();
  });

  test('When page loads with existing text in input field, should translate on first detection', () => {
    // Simulate Slack page opening with draft message already in input
    // This happens when Slack restores a draft or when navigating back
    const existingText = 'Draft message from before';
    
    // First time detecting this input
    const result = manager.handleInputChange(existingText);
    expect(result).toBe('TRANSLATE');
    expect(manager.translationAccepted).toBe(false);
    expect(manager.lastInputValue).toBe(existingText);
  });

  test('After page reload with existing text, state should be clean and allow translation', () => {
    // Before reload: user had typed and replaced with translation
    manager.handleInputChange('Original text');
    manager.lastTranslation = 'Translated text';
    manager.translationAccepted = true;
    
    // SIMULATE PAGE RELOAD - create new manager instance (fresh state)
    manager = new TranslationStateManager();
    
    // After reload, Slack might restore the draft (the translated text)
    const restoredText = 'Translated text';
    const result = manager.handleInputChange(restoredText);
    
    // Should allow translation since state is fresh
    expect(result).toBe('TRANSLATE');
    expect(manager.translationAccepted).toBe(false);
  });

  test('Page load with empty input should have clean state', () => {
    // Page loads, input field is empty
    // First detection returns SKIP_SAME_VALUE (both empty)
    const result = manager.handleInputChange('');
    expect(result).toBe('SKIP_SAME_VALUE');
    expect(manager.translationAccepted).toBe(false);
    expect(manager.lastTranslation).toBe('');
    expect(manager.lastInputValue).toBe('');
    
    // Subsequent typing should work normally
    const result2 = manager.handleInputChange('New text');
    expect(result2).toBe('TRANSLATE');
  });

  test('After reload, typing new message should work normally', () => {
    // Simulate fresh page load
    manager = new TranslationStateManager();
    
    // User starts typing after reload
    const result = manager.handleInputChange('New message after reload');
    expect(result).toBe('TRANSLATE');
    expect(manager.translationAccepted).toBe(false);
  });

  test('Existing text on load → replace → reload → should start fresh', async () => {
    // Page loads with existing draft
    manager.handleInputChange('Existing draft');
    expect(manager.translationAccepted).toBe(false);
    
    // User replaces with translation
    manager.lastTranslation = 'Brouillon existant';
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    expect(manager.translationAccepted).toBe(true);
    
    // SIMULATE PAGE RELOAD
    manager = new TranslationStateManager();
    
    // Slack restores the replaced text
    const result = manager.handleInputChange('Brouillon existant');
    expect(result).toBe('TRANSLATE');
    expect(manager.translationAccepted).toBe(false);
  });

  test('Multiple tabs: text in input when switching back to tab', () => {
    // User had typed in another tab/window
    // When switching back, the content script detects the input field
    const existingContent = 'Message from other context';
    
    // Should treat as new input and allow translation
    const result = manager.handleInputChange(existingContent);
    expect(result).toBe('TRANSLATE');
    expect(manager.translationAccepted).toBe(false);
  });

  test('Draft restored after navigating between channels', () => {
    // User was typing in Channel A
    manager.handleInputChange('Message for Channel A');
    manager.lastTranslation = 'Mensaje para Canal A';
    manager.translationAccepted = true;
    
    // User switches to Channel B (simulate by creating new manager - different input field)
    manager = new TranslationStateManager();
    
    // Channel B has a different draft
    const channelBDraft = 'Different message in Channel B';
    const result = manager.handleInputChange(channelBDraft);
    
    // Should allow translation (clean state for new input field)
    expect(result).toBe('TRANSLATE');
    expect(manager.translationAccepted).toBe(false);
  });

  test('Extension enabled after page already loaded with text in input', () => {
    // Page was loaded with extension disabled
    manager.isEnabled = false;
    
    // User types something (won't be processed, lastInputValue stays empty)
    let result = manager.handleInputChange('Some text');
    expect(result).toBe(null);
    
    // User enables extension
    manager.isEnabled = true;
    
    // Content script detects existing input content (lastInputValue is still empty)
    result = manager.handleInputChange('Some text');
    expect(result).toBe('TRANSLATE'); // Should translate (different from lastInputValue)
    expect(manager.translationAccepted).toBe(false);
    
    // User edits the text
    result = manager.handleInputChange('Some text edited');
    expect(result).toBe('TRANSLATE'); // Should translate again
    expect(manager.translationAccepted).toBe(false);
  });

  test('Page reload during message composition should not corrupt state', async () => {
    // User is composing
    manager.handleInputChange('Hello');
    manager.lastTranslation = 'Hola';
    
    // User replaced with translation
    await manager.replaceInputWithTranslation(manager.lastTranslation);
    expect(manager.translationAccepted).toBe(true);
    
    // User continues editing
    manager.handleInputChange('Hola amigo');
    expect(manager.translationAccepted).toBe(true);
    
    // PAGE RELOAD happens (user hits F5 accidentally)
    manager = new TranslationStateManager();
    
    // Slack restores: "Hola amigo"
    const result = manager.handleInputChange('Hola amigo');
    
    // Should have clean state and allow translation
    expect(result).toBe('TRANSLATE');
    expect(manager.translationAccepted).toBe(false);
    expect(manager.lastInputValue).toBe('Hola amigo');
  });

  test('Existing multiline text on page load should translate', () => {
    // Slack can restore multiline drafts
    const multilineText = 'Line 1\nLine 2\nLine 3';
    
    const result = manager.handleInputChange(multilineText);
    expect(result).toBe('TRANSLATE');
    expect(manager.translationAccepted).toBe(false);
    expect(manager.lastInputValue).toBe(multilineText);
  });

  test('Browser back/forward navigation with draft should start fresh', () => {
    // User was on page A with accepted translation
    manager.translationAccepted = true;
    manager.lastTranslation = 'Accepted translation';
    
    // User navigates away then back (creates new content script context)
    manager = new TranslationStateManager();
    
    // Draft is restored
    const result = manager.handleInputChange('Accepted translation');
    expect(result).toBe('TRANSLATE');
    expect(manager.translationAccepted).toBe(false);
  });
});
