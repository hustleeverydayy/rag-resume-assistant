from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
import os
from rag import RAGAgent

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

rag = RAGAgent()

def autoload_pdfs():
    """啟動時自動載入 uploads/ 裡所有 PDF"""
    pdfs = [f for f in os.listdir(UPLOAD_DIR) if f.endswith(".pdf")]
    if not pdfs:
        print("📂 uploads/ 裡沒有 PDF，等待上傳")
        return
    for filename in pdfs:
        path = os.path.join(UPLOAD_DIR, filename)
        count = rag.load_pdf(path)
        print(f"✅ 自動載入：{filename}（{count} 個段落）")

@asynccontextmanager
async def lifespan(app):
    autoload_pdfs()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionRequest(BaseModel):
    question: str

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/pdf/{filename}")
async def get_pdf(filename: str):
    from fastapi.responses import FileResponse
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="找不到檔案")
    return FileResponse(
        path,
        media_type="application/pdf",
        headers={"Content-Disposition": "inline"}
    )

@app.get("/status")
def status():
    """前端用來確認是否已載入文件"""
    pdfs = [f for f in os.listdir(UPLOAD_DIR) if f.endswith(".pdf")]
    return {
        "ready": rag.is_ready(),
        "files": pdfs,
    }

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="只支援 PDF 檔案")
    path = os.path.join(UPLOAD_DIR, file.filename)
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    doc_count = rag.load_pdf(path)
    return {"message": f"成功載入 {file.filename}，共 {doc_count} 個段落"}

@app.post("/ask")
async def ask(req: QuestionRequest):
    if not rag.is_ready():
        raise HTTPException(status_code=400, detail="請先上傳 PDF")
    answer = rag.ask(req.question)
    return {"answer": answer}

@app.delete("/reset")
def reset():
    rag.reset()
    return {"message": "已清除所有文件"}
