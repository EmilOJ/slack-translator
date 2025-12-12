# Slack Translator - Visual Guide

## What It Looks Like

### 1. Extension Popup (Settings)

```
┌─────────────────────────────────────┐
│  ⚡ Slack Translator                │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ✓ Enable Translation        │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ✓ Translate Outgoing Msgs   │   │
│  └─────────────────────────────┘   │
│  When enabled, sends translated     │
│  message instead of original        │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Translation Service                │
│  ┌─────────────────────────────┐   │
│  │ MyMemory (Free, No API Key) ▼   │
│  └─────────────────────────────┘   │
│  MyMemory is free and works         │
│  without configuration              │
│                                     │
│  Source Language                    │
│  ┌─────────────────────────────┐   │
│  │ Auto-detect              ▼  │   │
│  └─────────────────────────────┘   │
│                                     │
│  Target Language                    │
│  ┌─────────────────────────────┐   │
│  │ English                  ▼  │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Save Settings          │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 2. Slack Message with Translation

```
┌─────────────────────────────────────────────────┐
│ Slack Workspace                                 │
│ ─────────────────────────────────────────────   │
│                                                 │
│  👤 Jean-Pierre          12:57 PM              │
│  Bonjour! Comment vas-tu aujourd'hui?          │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ Translation: Hello! How are you today?    │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  👤 Maria               1:02 PM                │
│  ¡Hola! Estoy muy bien, gracias.              │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ Translation: Hi! I'm very well, thanks.   │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3. Typing with Preview

```
┌─────────────────────────────────────────────────┐
│ Message to #general                             │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ Will send: Hello everyone! How are you?   │ │
│  └───────────────────────────────────────────┘ │
│  ▲ Preview appears while you type              │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ Hola a todos! ¿Cómo están?         [Send]│ │
│  └───────────────────────────────────────────┘ │
│    ▲ You type in your language                 │
│                                                 │
│  When you press Enter or click Send:           │
│  → The English translation is sent             │
│  → Not the Spanish text you typed              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4. Translation Styles

**Light Mode (Default):**
```
┌─────────────────────────────────────┐
│ Translation: Hello, how are you?    │ ← Blue left border
│ (Light gray background)             │   Dark text
└─────────────────────────────────────┘
```

**Preview (Yellow):**
```
┌─────────────────────────────────────┐
│ Will send: Hello, how are you?      │ ← Yellow left border
│ (Light yellow background)           │   Dark text
└─────────────────────────────────────┘
```

**Dark Mode:**
```
┌─────────────────────────────────────┐
│ Translation: Hello, how are you?    │ ← Blue left border
│ (Dark gray background)              │   Light text
└─────────────────────────────────────┘
```

## User Flow Examples

### Example 1: Basic Usage

```
Step 1: Install extension
   ↓
Step 2: Open Slack
   ↓
Step 3: See message: "Bonjour!"
   ↓
Step 4: Translation appears: "Hello!"
   ↓
Step 5: Type response: "Hola!"
   ↓
Step 6: See preview: "Will send: Hello!"
   ↓
Step 7: Press Enter
   ↓
Step 8: "Hello!" is sent to Slack
```

### Example 2: Changing Languages

```
Currently set to: Spanish → English

Message: "Hola, ¿cómo estás?"
Translation shown: "Hello, how are you?"

You type: "I am good"
Preview: "Will send: Estoy bien"

Click extension icon
   ↓
Change target to: French
   ↓
Save settings
   ↓

You type: "I am good"
Preview: "Will send: Je vais bien"
Press Enter → "Je vais bien" is sent
```

### Example 3: Preview-Only Mode

```
Settings:
✓ Enable Translation
✗ Translate Outgoing Messages  ← OFF

You type: "Hello"
Preview: "Translation: Hola"     ← Informational only
Press Enter → "Hello" is sent   ← Original sent, not translation
```

## Color Scheme

- **Translation Box**: Light gray (#f8f9fa) with blue border (#4a90e2)
- **Preview Box**: Light yellow (#fff3cd) with yellow border (#ffc107)
- **Text**: Dark gray (#1d1c1d) in light mode, light gray (#d1d2d3) in dark mode
- **Labels**: Medium gray (#616061)

## Icon Design

```
┌─────────────┐
│             │
│     🌐      │  ← Globe emoji represents translation
│             │     Color: Slack purple (#4A154B) background
│             │
└─────────────┘
```

## Browser Integration

```
Chrome Toolbar
┌──────────────────────────────────────────────┐
│ [🌐] ← Click to open settings popup         │
└──────────────────────────────────────────────┘

Extensions Page
┌──────────────────────────────────────────────┐
│ 🌐 Slack Translator              ON  [⋮]   │
│ Automatically translate Slack messages      │
│ Version 1.0.0                               │
└──────────────────────────────────────────────┘
```

## Animation Examples

**Loading State:**
```
┌─────────────────────────────────────┐
│ Translating...                      │ ← Pulsing animation
└─────────────────────────────────────┘
```

**Fade In:**
```
Translation appears with smooth fade-in effect
Opacity: 0 → 1 over 200ms
```

## Responsive Design

Works in all Slack layouts:
- Desktop app view
- Browser full-screen
- Browser with sidebar
- Split view with other apps

## Accessibility

- Proper ARIA labels
- Keyboard navigable
- Screen reader compatible
- High contrast support

---

## Quick Reference

**Keyboard Shortcuts:**
- `Enter` - Send message (translated if enabled)
- `Shift+Enter` - New line (doesn't send)

**Mouse Actions:**
- Click extension icon - Open settings
- Click Send button - Send message (translated if enabled)
- Hover over translation - No special action

**Status Indicators:**
- "Translating..." - API call in progress
- "Will send: ..." - Preview ready
- "Translation: ..." - Incoming message translated
- No indicator - Translation disabled or error

---

This visual guide helps users understand what to expect when using the Slack Translator extension.
