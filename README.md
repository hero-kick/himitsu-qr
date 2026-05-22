# ひみつQR

あいことばで開く、秘密のQRメッセージ。

プレゼント、謎解き、推し活、イベント向けのエンタメツールです。QRコードを読み取っても、あいことばを知らない人には中身が読めません。

## 技術スタック

- Vite + React + TypeScript
- Web Crypto API（AES-GCM + PBKDF2-SHA256）
- qrcode ライブラリ（QRコード生成）
- サーバー不要、完全クライアント動作

## セットアップ

```bash
npm install
npm run dev
```

## スクリプト

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run test` | テスト実行 |
| `npm run lint` | ESLint |

## 暗号仕様

- AES-GCM 256bit
- PBKDF2-SHA256（300,000 iterations）
- salt: 16 bytes（毎回ランダム生成）
- iv: 12 bytes（毎回ランダム生成）
- 本文・あいことばはどこにも保存されません

## 注意

このツールはエンタメ用途を想定しています。医療情報、金融情報、業務機密などの重要情報には使用しないでください。
