# Slack Translator 🌐

A Chrome extension that automatically translates Slack messages in real-time. Perfect for international teams or language learners!

## Features

✨ **Automatic Message Translation**
- Translates incoming messages and displays translations below the original text
- Works with all Slack channels and DMs
- Non-intrusive UI that blends with Slack's design

⚡ **Smart Outgoing Message Translation**
- Shows translation preview while you type (live preview above input field)
- **Automatically sends the translated message** when you hit Enter or click Send
- Original text is replaced with translation before sending
- Preview first, then send - ensures you can verify translation quality

🔧 **Flexible Translation Backend**
- **DeepL** (Default) - High-quality translations (requires API key)
- **MyMemory API** - Free, no API key required
- **ChatGPT** - High-quality translations (requires OpenAI API key)

🎯 **Easy to Use**
- Simple popup interface for settings
- Support for 15+ languages
- Enable/disable translation features independently
- Toggle outgoing message translation on/off

## Installation

### From Source (Development)

1. Clone this repository:
   ```bash
   git clone https://github.com/EmilOJ/slack-translator.git
   cd slack-translator
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in the top-right corner)

4. Click "Load unpacked"

5. Select the `slack-translator` directory

6. The extension icon should appear in your Chrome toolbar!

### Setup

1. Click the extension icon in your Chrome toolbar

2. Configure your preferences:
   - **Enable Translation**: Master toggle for all translation features
   - **Translate Outgoing Messages**: When ON, your messages are translated before sending (default: ON)
   - **Translation Service**: Choose between DeepL (default, requires API key), MyMemory (free), or ChatGPT (requires API key)
   - **Source Language**: Auto-detect or select a specific language
   - **Target Language**: Choose your preferred translation language

3. If using DeepL (recommended):
   - Get your API key from [DeepL API](https://www.deepl.com/pro-api)
   - Enter it in the settings popup
   - Your API key is stored locally and never shared
   - Both free and pro API keys are supported

4. If using ChatGPT:
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Enter it in the settings popup
   - Your API key is stored locally and never shared

5. Click "Save Settings"

## Usage

### Translating Incoming Messages

1. Open Slack in Chrome (`https://app.slack.com` or your workspace URL)

2. Navigate to any channel or DM

3. Messages will show "Click to translate" below them

4. **Click on a message** to translate it on-demand (saves API calls!)

5. The translation appears below the original message

6. Click again to toggle the translation visibility

**Why on-demand?** To save your API quota! Translations are only fetched when you actually need them.

### Translation Preview While Typing

1. Click in any Slack message input field

2. Start typing your message in your language

3. After a brief pause (1 second), a translation preview will appear above the input field showing "Will send: [translated text]"

4. Continue typing or editing - the preview updates automatically

5. **Optional:** Click "Replace (Ctrl+Enter)" to replace your text with the translation before sending
   - This prevents the extension from trying to translate the already-translated text again
   - After replacing, the text won't be re-translated until you send or clear the input

6. When you're happy with the translation, press Enter or click Send

7. **If "Translate Outgoing Messages" is ON**: The translated version is sent (not your original text)

8. **If "Translate Outgoing Messages" is OFF**: The preview is just informational; your original text is sent

### How Message Translation Works

**Scenario 1: You send a message**
- You type: "Hello, how are you?" (in English)
- Preview shows: "Will send: Hola, ¿cómo estás?" (if target is Spanish)
- You hit Enter
- Slack sends: "Hola, ¿cómo estás?" (the translation)

**Scenario 2: You receive a message**
- Someone sends: "Bonjour, comment allez-vous?" (in French)
- You see the original message with "Click to translate" below it
- Click on the message
- Below it, you see: "Translation: Hello, how are you?"

**Scenario 3: You accept a translation before sending**
- You type: "Hello" (in English)
- Preview shows: "Will send: Hola"
- You click "Replace (Ctrl+Enter)"
- Input now shows: "Hola"
- No re-translation happens (prevents Hola -> Hola loop)
- You can now send or continue editing

### Managing Settings

- Click the extension icon at any time to change settings
- Toggle the extension on/off without uninstalling
- Change languages instantly - changes take effect immediately

## Supported Languages

- English
- Spanish
- French
- German
- Italian
- Portuguese
- Russian
- Japanese
- Korean
- Chinese
- Arabic
- Hindi
- Dutch
- Polish
- Turkish

## Translation Backends

### DeepL (Default)

- **Pros**: Excellent translation quality, supports many languages, fast, reliable
- **Cons**: Requires API key (free tier available)
- **Best for**: Professional use, high-quality translations, international teams
- **Cost**: Free tier available (500,000 characters/month), then pay-per-use
- **Setup**: Get free or pro API key from [DeepL API](https://www.deepl.com/pro-api)

### MyMemory

- **Pros**: Free, no signup required, works immediately
- **Cons**: Rate limited (daily limit), quality may vary
- **Best for**: Casual use, testing, basic translations

### ChatGPT

- **Pros**: High-quality translations, context-aware, natural language
- **Cons**: Requires OpenAI API key and credits
- **Best for**: Professional use, important communications
- **Cost**: Pay-per-use (very affordable - ~$0.002 per message)

## Privacy & Security

- All settings are stored locally in Chrome's storage
- API keys are never transmitted to any third party except the translation service
- The extension only runs on Slack websites
- No data collection or analytics
- Open source - audit the code yourself!

## Troubleshooting

**Translations not appearing:**
- Make sure the extension is enabled (check the toggle in settings)
- Refresh the Slack page
- Check if you've hit the daily limit (if using MyMemory)

**Preview not showing while typing:**
- Make sure you're typing in a Slack message input field
- Wait 0.5 seconds after typing - preview is debounced
- Check if translation is enabled in settings

**Wrong message sent (translation instead of original or vice versa):**
- Check the "Translate Outgoing Messages" toggle in settings
- When ON: sends translation
- When OFF: sends original (preview is just informational)
- The preview label tells you what will be sent

**ChatGPT not working:**
- Verify your API key is correct
- Check your OpenAI account has credits
- Ensure you're using a valid API key (starts with `sk-`)

**DeepL not working:**
- Verify your API key is correct
- Check if you're using the correct API key type (free keys end with `:fx`)
- Ensure you have remaining quota on your DeepL account
- Check your internet connection

## Development

### Project Structure

```
slack-translator/
├── manifest.json          # Extension manifest
├── content.js            # Content script (runs on Slack pages)
├── styles.css            # Styling for translation elements
├── popup.html            # Settings popup UI
├── popup.js              # Settings popup logic
├── background.js         # Background service worker
├── icons/                # Extension icons
└── README.md            # This file
```

### Building & Testing

1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the reload icon on the Slack Translator card
4. Open or refresh Slack to test changes

### Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Roadmap

- [ ] Custom language pair shortcuts
- [ ] Translation history
- [ ] Keyboard shortcuts
- [ ] Dark mode improvements
- [ ] Translation confidence indicators
- [ ] Support for thread translations
- [ ] Export translations
- [x] Support for DeepL translation service

## License

MIT License - Feel free to use, modify, and distribute!

## Credits

Built with ❤️ for international teams everywhere.

Translation services powered by:
- [DeepL API](https://www.deepl.com/pro-api) (default)
- [MyMemory Translation API](https://mymemory.translated.net/)
- [OpenAI ChatGPT](https://openai.com/) (optional)

## Support

Found a bug? Have a feature request? 
- Open an issue on [GitHub](https://github.com/EmilOJ/slack-translator/issues)
- Check existing issues first to avoid duplicates

---

**Note**: This is an unofficial extension and is not affiliated with Slack Technologies, Inc.

