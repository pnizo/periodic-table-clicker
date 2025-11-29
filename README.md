# Periodic Table Clicker - 元素周期表クリッカー

周期表をモチーフにした放置/クリッカーゲーム。粒子を生成し、元素を合成して宇宙のエネルギーを最大化しよう！

## 🎮 プレイ方法

[GitHub Pagesでプレイ](https://your-username.github.io/periodic-table-clicker/)

または、ローカルで `index.html` を開いてください。

## ✨ 特徴

- **クリッカーメカニクス**: エネルギーボタンをクリックしてエネルギーを生成
- **粒子生成機**: 電子、陽子、中性子の自動生成システム
- **元素合成**: 26種類の元素（H〜Fe）を合成可能
- **インタラクティブUI**: ホバーでレシピ表示、色分けされた利用可能性表示
- **自動セーブ**: 10秒ごとに自動保存（localStorage使用）
- **モダンデザイン**: ダークテーマ、グラスモーフィズム、スムーズなアニメーション

## 🎯 ゲームの目標

1. エネルギーを生成して粒子生成機をアップグレード
2. 粒子を集めて元素を合成
3. より高度な元素を合成して宇宙エネルギーを最大化

## 🛠️ 技術スタック

- HTML5
- CSS3 (カスタムプロパティ、アニメーション、グリッドレイアウト)
- Vanilla JavaScript (ES6+)
- Google Fonts (Inter, Orbitron)

## 📁 ファイル構成

```
periodic-table-clicker/
├── index.html      # メインHTML
├── style.css       # スタイルシート
├── game.js         # ゲームロジック
└── README.md       # このファイル
```

## 🎨 機能詳細

### エネルギーシステム
- クリックで+1エネルギー
- 粒子から自動生成: `(電子 + 陽子 + 中性子) × 0.1` e/秒
- 元素から自動生成: `元素数 × 原子番号 × 10 × 0.05` e/秒

### 粒子生成機
- 初期コスト: 10e
- コスト倍率: 1.15^レベル
- 生成速度: 1/秒 × レベル

### 元素合成
26種類の元素を実装:
- 水素(H) → ヘリウム(He) → ... → 鉄(Fe)
- 各元素は粒子と他の元素を必要とする
- ホバーでレシピと利用可能性を表示

## 🚀 ローカル開発

```bash
# リポジトリをクローン
git clone https://github.com/your-username/periodic-table-clicker.git

# ディレクトリに移動
cd periodic-table-clicker

# index.htmlをブラウザで開く
```

## 📝 ライセンス

MIT License

## 🙏 謝辞

- Google Fonts (Inter, Orbitron)
- 周期表データ

---

Made with ⚛️ by [Your Name]
