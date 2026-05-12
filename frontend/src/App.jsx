import { useState, useRef, useEffect } from "react";

const API = "http://localhost:8000";

const SUGGESTED_QUESTIONS = [
  "請簡單介紹蘇邑洋的背景",
  "他有哪些主要技術專長？",
  "說說他最值得一提的專案或成就",
  "他的碩士論文在研究什麼？",
  "他有什麼競賽經驗？",
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [loadedFiles, setLoadedFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [checking, setChecking] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // 啟動時檢查後端是否已預載 PDF
  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${API}/status`);
      const data = await res.json();
      if (data.ready) {
        setReady(true);
        setLoadedFiles(data.files);
        setMessages([{
          role: "assistant",
          text: `👋 你好！我是蘇邑洋的 AI 履歷助理，可以問我任何關於他的問題！`,
        }]);
      }
    } catch {
      // 後端還沒起來，忽略
    }
    setChecking(false);
  };

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith(".pdf")) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setReady(true);
      setLoadedFiles([file.name]);
      setMessages([{
        role: "assistant",
        text: `✅ ${data.message}\n\n現在可以問我關於這份文件的任何問題！`,
      }]);
    } catch (e) {
      alert(`上傳失敗：${e.message}`);
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const ask = async (question) => {
    const q = question || input.trim();
    if (!q || !ready) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setMessages(prev => [...prev, { role: "assistant", text: data.answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: `⚠️ 錯誤：${e.message}` }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); }
  };

  // 載入中
  if (checking) {
    return (
      <div style={S.root}>
        <style>{globalCSS}</style>
        <div style={S.centerScreen}>
          <div style={S.logoMark}>◈</div>
          <p style={S.loadingText}>連線中...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.root}>
      <style>{globalCSS}</style>
      <div style={S.shell}>

        {/* Header */}
        <header style={S.header}>
          <div style={S.headerLeft}>
            <div style={S.logo}>
              <div style={S.logoMark}>◈</div>
              <span style={S.logoText}>蘇邑洋 · 履歷助理</span>
            </div>
            {ready && <div style={S.statusDot} title="履歷已載入" />}
            {loadedFiles.length > 0 && (
              <span style={S.fileName}>{loadedFiles[0]}</span>
            )}
          </div>
        </header>

        {/* Main */}
        {!ready ? (
          // 沒有預載 PDF，顯示上傳區
          <div
            style={{ ...S.dropzone, ...(dragOver ? S.dropzoneActive : {}), ...(uploading ? S.dropzoneLoading : {}) }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <div className="spinner" style={{ width: 32, height: 32, marginBottom: 16 }} />
                <p style={S.dropTitle}>正在處理 PDF...</p>
                <p style={S.dropSub}>向量化中，請稍候</p>
              </>
            ) : (
              <>
                <div style={S.dropIcon}>⬆</div>
                <p style={S.dropTitle}>拖曳或點擊上傳 PDF</p>
                <p style={S.dropSub}>或把 PDF 放進 backend/uploads/ 再重啟 server</p>
              </>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }}
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        ) : (
          // 聊天區（全寬，不顯示 PDF panel，面試官不需要看原始 PDF）
          <div style={S.chatPanel}>
            {messages.length <= 1 && (
              <div style={S.suggestWrap}>
                <p style={S.suggestLabel}>建議問題</p>
                <div style={S.suggestGrid}>
                  {SUGGESTED_QUESTIONS.map(q => (
                    <button key={q} style={S.suggestBtn} onClick={() => ask(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            <div style={S.messages}>
              {messages.map((m, i) => (
                <div key={i} style={{ ...S.row, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  {m.role === "assistant" && <div style={S.avatar}>AI</div>}
                  <div style={m.role === "user" ? S.userBubble : S.aiBubble}>{m.text}</div>
                </div>
              ))}
              {loading && (
                <div style={{ ...S.row, justifyContent: "flex-start" }}>
                  <div style={S.avatar}>AI</div>
                  <div style={S.aiBubble}>
                    <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <span className="d1">●</span>
                      <span className="d2">●</span>
                      <span className="d3">●</span>
                      <span style={{ fontSize: 11, color: "#999", marginLeft: 4 }}>思考中...</span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={S.inputWrap}>
              <textarea
                style={S.textarea}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="輸入問題… (Enter 送出)"
                rows={2}
                disabled={loading}
              />
              <button
                style={{ ...S.sendBtn, opacity: (!input.trim() || loading) ? 0.35 : 1 }}
                onClick={() => ask()}
                disabled={!input.trim() || loading}
              >↑</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { background: #f5f4f0; overflow: hidden; font-family: 'Outfit', sans-serif; }
  textarea:focus, input:focus { outline: none; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #d0cec8; border-radius: 2px; }
  @keyframes blink { 0%,100%{opacity:.2} 50%{opacity:1} }
  @keyframes spin { to { transform: rotate(360deg); } }
  .d1{animation:blink 1.2s infinite 0s;font-size:8px;color:#6c63ff}
  .d2{animation:blink 1.2s infinite .2s;font-size:8px;color:#6c63ff}
  .d3{animation:blink 1.2s infinite .4s;font-size:8px;color:#6c63ff}
  .spinner{border:2px solid #e0ddd8;border-top-color:#6c63ff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
  button:hover { filter: brightness(0.96); }
`;

const S = {
  root: { height: "100vh", background: "#f5f4f0", fontFamily: "'Outfit', sans-serif", color: "#1a1a1a" },
  shell: { height: "100vh", display: "flex", flexDirection: "column" },
  centerScreen: {
    height: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 16,
  },
  loadingText: { fontSize: 13, color: "#aaa", fontFamily: "'DM Mono', monospace" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 28px", background: "#ffffff",
    borderBottom: "1px solid #e8e6e0", flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  logo: { display: "flex", alignItems: "center", gap: 8 },
  logoMark: {
    width: 32, height: 32, borderRadius: 9, background: "#6c63ff",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontSize: 15, fontWeight: 600,
  },
  logoText: { fontSize: 16, fontWeight: 600, color: "#1a1a1a", letterSpacing: "-0.01em" },
  statusDot: { width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 2px #dcfce7" },
  fileName: { fontSize: 11, color: "#bbb", fontFamily: "'DM Mono', monospace" },
  dropzone: {
    flex: 1, margin: 24, border: "1.5px dashed rgba(108,99,255,.3)",
    borderRadius: 20, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "80px 40px", cursor: "pointer", transition: "all .2s",
    background: "rgba(108,99,255,.03)",
  },
  dropzoneActive: { borderColor: "#6c63ff", background: "rgba(108,99,255,.08)" },
  dropzoneLoading: { cursor: "default" },
  dropIcon: { fontSize: 36, marginBottom: 16, color: "#6c63ff" },
  dropTitle: { fontSize: 18, fontWeight: 500, color: "#1a1a1a", marginBottom: 8, textAlign: "center" },
  dropSub: { fontSize: 13, color: "#888", textAlign: "center" },
  chatPanel: {
    flex: 1, display: "flex", flexDirection: "column",
    padding: "24px 28px 18px",
    maxWidth: 780, width: "100%", margin: "0 auto",
    minWidth: 0, overflow: "hidden",
  },
  suggestWrap: { marginBottom: 20, flexShrink: 0 },
  suggestLabel: { fontSize: 10, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'DM Mono', monospace" },
  suggestGrid: { display: "flex", flexWrap: "wrap", gap: 7 },
  suggestBtn: {
    background: "#fff", border: "1px solid #e0ddd8", borderRadius: 20,
    padding: "6px 14px", color: "#555", fontSize: 12,
    cursor: "pointer", fontFamily: "'Outfit', sans-serif",
    whiteSpace: "nowrap", boxShadow: "0 1px 2px rgba(0,0,0,.04)",
  },
  messages: { flex: 1, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", paddingRight: 4, marginBottom: 14 },
  row: { display: "flex", alignItems: "flex-start", gap: 10 },
  avatar: {
    width: 30, height: 30, borderRadius: 8, background: "#6c63ff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 9, fontWeight: 700, flexShrink: 0,
    color: "#fff", fontFamily: "'DM Mono', monospace",
  },
  aiBubble: {
    background: "#fff", border: "1px solid #e8e6e0",
    borderRadius: "4px 16px 16px 16px", padding: "12px 16px",
    fontSize: 14, lineHeight: 1.75, color: "#2a2a2a",
    maxWidth: "88%", whiteSpace: "pre-wrap", boxShadow: "0 1px 3px rgba(0,0,0,.04)",
  },
  userBubble: {
    background: "#6c63ff", borderRadius: "16px 4px 16px 16px",
    padding: "12px 16px", fontSize: 14, lineHeight: 1.75, color: "#fff",
    maxWidth: "80%", whiteSpace: "pre-wrap",
  },
  inputWrap: {
    display: "flex", gap: 10, alignItems: "flex-end",
    background: "#fff", border: "1px solid #e0ddd8",
    borderRadius: 16, padding: "10px 12px", flexShrink: 0,
    boxShadow: "0 1px 4px rgba(0,0,0,.05)",
  },
  textarea: {
    flex: 1, background: "transparent", border: "none",
    color: "#1a1a1a", fontSize: 14, fontFamily: "'Outfit', sans-serif",
    resize: "none", lineHeight: 1.6,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 10, background: "#6c63ff", border: "none",
    color: "#fff", fontSize: 18, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "opacity .15s",
  },
};

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFile = async (file) => {
    if (!file || !file.name.endsWith(".pdf")) return;

    // Show PDF in iframe immediately
    setPdfUrl(URL.createObjectURL(file));
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      setUploaded(true);
      setUploadedName(file.name);
      setMessages([{
        role: "assistant",
        text: `✅ ${data.message}\n\n現在可以問我關於這份文件的任何問題！`,
      }]);
    } catch (e) {
      setMessages([{ role: "assistant", text: `⚠️ 上傳失敗：${e.message}` }]);
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const ask = async (question) => {
    const q = question || input.trim();
    if (!q || !uploaded) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const res = await fetch(`${API}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setMessages(prev => [...prev, { role: "assistant", text: data.answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: `⚠️ 錯誤：${e.message}` }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); }
  };

  const handleReset = async () => {
    await fetch(`${API}/reset`, { method: "DELETE" });
    setUploaded(false);
    setUploadedName("");
    setPdfUrl(null);
    setMessages([]);
  };

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body { background: #f5f4f0; overflow: hidden; font-family: 'Outfit', sans-serif; }
        textarea:focus, input:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d0cec8; border-radius: 2px; }
        @keyframes blink { 0%,100%{opacity:.2} 50%{opacity:1} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .d1{animation:blink 1.2s infinite 0s;font-size:8px;color:#6c63ff}
        .d2{animation:blink 1.2s infinite .2s;font-size:8px;color:#6c63ff}
        .d3{animation:blink 1.2s infinite .4s;font-size:8px;color:#6c63ff}
        .spinner{width:16px;height:16px;border:2px solid #e0ddd8;border-top-color:#6c63ff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
        button:hover { filter: brightness(0.96); }
      `}</style>

      <div style={S.shell}>
        {/* Header */}
        <header style={S.header}>
          <div style={S.headerLeft}>
            <div style={S.logo}>
              <div style={S.logoMark}>◈</div>
              <span style={S.logoText}>RAG 文件助理</span>
            </div>
            {uploaded && (
              <>
                <div style={S.statusDot} title="已載入文件" />
                <span style={S.fileName}>{uploadedName}</span>
              </>
            )}
          </div>
          <div style={S.headerRight}>
            {uploaded && (
              <>
                {pdfUrl && (
                  <button style={S.toggleBtn} onClick={() => setShowPdf(v => !v)}>
                    {showPdf ? "隱藏 PDF ←" : "→ 顯示 PDF"}
                  </button>
                )}
                <button style={S.resetBtn} onClick={handleReset}>↺ 換文件</button>
              </>
            )}
          </div>
        </header>

        {/* Main */}
        {!uploaded ? (
          // Upload screen
          <div
            style={{ ...S.dropzone, ...(dragOver ? S.dropzoneActive : {}), ...(uploading ? S.dropzoneLoading : {}) }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            {uploading ? (
              <>
                <div className="spinner" style={{ width: 32, height: 32, marginBottom: 16 }} />
                <p style={S.dropTitle}>正在處理 PDF...</p>
                <p style={S.dropSub}>向量化中，請稍候</p>
              </>
            ) : (
              <>
                <div style={S.dropIcon}>⬆</div>
                <p style={S.dropTitle}>拖曳或點擊上傳 PDF</p>
                <p style={S.dropSub}>支援任何 PDF 文件</p>
              </>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: "none" }}
              onChange={e => handleFile(e.target.files[0])} />
          </div>
        ) : (
          // Split panel
          <div style={S.split}>
            {/* PDF panel */}
            {showPdf && pdfUrl && (
              <div style={S.pdfPanel}>
                <div style={S.pdfHeader}>
                  <span style={S.pdfTitle}>{uploadedName}</span>
                  <button style={S.closeBtn} onClick={() => setShowPdf(false)}>✕</button>
                </div>
                <iframe src={pdfUrl} style={S.iframe} title="PDF 預覽" />
              </div>
            )}
            {showPdf && pdfUrl && <div style={S.divider} />}

            {/* Chat panel */}
            <div style={S.chatPanel}>
              {messages.length <= 1 && (
                <div style={S.suggestWrap}>
                  <p style={S.suggestLabel}>快速提問</p>
                  <div style={S.suggestGrid}>
                    {SUGGESTED_QUESTIONS.map(q => (
                      <button key={q} style={S.suggestBtn} onClick={() => ask(q)}>{q}</button>
                    ))}
                  </div>
                </div>
              )}

              <div style={S.messages}>
                {messages.map((m, i) => (
                  <div key={i} style={{ ...S.row, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    {m.role === "assistant" && <div style={S.avatar}>AI</div>}
                    <div style={m.role === "user" ? S.userBubble : S.aiBubble}>{m.text}</div>
                  </div>
                ))}
                {loading && (
                  <div style={{ ...S.row, justifyContent: "flex-start" }}>
                    <div style={S.avatar}>AI</div>
                    <div style={S.aiBubble}>
                      <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <span className="d1">●</span>
                        <span className="d2">●</span>
                        <span className="d3">●</span>
                        <span style={{ fontSize: 11, color: "#999", marginLeft: 4 }}>Ollama 思考中...</span>
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div style={S.inputWrap}>
                <textarea
                  style={S.textarea}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="輸入問題… (Enter 送出)"
                  rows={2}
                  disabled={loading}
                />
                <button
                  style={{ ...S.sendBtn, opacity: (!input.trim() || loading) ? 0.35 : 1 }}
                  onClick={() => ask()}
                  disabled={!input.trim() || loading}
                >↑</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  root: { height: "100vh", background: "#f5f4f0", fontFamily: "'Outfit', sans-serif", color: "#1a1a1a" },
  shell: { height: "100vh", display: "flex", flexDirection: "column" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 20px", background: "#ffffff",
    borderBottom: "1px solid #e8e6e0", flexShrink: 0,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  logo: { display: "flex", alignItems: "center", gap: 8 },
  logoMark: {
    width: 30, height: 30, borderRadius: 8, background: "#6c63ff",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontSize: 14, fontWeight: 600,
  },
  logoText: { fontSize: 15, fontWeight: 600, color: "#1a1a1a", letterSpacing: "-0.01em" },
  statusDot: { width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 2px #dcfce7" },
  fileName: { fontSize: 11, color: "#999", fontFamily: "'DM Mono', monospace", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  toggleBtn: {
    background: "#f0effe", border: "1px solid #c4bffc", borderRadius: 8,
    padding: "5px 12px", color: "#5b52d9", fontSize: 12, fontWeight: 500,
    cursor: "pointer", fontFamily: "'Outfit', sans-serif",
  },
  resetBtn: {
    background: "#fafafa", border: "1px solid #e0ddd8", borderRadius: 8,
    padding: "5px 12px", color: "#888", fontSize: 12,
    cursor: "pointer", fontFamily: "'Outfit', sans-serif",
  },
  dropzone: {
    flex: 1, margin: 24, border: "1.5px dashed rgba(108,99,255,.3)",
    borderRadius: 20, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "80px 40px", cursor: "pointer", transition: "all .2s",
    background: "rgba(108,99,255,.03)",
  },
  dropzoneActive: { borderColor: "#6c63ff", background: "rgba(108,99,255,.08)" },
  dropzoneLoading: { cursor: "default", borderColor: "#6c63ff" },
  dropIcon: { fontSize: 36, marginBottom: 16, color: "#6c63ff" },
  dropTitle: { fontSize: 18, fontWeight: 500, color: "#1a1a1a", marginBottom: 8, textAlign: "center" },
  dropSub: { fontSize: 13, color: "#888", textAlign: "center" },
  split: { flex: 1, display: "flex", overflow: "hidden" },
  pdfPanel: {
    width: "45%", minWidth: 300, display: "flex", flexDirection: "column",
    background: "#f9f8f5", borderRight: "1px solid #e8e6e0", flexShrink: 0,
  },
  pdfHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 14px", borderBottom: "1px solid #e8e6e0",
    background: "#fff", flexShrink: 0,
  },
  pdfTitle: { fontSize: 11, color: "#999", fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em" },
  closeBtn: { background: "transparent", border: "none", color: "#bbb", cursor: "pointer", fontSize: 13, padding: "2px 6px", borderRadius: 4 },
  iframe: { flex: 1, width: "100%", border: "none" },
  divider: { width: 1, background: "#e8e6e0", flexShrink: 0 },
  chatPanel: {
    flex: 1, display: "flex", flexDirection: "column",
    padding: "18px 18px 14px", background: "#fafaf8", minWidth: 0, overflow: "hidden",
  },
  suggestWrap: { marginBottom: 14, flexShrink: 0 },
  suggestLabel: { fontSize: 10, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'DM Mono', monospace" },
  suggestGrid: { display: "flex", flexWrap: "wrap", gap: 6 },
  suggestBtn: {
    background: "#fff", border: "1px solid #e0ddd8", borderRadius: 20,
    padding: "5px 12px", color: "#555", fontSize: 11,
    cursor: "pointer", fontFamily: "'Outfit', sans-serif",
    whiteSpace: "nowrap", boxShadow: "0 1px 2px rgba(0,0,0,.04)",
  },
  messages: { flex: 1, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", paddingRight: 4, marginBottom: 12 },
  row: { display: "flex", alignItems: "flex-start", gap: 8 },
  avatar: {
    width: 28, height: 28, borderRadius: 8, background: "#6c63ff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 9, fontWeight: 700, flexShrink: 0,
    color: "#fff", fontFamily: "'DM Mono', monospace",
  },
  aiBubble: {
    background: "#fff", border: "1px solid #e8e6e0",
    borderRadius: "4px 14px 14px 14px", padding: "10px 14px",
    fontSize: 13, lineHeight: 1.75, color: "#2a2a2a",
    maxWidth: "88%", whiteSpace: "pre-wrap", boxShadow: "0 1px 3px rgba(0,0,0,.04)",
  },
  userBubble: {
    background: "#6c63ff", borderRadius: "14px 4px 14px 14px",
    padding: "10px 14px", fontSize: 13, lineHeight: 1.75, color: "#fff",
    maxWidth: "80%", whiteSpace: "pre-wrap",
  },
  inputWrap: {
    display: "flex", gap: 8, alignItems: "flex-end",
    background: "#fff", border: "1px solid #e0ddd8",
    borderRadius: 14, padding: "9px 11px", flexShrink: 0,
    boxShadow: "0 1px 4px rgba(0,0,0,.05)",
  },
  textarea: {
    flex: 1, background: "transparent", border: "none",
    color: "#1a1a1a", fontSize: 13, fontFamily: "'Outfit', sans-serif",
    resize: "none", lineHeight: 1.6,
  },
  sendBtn: {
    width: 34, height: 34, borderRadius: 9, background: "#6c63ff", border: "none",
    color: "#fff", fontSize: 17, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, transition: "opacity .15s",
  },
};
