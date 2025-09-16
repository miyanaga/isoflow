# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Isoflowは、ネットワークダイアグラムを描画するためのオープンソースのReactコンポーネントライブラリです。ドラッグ&ドロップエディタと拡張可能なアイコンシステムを特徴としています。

## 開発コマンド

```bash
# 開発サーバーの起動 (webpack-dev-server)
npm start

# ビルドの監視モード
npm run dev

# プロダクションビルド (webpackとTypeScript宣言ファイル生成)
npm run build

# テストの実行
npm test

# リンティング (TypeScriptとESLint)
npm run lint

# リンティングの自動修正
npm run lint:fix

# Dockerビルド
npm run docker:build
```

## アーキテクチャ

### コアアーキテクチャ
- **Zustandストア管理**: モデルデータ、シーンの状態、UIの状態を別々のZustandストアで管理
  - `modelStore.tsx`: ダイアグラムのデータモデル（ノード、コネクター、矩形、テキストボックス）
  - `sceneStore.tsx`: ビューポート、選択状態、インタラクションモード
  - `uiStateStore.tsx`: UIの表示状態、エディタモード

- **レイヤーシステム**: `SceneLayer`コンポーネントを使用してダイアグラムの各要素を独立したSVGレイヤーとしてレンダリング
  - Nodes、Connectors、Rectangles、TextBoxesなどが別々のレイヤー

- **インタラクションモード**: `src/interaction/modes/`で定義された各モード（Cursor、Node、Connector、Pan、Zoom等）が特定のユーザー操作を処理

- **アイソメトリック投影**: `useIsoProjection`フックを使用して2D座標とアイソメトリック座標の変換を管理

### コンポーネント構成
- `Isoflow.tsx`: メインエントリーポイント。プロバイダーとレンダラーを設定
- `Renderer.tsx`: SVGキャンバスとすべてのシーンレイヤーを管理
- `UiOverlay.tsx`: ツールメニュー、コンテキストメニュー、コントロールパネルなどのUI要素

### ビルド設定
- **Webpack**: 開発、本番、Dockerの3つの設定ファイル（`webpack/*.js`）
- **TypeScript**: ES6モジュール、React JSX変換、厳格モードを使用（`tsconfig.json`）
- **ESLint**: Airbnb設定ベース、Prettierとの統合

### テスト
- Jest with ts-jest preset
- テスト環境: Node.js

## 注意事項

- **Immer使用**: Zustandストアの状態更新でImmerを使用（`draft`パラメータの変更が許可されている）
- **パスエイリアス**: `src/*`パスは`./src/*`にマッピング
- **アイコンパック**: `@isoflow/isopacks`パッケージで提供される外部アイコンライブラリをサポート