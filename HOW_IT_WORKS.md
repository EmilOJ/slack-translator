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

### Incoming Messages (Lazy-Load / On-Demand Translation)
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
│  Shows "Click to translate" prompt                          │
│  (NO API call yet - saves API quota!)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Click to translate                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ (User clicks on message)
┌─────────────────────────────────────────────────────────────┐
│  First click: Send to translation API                       │
│  (DeepL, MyMemory, or ChatGPT)                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Receives translation                                       │
│  "Hello, how are you?"                                     │
│  (Cached - no re-translation on subsequent clicks)         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Updates translation UI below original message              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Translation: Hello, how are you?                    │   │
│  └─────────────────────────────────────────────────────┘   │
│  (Click again to toggle visibility)                         │
└─────────────────────────────────────────────────────────────┘
```

### Outgoing Messages (with Translate Outgoing = ON)

```
┌─────────────────────────────────────────────────────────────┐
│  You type in input field                                    │
│  "Hello, how are you?"                                     │
│  (translationAccepted flag = false)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Extension detects input change                             │
│  Debounces for 1000ms (waits for you to stop typing)      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Sends to translation API                                   │
│  (DeepL, MyMemory, or ChatGPT)                             │
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
│  │ [Replace (Ctrl+Enter)]                               │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Hello, how are you?   [Send]                        │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │
      ┌──────────────┴──────────────┐
      │                             │
      ▼ (Option A: Replace)         ▼ (Option B: Send directly)
┌──────────────────────────┐  ┌────────────────────────────────┐
│ Click Replace button or  │  │ Press Enter or click Send      │
│ press Ctrl+Enter         │  └───────────┬────────────────────┘
└──────────┬───────────────┘            │
           │                            ▼
           ▼                  ┌─────────────────────────────────┐
┌──────────────────────────┐  │ Extension intercepts send       │
│ Replace input content    │  │ - Prevents default send         │
│ with translation         │  │ - Replaces with lastTranslation │
│ SET translationAccepted  │  │ - Triggers send                 │
│ = true                   │  │ - Resets translationAccepted    │
│ (NO re-translation!)     │  └───────────┬─────────────────────┘
└──────────┬───────────────┘            │
           │                            │
           │ Type more or send?         │
           │                            │
           ▼ (Clear input)              ▼
┌──────────────────────────┐  ┌─────────────────────────────────┐
│ Input field cleared      │  │  Message sent to Slack          │
│ Reset translationAccepted│  │  "Hola, ¿cómo estás?"          │
│ = false                  │  │  (Translation, not original!)   │
│ Ready for new message    │  └─────────────────────────────────┘
└──────────────────────────┘
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
- Targets `.c-message__message_blocks[data-qa="message-text"]` elements
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
