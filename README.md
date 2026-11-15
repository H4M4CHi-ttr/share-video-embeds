# YouTube to X Player

[ツールを開く](https://h4m4chi-ttr.github.io/youtube-to-x-player/) · [English](README.en.md)

YouTube動画をX（旧Twitter）にプレイヤー付きで投稿するためのURL変換ツール。貼り付けてコピーするだけ。今後を含む表示・再生の保証はありません。

YouTubeのURLを貼り付け、変換されたURLをコピーしてXの投稿欄に貼り付けるだけです。

**Xでの表示・再生や今後の動作を100%保証するものではありません。**

## 使い方

1. YouTubeのURLを貼り付ける
2. 変換URLをコピーする
3. Xの投稿欄に貼り付ける

## 変換の仕組み

同じ動画でも、URLを /live/ 形式に変えると、X（旧Twitter）向けのメタ情報が埋め込みプレイヤー用になる場合があります。この違いを利用して動画IDを変えずにURLの形式を変更します。メタ情報はリンクの表示方法をXに伝える情報です。

## 動作の保証

YouTubeやXの仕様変更、動画ごとの制限、Xが保持しているリンク情報などによって、プレイヤーが表示されないことや再生できないことがあります。この方法が今後も使えるとは限りません。

## 動画プレビュー

プレビューでの再生確認は任意です。Xへの投稿には上の変換URLを使ってください。

このページのプレイヤーは同じ動画を /embed/ 形式で表示します。再生開始の通知を受け取ると確認済みになりますが、X用のメタ情報やX上での再生を検査するものではありません。動画全編の再生も保証しません。

有効なURLの入力後、YouTubeに直接接続してプレイヤーを表示します。再生はボタンを押すまで始まりません。

## 追跡用パラメータを除去

初期設定はOFF。ON／OFFをこのブラウザに保存します。

ONにすると si・pp・utm_* などを除去。開始時刻やプレイリスト情報は残します。

## 保存するのは設定だけ

言語と追跡除去のON／OFFをlocalStorageに保存します。入力URLや再生履歴は保存しません。YouTubeへの接続後はYouTube側のデータ処理が適用されます。

## ソースコード

[GitHub](https://github.com/H4M4CHi-ttr/youtube-to-x-player) · [Development / Deployment](README.en.md#development)

[X公式Player Cardサンプル](https://github.com/xdevplatform/cards-player-samples/blob/main/player/page.html) · [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)

YouTube・Xの非公式ツール
