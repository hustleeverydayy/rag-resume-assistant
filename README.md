# RAG 履歷問答系統

一個基於檢索增強生成（RAG）技術的智慧履歷問答助理，面試官可透過自然語言提問，系統自動從履歷中找出最相關的段落並生成精準回答。完全本地運行，不需要任何 API Key。


---

## 技術架構

```
上傳履歷 PDF
     ↓
PyMuPDF 抽取文字
     ↓
LangChain 切成段落（chunk）
     ↓
nomic-embed-text 向量化
     ↓
存入本地 ChromaDB
     ↓
面試官提問 → 語意搜尋找最相關段落（Top 6）
     ↓
llama3.2 根據段落生成回答
```

### 使用技術

| 類別 | 技術 |
|------|------|
| 前端 | React 18、Vite |
| 後端 | Python、FastAPI |
| RAG | LangChain、ChromaDB |
| LLM | Ollama（llama3.2）|
| Embedding | Ollama（nomic-embed-text）|
| PDF 解析 | PyMuPDF（fitz）|

---

## 專案結構

```
rag-agent/
├── backend/
│   ├── main.py        # FastAPI server，提供 /upload、/ask、/status API
│   ├── rag.py         # RAG 核心邏輯（向量化、語意搜尋、LLM 推論）
│   └── uploads/       # 放置履歷 PDF 的資料夾
└── frontend/          # React 前端（放在 resume-ai-chatbot 資料夾下執行）
    └── src/
        └── App.jsx    # 主介面，左側 PDF 預覽、右側聊天
```

---

## 環境需求

- [Ollama](https://ollama.com) 已安裝並執行
- Python 3.11+
- Node.js 18+
- Anaconda（建議）

---

## 安裝與執行

### 1. 安裝 Ollama 模型

```bash
ollama pull llama3.2
ollama pull nomic-embed-text
```

### 2. 建立 Python 環境

```bash
conda create -n rag-agent python=3.11 -y
conda activate rag-agent

pip install fastapi uvicorn python-multipart
pip install langchain langchain-community langchain-ollama langchain-core langchain-text-splitters
pip install chromadb pymupdf
```

### 3. 啟動後端

```bash
conda activate rag-agent
cd rag-agent/backend
uvicorn main:app --reload
```

後端運行於 `http://localhost:8000`

### 4. 啟動前端

```bash
conda activate resume-ai   # 或任何有安裝 Node.js 的環境
cd resume-ai-chatbot
npm install
npm run dev
```

前端運行於 `http://localhost:5173`

---

## 使用方式

1. 開啟 `http://localhost:5173`
2. 拖曳或點擊上傳履歷 PDF
3. 等待向量化完成（約 10~30 秒）
4. 直接輸入問題或點擊建議問題開始問答

---

## 核心設計說明

### RAG 流程

傳統做法是把整份 PDF 塞進 prompt，但這樣有 token 限制且容易讓 LLM 分心。本專案改用 RAG：

1. **切段**：履歷文字切成 200 字的小段落（overlap 40 字避免語意截斷）
2. **向量化**：每段用 `nomic-embed-text` 轉成向量，存進 ChromaDB
3. **搜尋**：面試官提問時，找出語意最相近的 6 個段落
4. **生成**：只把這 6 段丟給 llama3.2，大幅降低雜訊、提升回答精準度

### 為什麼用 nomic-embed-text 而非 llama3.2 做 Embedding

`llama3.2` 是生成模型，直接用來做 embedding 對中文效果不佳。`nomic-embed-text` 是專門訓練的 embedding 模型，語意搜尋準確度更高。

---

## API 文件

後端啟動後可至 `http://localhost:8000/docs` 查看完整 Swagger 文件。

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/status` | 確認是否已載入文件 |
| POST | `/upload` | 上傳 PDF 並向量化 |
| POST | `/ask` | 提問並取得回答 |
| GET | `/pdf/{filename}` | 取得 PDF 檔案 |
| DELETE | `/reset` | 清除所有向量資料 |

---

## 作者

**蘇邑洋 Su Yi Yang**
國立彰化師範大學 資訊工程學系 碩士
