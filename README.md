# ホテル周辺デジタルコンシェルジュ

ホテルが厳選した周辺スポットを地図で案内するゲスト向けアプリと、スタッフ用CMSのモノレポです。Cloudflare Workers + D1 + KV 上で動作します。

## ローカルで動かす

**前提:** Node.js

1. 依存関係をインストール:
   `npm install`
2. ローカルD1にスキーマを適用:
   `npm run db:migrate:local`
3. 開発サーバーを起動:
   `npm run dev`

## デプロイ（Cloudflare）

1. `npx wrangler login`
2. `npx wrangler d1 create hotel-concierge-db` → 出力されたdatabase_idを`wrangler.jsonc`に反映
3. `npx wrangler kv namespace create hotel-concierge-images` → 出力されたidを`wrangler.jsonc`に反映
4. `npm run db:migrate:remote`
5. `npm run deploy`

## 主な機能

- ゲスト向け地図（多言語対応・GPS連動）
- スタッフ用CMS（スポット管理・画像アップロード・住所検索による位置設定）
- 周辺イベント情報の無料自動取得（APIキー不要、終了済みイベントは除外）
  - 道後温泉公式エリアガイド・道後温泉コンソーシアム公式サイトのRSSフィードから取得
  - 会場の正確な位置情報を含まないため、地図にはピン留めせずカレンダー形式で表示
