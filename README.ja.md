# Share Video Embeds

[ツールを開く](https://h4m4chi-ttr.github.io/share-video-embeds/) · [English](README.md)

YouTube動画をX（旧Twitter）にプレイヤー付きで投稿するためのURL変換ツールです。

YouTubeのURLを貼り付け、「Xでシェア」を押すと投稿画面が開きます。変換されたURLをコピーして使うこともできます。

**Xでの表示・再生や今後の動作を100%保証するものではありません。**

## 使い方

1. YouTubeのURLを貼り付けるか、端末の共有メニューから動画を渡します。
2. 「Xでシェア」を押します。変換URLが投稿画面に入ります。タイトルを付ける設定がONの場合は、共有元から受け取ったタイトルや入力欄のタイトルも入ります。
3. Xで内容を確認して投稿します。変換URLだけ使いたいときは「X投稿用URLをコピー」でコピーできます。

「投稿に添えるタイトル（任意）」でタイトルを変更できます。「Xでシェアするときにタイトルを付ける」は初期設定でONです。OFFにすると入力欄が隠れ、変換URLだけを渡します。選択はブラウザに保存されます。

変換結果の「開始位置」を開くと、時間・分・秒を入力し、前後10秒ずつ調整できます。「指定を解除」で開始位置だけを取り除けます。共有や貼り付けで受け取ったURLに開始位置があれば、最初から反映されます。

## PC（ブックマークレット）

「PCから共有する（ブックマークレット）」を開き、「Share Video Embeds」ボタンをブックマークバーにドラッグ＆ドロップします。YouTubeの動画ページで登録したブックマークを押すと、動画のURLとタイトルを取り込んだツールが新しいタブで開きます。

## PC（User Script）

ツールの「PCから共有する (User Script)」を開き、管理用のブラウザ拡張機能にスクリプトを追加します。PC版YouTubeの共有メニューで、標準の「X」の隣にある「X (埋め込み)」を押すと、動画のリンクと指定した開始位置を引き継いでツールが新しいタブに開きます。

[User Scriptのソース](docs/share-video-embeds.user.js)は単独で動きます。Greasy Forkの公開時は、GitHubのRaw URLを同期元に指定できます。[Greasy Forkの外部スクリプトポリシー](https://greasyfork.org/ja/help/external-scripts)

## Android

1. AndroidのChromeで[ツール](https://h4m4chi-ttr.github.io/share-video-embeds/)を開きます。
2. 「スマホの共有メニューから使う」を開き、「アプリをインストール」を押します。ボタンがなければ、Chromeのメニューにある「アプリをインストール」か「ホーム画面に追加」のインストール項目を使います。表示名はChromeのバージョンによって異なります。
3. YouTubeなどで「共有」を開き、共有先から「Share Video Embeds」を選びます。短い表示名は「Video Embeds」です。変換されたURLをコピーするか、対応端末では「変換URLを共有」を押して送り先を選びます。

共有先に表示されないときは、ChromeでWebアプリをインストールできているか（ホーム画面のブックマークだけになっていないか）確認してください。[Chromeの共有受信の資料](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target)

## iPhone・iPad

1. [日本語の共有ショートカット](https://www.icloud.com/shortcuts/5ee0dc22e8ae4aa6a911aed3deed51c5)をiPhoneまたはiPadで開き、「ショートカットを取得」をタップします。[英語版もあります](https://www.icloud.com/shortcuts/84e6c58d40d8494a9e4ce1584605b89a)。
2. YouTubeの共有メニューで「YouTubeをXに埋め込み」を選ぶと、ツールの変換結果が開きます。

iPhone・iPadでツールを直接開くと、画面下の案内から表示言語に合ったショートカットを追加できます。[Appleの共有ショートカットガイド](https://support.apple.com/ja-jp/guide/shortcuts/apdf01f8c054/ios)

## 共有入力の仕様

- ショートカットは `#text=` にURLエンコードした共有テキストを渡します。動画URLを直接渡す場合は `#url=` も使えます。
- Androidの共有は、同じページへのGETリクエストで `text`、`url`、`title` を渡します。どの項目に動画URLが入っていても取り込みます。
- フラグメントに `text` または `url` があれば、空欄でもクエリより優先します。共有用の項目は処理後にアドレス欄から除き、他の項目は残します。
- URLだけでも、タイトルとURLを改行や空白で区切ったテキストでも使えます。既存の変換処理で検証し、同じ変換先にまとまるリンクは1件として扱います。開始時刻などが異なるリンクが複数ある場合は、変換したいURLを1つ貼り直してください。
- 共有パラメータは1回だけデコードします。URL中の `&`、`#`、`+`、`%` を保つには、送る文字列全体をエンコードしてください。

## オフラインと更新

初回にオンラインで開き、ブラウザがアプリのファイルを保存した後はオフラインでも変換できます。Xの投稿画面や動画を開くには通信が必要です。再共有は端末の共有機能と送り先アプリの動作に従います。

ビルド時にアプリのファイルから版を識別し、Service Workerが版ごとにキャッシュを作ります。更新はアプリのタブやウィンドウをすべて閉じてから有効になります。入力中に更新が見つかっても強制的にリロードしません。更新が反映されない場合は、一度オンラインで開いた後にアプリの画面をすべて閉じ、開き直してください。[Service Workerのライフサイクル](https://web.dev/articles/service-worker-lifecycle)

## 実機での確認手順

- Android Chromeでインストールし、YouTubeから共有先に「Share Video Embeds」が出ることを確認します。共有すると変換結果が表示され、再共有に渡されるのが `/live/` の動画URLであることを確認します。共有をキャンセルしてもエラーが出ないことを確認します。
- iPhoneまたはiPadでショートカットを作成し、URLのみの場合と、タイトル・改行・URLを含むテキストの場合を試します。変換結果と、同じページへの再共有が機能することを確認します。
- 両方で、共有から開いた直後にURLを変換できることを確認します。オンラインでアプリのキャッシュができた後、機内モードで開き直してURLを変換します。

## 変換の仕組み

同じ動画でも、URLを /live/ 形式に変えると、X（旧Twitter）向けのメタ情報が埋め込みプレイヤー用になる場合があります。この違いを利用して動画IDを変えずにURLの形式を変更します。メタ情報はリンクの表示方法をXに伝える情報です。

## 動作の保証

YouTubeやXの仕様変更、動画ごとの制限、Xが保持しているリンク情報などによって、プレイヤーが表示されないことや再生できないことがあります。この方法が今後も使えるとは限りません。

## 公開用ビルドとプレビューの検証

標準の `npm run build` はリンク変換・コピー・共有を提供します。YouTubeのプレイヤーによるプレビューは別のローカル確認版にあります。公開用の判断と公式条項の対応は[ポリシー確認メモ](YOUTUBE-POLICY.md)を参照してください。

ローカル確認版を作るには `npm run build:preview` の後に `npm start` を実行します。初期状態では変換だけを行います。プレイヤーは「プレビューを表示」を押すか、「次回から自動でプレビューを読み込む」をONにして次のURLを変換したときに読み込みます。動画はプレイヤー内の操作で再生します。Made For Kidsの照会はこの確認版に含まれていません。

## 追跡用パラメータを除去

初期設定はOFF。ON／OFFをこのブラウザに保存します。

ONにすると si・pp・utm_* などを除去。開始時刻やプレイリスト情報は残します。

## 保存するのは設定だけ

公開版は表示言語、追跡除去、Xでシェアするときにタイトルを付けるかどうかをブラウザに保存します。ローカル確認版では同意の記録と、明示的にONにした自動プレビュー設定も保存します。アプリは共有テキスト、入力URL、変換履歴を保存しません。オフライン用にはアプリのファイルだけをキャッシュします。[プライバシーポリシー・利用条件](docs/privacy.html#ja)

ショートカットのフラグメントはHTTPリクエストに含まれません。Service Workerがまだページを制御していない初回などは、Androidが渡したクエリがGitHub PagesへのHTTPリクエストに含まれます。処理後は共有パラメータをアドレス欄から除きます。

## 検索エンジンへの登録

ビルド時に、日本語の `index.html` と英語の `en.html` を同じテンプレートと翻訳データから生成します。本文、ページ説明、正規URL、相互の言語リンク、SNS用メタ情報を最初のHTMLに含めます。`sitemap.xml` には日本語版・英語版・プライバシーポリシーを記載しています。直接開くとURLに対応する言語が表示され、共有経由とインストール済みアプリの起動時には保存済みの言語設定が反映されます。

Google Search Consoleで「URLプレフィックス」を選び、`https://h4m4chi-ttr.github.io/share-video-embeds/` を登録します。所有権確認の「HTMLタグ」に表示された `google-site-verification` を `docs/index.html` の `<head>` 内に追加してデプロイし、「確認」を押します。確認後もタグを残してください。続いて「サイトマップ」で `sitemap.xml` を送信し、「URL検査」で日本語版と英語版のインデックス登録をリクエストします。確認タグはビルド時に両言語のHTMLへ引き継がれます。[Googleの所有権確認手順](https://support.google.com/webmasters/answer/9008080?hl=ja)

このプロジェクト内に `robots.txt` を置いてもクローラーの制御には使われません。有効なのはアカウント側のPagesサイトにある `https://h4m4chi-ttr.github.io/robots.txt` です。このツールのサイトマップはSearch Consoleから送信できます。[Googleのrobots.txt配置ルール](https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt)

## ソースコード

[GitHub](https://github.com/H4M4CHi-ttr/share-video-embeds) · [Development / Deployment](README.md#development)

[X公式Player Cardサンプル](https://github.com/xdevplatform/cards-player-samples/blob/main/player/page.html) · [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)

YouTube・Xの非公式ツール

## ライセンス

[MIT](LICENSE)
