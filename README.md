# ResumeAI — 履歷問答助理

一個給面試官用的 AI 聊天機器人，上傳你的履歷 PDF，面試官可以直接問問題。

## 快速開始

```bash
npm install
npm run dev
```

## 部署到 Vercel（免費，不用 24h 開機）

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入並部署
vercel

# 之後每次更新
vercel --prod
```

部署完成後你會得到一個 `https://your-project.vercel.app` URL，直接給面試官就好。

## 使用方式

1. 開啟網站，點右上角「設定 API Key」
2. 去 https://aistudio.google.com/app/apikey 申請免費的 Gemini API Key（需要 Google 帳號）
3. 貼上 Key 後按儲存（Key 存在瀏覽器 localStorage，不會上傳到伺服器）
4. 上傳你從 104 下載的履歷 PDF
5. 開始問答！

## 功能

- 拖曳或點擊上傳 PDF
- 預設 5 個常見面試問題快速按鈕
- 繁體中文回答
- Enter 送出，Shift+Enter 換行
- API Key 存在本地，不外洩

## 技術

- React 18 + Vite
- Google Gemini 1.5 Flash API（免費方案：1500 req/天）
- 純前端，零後端，零伺服器費用

## 注意事項

- API Key 只存在使用者自己的瀏覽器，不會送到任何第三方伺服器
- 履歷 PDF 直接以 base64 送給 Gemini API，不儲存
- 如要讓面試官不用自己填 Key，可以把 Key 放進 `.env`：
  ```
  VITE_GEMINI_KEY=AIza...
  ```
  然後在 App.jsx 把 `apiKey` 預設值改為 `import.meta.env.VITE_GEMINI_KEY`
