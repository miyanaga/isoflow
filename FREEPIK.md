# Freepik API 技術仕様書

## 概要

Freepik API を使用したアイコン検索とSVGダウンロードの実装ガイドです。このドキュメントは、Freepik のアイコンリソースを検索し、SVG形式でダウンロードするための技術仕様を記載しています。

## API エンドポイント

### ベースURL
```
https://api.freepik.com/v1
```

## 認証

### APIキー設定
```javascript
// 環境変数から取得
const apiKey = process.env.FREEPIK_API_KEY

// リクエストヘッダーに設定
headers: {
  'x-freepik-api-key': apiKey
}
```

## アイコン検索

### エンドポイント
```
GET /icons
```

### リクエストパラメータ

| パラメータ | 型 | 説明 | 例 |
|---------|---|------|---|
| `term` | string | 検索キーワード | "home", "business" |
| `per_page` | number | 1ページあたりの結果数（最大100） | 30 |
| `page` | number | ページ番号 | 1 |
| `order` | string | ソート順 | "relevance", "recent" |
| `filters[shape]` | string | アイコンスタイル | "outline", "fill", "lineal-color", "hand-drawn" |
| `filters[free_svg]` | string | SVG利用可能フィルタ | "all", "free", "premium" |
| `thumbnail_size` | number | サムネイルサイズ（px） | 128 |

### 実装例

```typescript
async searchIcons(query: string, options: IconSearchOptions = {}): Promise<FreepikApiResponse> {
  const params = {
    term: query,
    per_page: options.per_page || 30,
    page: options.page || 1,
    order: options.order || 'relevance',
    thumbnail_size: options.thumbnail_size || 128,
    ...options
  }

  // テイストによる絞り込み
  if (options.taste) {
    params['filters[shape]'] = options.taste
  }

  const response = await axios.get('https://api.freepik.com/v1/icons', {
    headers: {
      'x-freepik-api-key': apiKey
    },
    params
  })

  return response.data
}
```

### レスポンス構造

```typescript
interface FreepikApiResponse {
  data: Array<{
    id: string
    name: string
    title: string
    thumbnails: Array<{
      width: number
      height: number
      url: string
    }>
    author: {
      id: string
      name: string
      username: string
    }
    set?: {
      id: string
      name: string
      slug: string
    }
    family?: {
      id: string
      name: string
    }
    style?: string | { name: string }
    tags: string[] | Array<{ name: string, slug: string }>
  }>
  meta: {
    pagination: {
      total: number
      count: number
      per_page: number
      current_page: number
      total_pages: number
    }
  }
}
```

## SVGダウンロード

### エンドポイント
```
GET /icons/{id}/download
```

### リクエストパラメータ

| パラメータ | 型 | 説明 | 例 |
|---------|---|------|---|
| `format` | string | ダウンロード形式 | "svg", "png" |

### 実装例

```typescript
async getIconDownloadUrl(id: string, format: string): Promise<string> {
  const response = await axios.get(
    `https://api.freepik.com/v1/icons/${id}/download`,
    {
      headers: {
        'x-freepik-api-key': apiKey
      },
      params: {
        format: format // "svg" or "png"
      }
    }
  )

  // ダウンロードURLを取得
  if (response.data?.data?.url) {
    return response.data.data.url
  } else {
    throw new Error('Download URL not found in response')
  }
}
```

### レスポンス構造

```typescript
interface DownloadResponse {
  data: {
    url: string  // 実際のダウンロードURL（一時的、有効期限あり）
  }
}
```

### ダウンロード処理

```typescript
async downloadSVG(iconId: string): Promise<Buffer> {
  // 1. ダウンロードURLを取得
  const downloadUrl = await getIconDownloadUrl(iconId, 'svg')
  
  // 2. URLから実際のファイルをダウンロード
  const response = await fetch(downloadUrl)
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }
  
  // 3. バッファとして取得
  const buffer = await response.buffer()
  
  return buffer
}
```

## エラーハンドリング

### HTTPステータスコード

| コード | 意味 | 対処法 |
|-------|------|--------|
| 401 | 認証エラー | APIキーを確認 |
| 403 | アクセス禁止 | 権限・プランを確認 |
| 429 | レート制限 | リトライまたは待機 |
| 404 | リソース未検出 | IDを確認 |
| 500 | サーバーエラー | リトライ |

### エラー処理実装

```typescript
try {
  const result = await freepikApi.searchIcons(query, options)
} catch (error) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const message = error.response?.data?.message
    
    switch(status) {
      case 429:
        throw new Error(`API_LIMIT_EXCEEDED: ${message}`)
      case 401:
        throw new Error(`API_UNAUTHORIZED: ${message}`)
      case 403:
        throw new Error(`API_FORBIDDEN: ${message}`)
      default:
        throw new Error(`API_ERROR: ${message}`)
    }
  }
  throw error
}
```

## レート制限

### 制限内容
- 無料プラン: 100リクエスト/月
- 有料プラン: プランにより異なる

### 対策
1. リクエストのキャッシュ実装
2. バッチ処理での一括取得
3. エラー時のリトライ実装（指数バックオフ）

## 実装のベストプラクティス

### 1. 検索最適化
```typescript
// 複数キーワードの同時検索
const keywords = ['home', 'business', 'settings']
const results = await Promise.all(
  keywords.map(keyword => 
    searchIcons(keyword, { per_page: 50 })
  )
)
```

### 2. ダウンロード最適化
```typescript
// 並列ダウンロード（ただしレート制限に注意）
const downloadPromises = icons.map(async (icon) => {
  const url = await getIconDownloadUrl(icon.id, 'svg')
  return fetch(url)
})

// 3件ずつ処理（レート制限対策）
const chunks = chunk(downloadPromises, 3)
for (const chunk of chunks) {
  await Promise.all(chunk)
  await sleep(1000) // 1秒待機
}
```

### 3. キャッシュ戦略
```typescript
// メモリキャッシュの実装
const cache = new Map()

async function cachedSearch(query: string, options: any) {
  const cacheKey = `${query}-${JSON.stringify(options)}`
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }
  
  const result = await searchIcons(query, options)
  cache.set(cacheKey, result)
  
  // 15分後に削除
  setTimeout(() => cache.delete(cacheKey), 15 * 60 * 1000)
  
  return result
}
```

## セキュリティ上の注意

1. **APIキーの管理**
   - 環境変数で管理（.envファイル）
   - クライアントサイドに露出させない
   - Gitにコミットしない

2. **ダウンロードの検証**
   - ファイルサイズの上限チェック
   - Content-Typeの検証
   - ウイルススキャン（本番環境）

3. **レート制限対策**
   - リクエスト数の監視
   - ユーザーごとの制限実装
   - キューイングシステムの導入

## トラブルシューティング

### よくある問題と解決策

1. **ダウンロードURLが無効**
   - 原因: URLの有効期限切れ
   - 解決: 再度ダウンロードURLを取得

2. **検索結果が0件**
   - 原因: フィルタが厳しすぎる
   - 解決: フィルタを緩和、キーワードを変更

3. **SVGが利用不可**
   - 原因: プレミアムコンテンツ
   - 解決: filters[free_svg]="free"を使用

## 参考リンク

- [Freepik API Documentation](https://docs.freepik.com/)
- [Freepik Developer Portal](https://developers.freepik.com/)
- [API Status Page](https://status.freepik.com/)