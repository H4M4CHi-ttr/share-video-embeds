# Live Link Converter とYouTube公式ポリシーの対応

この文書は公開版とローカルのプレビュー検証版を対象とします。YouTubeによる適合性の審査は受けていません。

| 項目 | 公式条項と実装の対応 |
| --- | --- |
| アプリ名・ブランド | [YouTube Branding Guidelines](https://developers.google.com/youtube/terms/branding-guidelines) は、アプリの名称とYouTubeの名称・その略称などを組み合わせないよう求めています。画面、ブラウザのタイトル、Manifestの名称を **Live Link Converter**／**Live Links** に変更しました。説明文は対応する動画サービスを示すためにYouTubeと記載します。アイコンは再生マークと丸い交差線を組み合わせた独自の図形です。GitHub Pagesの既存パスとManifest IDはブックマーク・共有・インストールの継続のために維持しています。公開版で将来YouTube由来のデータを表示する場合は、[Developer Policies III.F.2](https://developers.google.com/youtube/terms/developer-policies#f-user-experience) の出典表示と、推奨されるロゴの使い方も再確認してください。 |
| プライバシー・利用条件 | [API利用規約 §7](https://developers.google.com/youtube/terms/api-services-terms-of-service#7-user-privacy-and-api-clients) と [Developer Policies III.A](https://developers.google.com/youtube/terms/developer-policies#a-api-client-terms-of-use-and-privacy-policies) は、公開ポリシー、Googleのプライバシーポリシーへのリンク、YouTubeの利用規約へのリンクと利用条件での明記、APIクライアントの機能にアクセスする前の同意を求めています。[日英のポリシーと利用条件](docs/privacy.html) を追加しました。公開用ビルドはYouTube APIを呼ばずに変換し、IFrame APIを使うローカル確認版では利用開始前に同意を求めます。Googleのログイン、OAuthによるユーザーデータの取得、アプリ側の解析はありません。連携先・ホストによるデータ処理を文面に記載しています。 |
| Made For Kids | [Developer Policies III.E.4.j](https://developers.google.com/youtube/terms/developer-policies#e-handling-youtube-data-and-content) は、埋め込む各動画の状態を調べ、Made For Kids指定の動画ではトラッキングを無効にし、プレイヤーに関するデータ収集を適用法に従わせるよう求めています。[公式手順](https://developers.google.com/youtube/v3/guides/made_for_kids_status) は、APIプロジェクトのYouTube Data APIで `videos.list` を呼び、`status.madeForKids` を確認します。現在の構成にその照会はなく、**公開用では埋め込み自体を無効化**しました。ローカル版のオプトインや `youtube-nocookie.com` は照会の代用になりません。 |
| 読み込みと再生 | [Developer Policies III.E.4.i](https://developers.google.com/youtube/terms/developer-policies#e-handling-youtube-data-and-content) は、プレイヤーの読み込み時にも基本データを共有し、再生時には追加データが共有されることを説明しています。[最低機能要件](https://developers.google.com/youtube/terms/required-minimum-functionality#youtube-embedded-player-and-video-playback) は再生開始の条件、参照元、寸法、プレイヤーに重ねる要素を定めています。ローカル確認版は初期OFF、操作後または明示的な設定ON時に読み込み、`autoplay=0` で再生はプレイヤー内の操作から始めます。アプリのスクリプトから再生を開始するボタンは削除しました。表示時は幅と高さを200px以上にし、参照元のオリジンを送る既存の設定と純正の操作部を維持します。 |
| 保存とオフライン | [Developer Policies III.E.1](https://developers.google.com/youtube/terms/developer-policies#e-handling-youtube-data-and-content) は、許可のない動画・音声のキャッシュやオフライン再生を禁じています。Service Workerは同一オリジンの固定ファイル一覧だけを保存します。動画・音声・埋め込みプレイヤー・IFrame API・プレイヤー応答を保存しません。入力URL、共有タイトル、変換履歴はブラウザの永続ストレージに書き込みません。オフラインはURL処理などのアプリ機能に限ります。 |
| oEmbedによるタイトル取得 | 旧実装のエンドポイントは [oEmbed仕様](https://oembed.com/) に例があり、応答も確認できました。一方、[Developer Policies III.D.7](https://developers.google.com/youtube/terms/developer-policies#d-accessing-youtube-api-services) と照らし、このアプリがXへの投稿タイトル補完に使う範囲を明示したYouTube側のAPI仕様は確認できませんでした。この用途が規約違反とは断定せず、今回の実装から外しました。X投稿画面には共有元のタイトル、または入力欄に指定したタイトルを渡します。 |
| URL変換の扱い | [YouTubeの利用規約の「許可と制限」](https://www.youtube.com/t/terms) では公式埋め込みプレイヤーでの表示を認める一方、サービスやコンテンツの利用を制限する機能の回避などを禁じています。このツールは同じ動画IDのURLを組み替え、利用者が選んだときにXやYouTubeへ移動します。動画ファイルの取得や、YouTubeプレイヤーの制限の解除は実装していません。URL形式によるXカードの違いは観測結果であり、YouTubeがその利用方法やX上での再生を保証したものではありません。 |

[YouTubeの埋め込みヘルプ](https://support.google.com/youtube/answer/171780?hl=en-GB) が説明するプライバシー強化モードは、埋め込みの視聴データをYouTubeでのパーソナライズに使う範囲を制限します。Made For Kidsの動画ごとの確認や、子ども向けアプリに該当する場合の [Developer Policies III.J](https://developers.google.com/youtube/terms/developer-policies#j-child-directed-api-clients) の届出・データの取扱いとは別です。このツールの実際の利用者層や適用法の判断は、この変更では確定していません。

## 公開の選択肢

- **GitHub Pagesの公開用ビルド**は `npm run build` です。貼り付け、Android／iOSの共有受信、変換、コピー、X共有、外部の動画ページを開く操作を提供します。アプリ内プレビューとoEmbedによるタイトル取得は利用しません。GitHub Actionsはこのビルドを使います。
- **埋め込みを維持する場合**は、公式のData APIで埋め込む動画の `status.madeForKids` を確認する仕組みを用意します。維持する際の小さい選択肢は、指定が `true`、結果不明、照会失敗の場合に埋め込みを出さず、リンクの操作だけを提供することです。Made For Kids動画も埋め込む場合には、トラッキングとデータ収集を別途確認します。現在のキー不要の構成では、任意の動画に対するこの照会を行っていません。
- 埋め込み対応を今後も維持しないなら、公開用ビルドのURL機能を残し、ローカル確認版、プレイヤーコード、プレビュー設定を削除できます。現在は指定された読み込み仕様を検証できるようローカル確認版だけに残しています。

## 確認用ビルド

`npm run build:preview` と `npm start` で、ループバックのプレビュー検証向けの画面を出せます。初期OFFの状態では、変換時にYouTubeのプレイヤーもAPIも読み込みません。結果欄のボタンで表示でき、チェックをONにした次回の変換から、手入力、Androidの共有クエリ、iOSの共有フラグメントで読み込みます。OFFに戻すと設定を消去し、開いたプレイヤーや待機中の読み込みを終了します。

このビルドはMade For Kids照会を含まない検証用です。実際の埋め込み要件の適合確認は継続事項です。既存のデプロイを更新する場合は `npm run build` の成果物を使います。
