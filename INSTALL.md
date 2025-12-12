# Quick Installation Guide

## Install the Extension

1. **Download/Clone** the repository
   ```bash
   git clone https://github.com/EmilOJ/slack-translator.git
   ```

2. **Open Chrome Extensions Page**
   - Open Chrome
   - Go to `chrome://extensions/`
   - OR click the puzzle icon in toolbar → "Manage Extensions"

3. **Enable Developer Mode**
   - Toggle "Developer mode" ON (top-right corner)

4. **Load the Extension**
   - Click "Load unpacked"
   - Navigate to and select the `slack-translator` folder
   - Click "Select Folder"

5. **Verify Installation**
   - You should see "Slack Translator" in your extensions list
   - The extension icon will appear in your Chrome toolbar

## Quick Start

1. **Open Settings**
   - Click the Slack Translator icon in your toolbar

2. **Choose Translation Service**
   - **MyMemory**: Works immediately, no setup needed (Free)
   - **ChatGPT**: Better quality, requires API key from OpenAI

3. **Set Languages**
   - Source: Auto-detect (recommended) or choose specific
   - Target: Choose your preferred language

4. **Save & Test**
   - Click "Save Settings"
   - Open Slack (refresh if already open)
   - Messages will now be translated automatically!

## Testing

1. Open Slack in Chrome
2. Go to any channel with messages
3. You should see translations appear below messages
4. Type in a message box - translation preview appears above

## Troubleshooting

**Extension not showing up:**
- Make sure you selected the correct folder (the one with manifest.json)
- Check for errors in chrome://extensions/

**Not working in Slack:**
- Make sure the extension is enabled (toggle in settings)
- Refresh the Slack page
- Check the browser console (F12) for any errors

**API Key Issues (ChatGPT):**
- Get your key from: https://platform.openai.com/api-keys
- Make sure it starts with "sk-"
- Verify you have credits in your OpenAI account

## Next Steps

- Read the full [README.md](README.md) for detailed features
- Customize language settings for your needs
- Report any issues on GitHub

Enjoy translating! 🌐
