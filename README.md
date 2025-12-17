# Slack Translator 🌐

[日本語版は下にあります](#slack-translator-日本語版) | [Japanese version below](#slack-translator-日本語版)

A Chrome extension that automatically translates Slack messages in real-time using DeepL's high-quality translation API.

## Features

- **Real-time Translation**: Automatically translates incoming and outgoing messages in Slack
- **DeepL Integration**: Uses DeepL API for high-quality, natural translations
- **Bilingual Interface**: UI available in English and Japanese with automatic detection
- **Formality Control**: Adjust the tone of translations (formal, informal, or default)
- **Translation Preview**: See translations before sending outgoing messages

### Formality Examples

The formality setting controls the tone of your translations, making them more appropriate for different contexts:

**English Input**: "What do you think we should do about this problem?"

**Formal Japanese** (prefer formal):
```
この問題についてどうすべきだと思いますか？
```

**Informal Japanese** (prefer informal):
```
この問題に対してどうすべきだと思う？
```

Formality is supported for: German, French, Italian, Spanish, Dutch, Polish, Portuguese, Japanese, and Russian.

## Installation

### From Release (Recommended)

1. Go to the [Releases page](https://github.com/EmilOJ/slack-translator/releases)

2. Download the latest `slack-translator-v*.zip` file

3. Extract the ZIP file to a location on your computer

4. Open Chrome and navigate to `chrome://extensions/`

5. Enable "Developer mode" (toggle in the top-right corner)

6. Click "Load unpacked"

7. Select the extracted folder

8. The extension icon should appear in your Chrome toolbar!

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

## Setup

### Getting a DeepL API Key

To use this extension, you need a DeepL API key:

1. Go to [https://www.deepl.com/en/your-account/keys](https://www.deepl.com/en/your-account/keys)

2. Create a DeepL account if you don't have one (free tier available)

3. Create a new API key:

   ![Create API Key](img/create_api_key.png)

4. Copy your API key:

   ![Copy API Key](img/copy_api_key.png)

5. Click the extension icon in Chrome and paste your API key in the settings

6. Configure your language preferences and formality settings

**Note**: DeepL offers a free tier with 500,000 characters/month. Free API keys end with `:fx`.

---

# Slack Translator 日本語版

DeepLの高品質な翻訳APIを使用して、Slackメッセージをリアルタイムで自動翻訳するChrome拡張機能です。

## 機能

- **リアルタイム翻訳**: Slackで受信・送信するメッセージを自動的に翻訳
- **DeepL統合**: 高品質で自然な翻訳のためにDeepL APIを使用
- **バイリンガルインターフェース**: 英語と日本語のUIを自動検出で提供
- **敬語設定**: 翻訳のトーンを調整（フォーマル、カジュアル、デフォルト）
- **翻訳プレビュー**: 送信メッセージの翻訳を事前に確認

### 敬語設定の例

敬語設定は、翻訳のトーンを調整し、異なるコンテキストに適した表現にします：

**英語入力**: "What do you think we should do about this problem?"

**フォーマル（敬語）**:
```
この問題についてどうすべきだと思いますか？
```

**カジュアル（口語）**:
```
この問題に対してどうすべきだと思う？
```

敬語設定は以下の言語でサポートされています：ドイツ語、フランス語、イタリア語、スペイン語、オランダ語、ポーランド語、ポルトガル語、日本語、ロシア語

## インストール

### リリースからインストール（推奨）

1. [リリースページ](https://github.com/EmilOJ/slack-translator/releases)にアクセス

2. 最新の`slack-translator-v*.zip`ファイルをダウンロード

3. ZIPファイルをコンピュータ上の場所に解凍

4. Chromeを開き、`chrome://extensions/`にアクセス

5. 右上の「デベロッパーモード」を有効化

6. 「パッケージ化されていない拡張機能を読み込む」をクリック

7. 解凍したフォルダを選択

8. 拡張機能のアイコンがChromeツールバーに表示されます！

### ソースからインストール（開発者向け）

1. このリポジトリをクローン:
   ```bash
   git clone https://github.com/EmilOJ/slack-translator.git
   cd slack-translator
   ```

2. Chromeを開き、`chrome://extensions/`にアクセス

3. 右上の「デベロッパーモード」を有効化

4. 「パッケージ化されていない拡張機能を読み込む」をクリック

5. `slack-translator`ディレクトリを選択

6. 拡張機能のアイコンがChromeツールバーに表示されます！

## 設定

### DeepL APIキーの取得

この拡張機能を使用するには、DeepL APIキーが必要です：

1. [https://www.deepl.com/ja/your-account/keys](https://www.deepl.com/ja/your-account/keys)にアクセス

2. DeepLアカウントをお持ちでない場合は作成（無料プランあり）

3. 新しいAPIキーを作成:

   ![APIキーの作成](img/create_api_key.png)

4. APIキーをコピー:

   ![APIキーのコピー](img/copy_api_key.png)

5. ChromeでSlack Translator拡張機能アイコンをクリックし、設定にAPIキーを貼り付け

6. 言語設定と敬語設定を構成

**注意**: DeepLは月間50万文字の無料プランを提供しています。無料APIキーは`:fx`で終わります。
