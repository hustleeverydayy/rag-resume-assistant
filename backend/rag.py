import fitz  # pymupdf
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaEmbeddings, OllamaLLM
from langchain_core.prompts import PromptTemplate

SYSTEM_PROMPT = """你是一個專業的 AI 助理，根據提供的文件內容回答問題。

規則：
- 只根據提供的文件內容回答
- 用繁體中文回答，語氣專業自然
- 回答要具體，引用文件中的實際資料
- 如果文件中找不到答案，請誠實說明
- 保持簡潔，不超過 300 字

文件內容：
{context}

問題：{question}

回答："""

PROMPT = PromptTemplate(
    input_variables=["context", "question"],
    template=SYSTEM_PROMPT,
)

class RAGAgent:
    def __init__(self):
        self.vectorstore = None
        self.llm = OllamaLLM(model="llama3.2", temperature=0.4)
        self.embeddings = OllamaEmbeddings(model="nomic-embed-text")
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=200,
            chunk_overlap=40,
        )

    def load_pdf(self, path: str) -> int:
        # 1. 抽取 PDF 文字
        doc = fitz.open(path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()

        # 2. 切成段落
        chunks = self.splitter.create_documents([text])

        # 3. 向量化存進 ChromaDB
        if self.vectorstore is None:
            self.vectorstore = Chroma.from_documents(
                chunks,
                self.embeddings,
                persist_directory="./chroma_db",
            )
        else:
            self.vectorstore.add_documents(chunks)

        return len(chunks)

    def ask(self, question: str) -> str:
        if not self.vectorstore:
            return "請先上傳文件"

        # 1. 找最相關的段落（Top 4）
        relevant_docs = self.vectorstore.similarity_search(question, k=6)
        context = "\n\n".join([doc.page_content for doc in relevant_docs])

        # 2. 組合 prompt 給 LLM
        prompt = PROMPT.format(context=context, question=question)
        answer = self.llm.invoke(prompt)

        return answer

    def is_ready(self) -> bool:
        return self.vectorstore is not None

    def reset(self):
        self.vectorstore = None
        import shutil
        if os.path.exists("./chroma_db"):
            shutil.rmtree("./chroma_db")

import os
