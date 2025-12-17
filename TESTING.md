# Testing Guide for Slack Translator

## Pre-Installation Testing

Before installing, verify file structure:

```bash
slack-translator/
├── manifest.json      ✓ 868 bytes
├── content.js         ✓ 11K
├── styles.css         ✓ 1.3K
├── popup.html         ✓ 5.4K
├── popup.js           ✓ 2.8K
├── background.js      ✓ 680 bytes
├── icons/
│   ├── icon16.png     ✓
│   ├── icon48.png     ✓
│   └── icon128.png    ✓
└── README.md          ✓ 5.7K
```

## Installation Test

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `slack-translator` folder
5. Verify no errors appear

**Expected Result:** Extension appears in list with no errors

## Settings Test

1. Click extension icon in toolbar
2. Verify popup opens showing:
   - Enable/Disable toggle (should be ON)
   - Translation Service dropdown (MyMemory selected)
   - Source Language dropdown (Auto-detect selected)
   - Target Language dropdown (English selected)
   - Save button

3. Change target language to Spanish
4. Click "Save Settings"

**Expected Result:** "Settings saved successfully!" message appears

## Slack Integration Test

### Test 1: Message Translation (On-Demand / Lazy Load)

1. Open Slack in Chrome (https://app.slack.com or your workspace)
2. Navigate to a channel with existing messages
3. Wait 1-2 seconds after page load

**Expected Result:** 
- Messages show "Click to translate" below them (no API call made yet)
- Original message remains unchanged
- Only messages with text show the translation prompt

4. Click on a message to view its translation

**Expected Result:**
- Shows "Translating..." briefly (API call is made now)
- Translation appears with label "Translation:"
- Translation persists and doesn't translate again on subsequent clicks
- Clicking again toggles visibility of the translation

### Test 2: Translation Preview While Typing

1. Click in the message input box
2. Type a message: "Hello, how are you today?"
3. Wait 1 second without typing

**Expected Result:**
- Yellow preview box appears above input field
- Preview label says "Will send:"
- Shows translated text
- Preview updates as you type (after 1s pause)

### Test 3: Accepting Translation and Preventing Re-translation Loop

1. Type a message: "Hello, how are you?"
2. Wait 1 second for the translation preview to appear
3. Click "Replace (Ctrl+Enter)" button or press Ctrl+Enter

**Expected Result:**
- Input field content is replaced with the translation
- No new translation preview appears (prevents re-translation loop)
- The replaced text stays as-is without being translated again

4. Clear the entire input field (delete all text)

**Expected Result:**
- Translation preview disappears
- You can now type a new message and translation will work again

5. Type a new message and press Enter to send (without replacing)

**Expected Result:**
- If "Translate Outgoing Messages" is ON: translated version is sent
- Translation flag resets after sending
- You can type a new message and translation will work normally

### Test 4: Different Languages

1. Click extension icon
2. Change target language to French
3. Click "Save Settings"
4. Slack page should reload automatically
5. View messages again

**Expected Result:**
- All translations now appear in French
- Existing translations are replaced with French versions

### Test 4: Enable/Disable Toggle

1. Click extension icon
2. Toggle "Enable Translation" OFF
3. Click "Save Settings"

**Expected Result:**
- All translation boxes disappear
- No new translations appear
- Preview while typing stops working

4. Toggle back ON and save

**Expected Result:**
- Translations reappear
- Extension works normally again

## Translation Service Test

### MyMemory (Default)

1. Ensure "MyMemory" is selected in settings
2. Test with various message types:
   - Short messages: "Hello"
   - Long messages: "This is a longer message to test the translation..."
   - Messages with emojis: "Hello 👋 how are you?"
   - Messages with mentions: "@user can you help?"

**Expected Result:**
- Translations appear for all message types
- Emojis are preserved
- Mentions may or may not translate (expected)

### ChatGPT (Optional)

**Prerequisites:** OpenAI API key with credits

1. Get API key from https://platform.openai.com/api-keys
2. Open extension settings
3. Select "ChatGPT" from Translation Service dropdown
4. Enter API key in the field that appears
5. Click "Save Settings"

**Expected Result:**
- Translations use ChatGPT
- Higher quality, more natural translations
- Same functionality as MyMemory

## Browser Console Test

1. Open Slack
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for messages from extension

**Expected Messages:**
- "Slack Translator: Content script loaded"
- No error messages in red

**If errors appear:**
- Check the error message
- Verify all files are present
- Reload the extension at chrome://extensions/

## Performance Test

1. Open a busy Slack channel (many messages)
2. Scroll through messages
3. Observe translation speed and browser performance

**Expected Result:**
- Translations appear within 1-2 seconds
- No significant lag or freezing
- Browser remains responsive
- Translations persist when scrolling

## Edge Cases Test

### Test with:
- Empty messages (shouldn't translate)
- Very short messages like "ok" (may not translate)
- Messages with only emojis (shouldn't translate)
- Code blocks (may or may not translate)
- Links and URLs (should be preserved)
- Multi-line messages (should translate fully)

## Troubleshooting Common Issues

### Translations not appearing
- Check extension is enabled in settings
- Verify you're on a Slack domain (*.slack.com)
- Refresh the page
- Check browser console for errors

### Preview not working
- Make sure you're typing in a Slack input field
- Wait 0.5 seconds after typing
- Verify extension is enabled

### API key errors (ChatGPT)
- Verify key starts with "sk-"
- Check OpenAI account has credits
- Try switching back to MyMemory

### Rate limiting (MyMemory)
- Free tier has daily limits
- Wait and try again later
- Consider using ChatGPT for heavy use

## Success Criteria

✅ Extension installs without errors
✅ Settings popup works and saves preferences
✅ Messages are translated automatically
✅ Translation preview appears while typing
✅ Can switch between languages
✅ Can toggle on/off
✅ Both translation services work
✅ No console errors
✅ Performance is acceptable
✅ UI looks good and matches Slack style

## Reporting Issues

If any test fails:
1. Note which test failed
2. Capture any console errors
3. Take screenshots if relevant
4. Check if issue is reproducible
5. Report on GitHub with details

## Manual Testing Checklist

- [ ] Installation successful
- [ ] Settings popup opens and works
- [ ] Message translation appears
- [ ] Translation preview while typing works
- [ ] Language switching works
- [ ] Enable/disable toggle works
- [ ] MyMemory translation works
- [ ] ChatGPT translation works (if API key available)
- [ ] No console errors
- [ ] Performance is good
- [ ] UI looks professional

---

**Note:** Some features may behave differently based on Slack's UI updates. If Slack changes their HTML structure, the extension may need updates to match.
