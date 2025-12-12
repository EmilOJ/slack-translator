# Slack Translator 🌐

A Chrome extension that automatically translates Slack messages in real-time. Perfect for international teams or language learners!

## Features

✨ **Automatic Message Translation**
- Translates incoming messages and displays translations below the original text
- Works with all Slack channels and DMs
- Non-intrusive UI that blends with Slack's design

⚡ **Real-time Translation Preview**
- Shows translation preview while you type
- Helps you understand what your message will look like translated
- Preview appears above the input field

🔧 **Flexible Translation Backend**
- **MyMemory API** (Default) - Free, no API key required
- **ChatGPT** - High-quality translations (requires OpenAI API key)

🎯 **Easy to Use**
- Simple popup interface for settings
- Support for 15+ languages
- Enable/disable with one click

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
   - **Translation Service**: Choose between MyMemory (free) or ChatGPT (requires API key)
   - **Source Language**: Auto-detect or select a specific language
   - **Target Language**: Choose your preferred translation language

3. If using ChatGPT:
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Enter it in the settings popup
   - Your API key is stored locally and never shared

4. Click "Save Settings"

## Usage

### Translating Incoming Messages

1. Open Slack in Chrome (`https://app.slack.com` or your workspace URL)

2. Navigate to any channel or DM

3. Messages will automatically be translated and the translation will appear below the original message in a subtle colored box

### Translation Preview While Typing

1. Click in any Slack message input field

2. Start typing your message

3. After a brief pause (0.5 seconds), a translation preview will appear above the input field

4. The preview shows what your message will look like when translated to the target language

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

### MyMemory (Default)

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

**ChatGPT not working:**
- Verify your API key is correct
- Check your OpenAI account has credits
- Ensure you're using a valid API key (starts with `sk-`)

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

- [ ] Support for more translation services (Google Translate, DeepL)
- [ ] Custom language pair shortcuts
- [ ] Translation history
- [ ] Keyboard shortcuts
- [ ] Dark mode improvements
- [ ] Translation confidence indicators
- [ ] Support for thread translations
- [ ] Export translations

## License

MIT License - Feel free to use, modify, and distribute!

## Credits

Built with ❤️ for international teams everywhere.

Translation services powered by:
- [MyMemory Translation API](https://mymemory.translated.net/)
- [OpenAI ChatGPT](https://openai.com/) (optional)

## Support

Found a bug? Have a feature request? 
- Open an issue on [GitHub](https://github.com/EmilOJ/slack-translator/issues)
- Check existing issues first to avoid duplicates

---

**Note**: This is an unofficial extension and is not affiliated with Slack Technologies, Inc.

