# How Slack Translator Works

## Feature Overview

Slack Translator provides two main translation features that work together:

### 1. Incoming Message Translation (Always Active when enabled)
```
Someone sends message → You see original → Translation appears below
```

### 2. Outgoing Message Translation (Configurable)
```
You type in your language → See preview → Press Enter → Translated message is sent
```

## Detailed Flow Diagram

### Incoming Messages
```
┌─────────────────────────────────────────────────────────────┐
│  Message arrives in Slack                                   │
│  "Bonjour, comment allez-vous?"                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Extension detects new message                              │
│  Extracts text from .p-rich_text_section                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Sends to translation API                                   │
│  (MyMemory or ChatGPT)                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Receives translation                                       │
│  "Hello, how are you?"                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Injects translation UI below original message              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Translation: Hello, how are you?                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Outgoing Messages (with Translate Outgoing = ON)

```
┌─────────────────────────────────────────────────────────────┐
│  You type in input field                                    │
│  "Hello, how are you?"                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Extension detects input change                             │
│  Debounces for 500ms (waits for you to stop typing)       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Sends to translation API                                   │
│  (MyMemory or ChatGPT)                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Receives translation                                       │
│  "Hola, ¿cómo estás?"                                      │
│  Stores in lastTranslation variable                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Shows preview above input field                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Will send: Hola, ¿cómo estás?                       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Hello, how are you?   [Send]                        │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  You press Enter or click Send                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Extension intercepts the send action                       │
│  - Prevents default send behavior                          │
│  - Replaces input content with lastTranslation             │
│  - Triggers send again                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Message sent to Slack                                      │
│  "Hola, ¿cómo estás?"                                      │
│  (Translation, not original!)                              │
└─────────────────────────────────────────────────────────────┘
```

## Settings Control Flow

```
┌────────────────────────────────────┐
│  Extension Popup                   │
│                                    │
│  [x] Enable Translation            │ ← Master toggle
│  [x] Translate Outgoing Messages   │ ← Controls replacement
│                                    │
│  Translation Service: [MyMemory]   │
│  Source Language: [Auto-detect]    │
│  Target Language: [Spanish]        │
└────────────────────────────────────┘
         │
         │ Saves to chrome.storage.sync
         │
         ▼
┌────────────────────────────────────┐
│  Content Script                    │
│                                    │
│  isEnabled = true                  │
│  translateOutgoing = true          │
│  targetLanguage = 'es'             │
│                                    │
│  Listens for changes...            │
└────────────────────────────────────┘
```

## Translation API Flow

### MyMemory (Free API)
```
Text: "Hello" 
  ↓
https://api.mymemory.translated.net/get?q=Hello&langpair=en|es
  ↓
Response: { "responseData": { "translatedText": "Hola" } }
  ↓
Returns: "Hola"
```

### ChatGPT (Paid API)
```
Text: "Hello"
  ↓
POST https://api.openai.com/v1/chat/completions
Headers: { Authorization: Bearer sk-... }
Body: {
  model: "gpt-3.5-turbo",
  messages: [
    { role: "system", content: "Translate to Spanish" },
    { role: "user", content: "Hello" }
  ]
}
  ↓
Response: { "choices": [{ "message": { "content": "Hola" } }] }
  ↓
Returns: "Hola"
```

## Key Technical Details

### Message Detection
- Uses MutationObserver to watch for DOM changes
- Targets `.c-message_kit__blocks[data-qa="message-text"]` elements
- Extracts text from `.p-rich_text_section` children

### Input Field Detection
- Targets `.ql-editor[contenteditable="true"][role="textbox"]` (Quill editor)
- Attaches event listeners for 'input' and 'focus' events
- Debounces translation requests by 500ms

### Send Interception
- Listens for 'keydown' events in capture phase (before Slack's handlers)
- Detects Enter key (without Shift) in Quill editor
- Also observes for send button clicks via `[data-qa="texty_send_button"]`
- Replaces content using DOM manipulation before triggering actual send

### Content Replacement
```javascript
// Clear existing content
inputField.innerHTML = '';

// Create paragraph with translation
const p = document.createElement('p');
p.textContent = translatedText;
inputField.appendChild(p);

// Update cursor position
// Trigger input event
// Let Slack's handlers process the new content
```

## User Experience Flow

1. **First Time User**
   - Installs extension
   - Opens popup (defaults already set)
   - Optionally changes target language
   - Clicks "Save Settings"
   - Opens Slack - translations work immediately

2. **Daily Usage - Reading Messages**
   - Opens Slack workspace
   - Sees messages with translations below
   - Reads both original and translation
   - No interaction needed

3. **Daily Usage - Sending Messages**
   - Starts typing in native language
   - Sees translation preview after 0.5s pause
   - Verifies translation looks good
   - Presses Enter
   - Translated message is sent
   - Recipients see the translated version

4. **Adjusting Settings**
   - Wants to disable outgoing translation
   - Opens popup
   - Unchecks "Translate Outgoing Messages"
   - Saves
   - Now preview is informational only
   - Original messages are sent

## Security & Privacy

- All settings stored in chrome.storage.sync (encrypted by Chrome)
- API keys never exposed to content scripts or other extensions
- Translation requests go directly to APIs (no middleman)
- No analytics or tracking
- Open source - code is auditable

## Performance Considerations

- Debouncing prevents excessive API calls while typing
- MutationObserver is throttled by browser
- Processed messages tracked in Set to avoid re-translation
- Translation elements use minimal DOM nodes
- CSS uses efficient selectors and GPU-accelerated animations
