
from langchain_community.embeddings import HuggingFaceEmbeddings
from llama_index.core import (
    VectorStoreIndex,
    StorageContext,
)
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb
from llama_index.embeddings.langchain import LangchainEmbedding
from langchain_openai import ChatOpenAI
from langchain.callbacks.base import BaseCallbackHandler
import torch
from sentence_transformers import CrossEncoder
class StreamHandler(BaseCallbackHandler):
    def on_llm_new_token(self, token: str, **kwargs) -> None:
        print(token, end="", flush=True)
        
class LLM_CHAT:
    def __init__(self):
        self.embed_model = LangchainEmbedding(
            HuggingFaceEmbeddings(model_name="bkai-foundation-models/vietnamese-bi-encoder",model_kwargs={'device': 'cuda' if torch.cuda.is_available() else 'cpu'})
        )
        self.chroma_client = chromadb.PersistentClient(path="./DB_ALL")
        self.chroma_collection = self.chroma_client.get_or_create_collection("KienThucYKhoa")
        self.vector_store = ChromaVectorStore(chroma_collection=self.chroma_collection)
        self.storage_context = StorageContext.from_defaults(vector_store=self.vector_store)
        self.index = VectorStoreIndex.from_vector_store(
            vector_store=self.vector_store,
            embed_model=self.embed_model,
            storage_context=self.storage_context,            
        )
        self.retriever = self.index.as_retriever(similarity_top_k=10)
        self.llm =  ChatOpenAI(
            api_key="any-string", 
            base_url="http://127.0.0.1:8080",
            # streaming=True,        #nếu streaming bật thì gỡ 2 dòng này
            # callbacks=[StreamHandler()],# streaming
            )
        self.reranker = CrossEncoder("Alibaba-NLP/gte-multilingual-reranker-base", trust_remote_code=True)
    def answer(self, question):
        # truy vấn 
        phanbietcauhoi=" trả lời ngắn gọn là có hay không và không giải thích gì thêm: câu hỏi sau đây có liên quan y tế không:"   +question
        phanbiet=self.llm.invoke(phanbietcauhoi)
        if "không" in phanbiet.content.lower():
            return "Câu hỏi của bạn không liên quan đến y tế. Vui lòng đặt câu hỏi khác."
        
         # truy xuất thông tin
        nodes = self.retriever.retrieve(question)
        context = [node.node.get_content() for node in nodes]
        # sắp xếp bằng rerank
        query_passage_pairs = [[question, passage] for passage in context]
        scores = self.reranker.predict(query_passage_pairs)
        ranked_data = sorted(zip(scores, context), key=lambda x: x[0], reverse=True)
        ranked_passages = [p for _, p in ranked_data]

        # chọn k top 
        top_k = min(3, len(ranked_passages))
        selected_passages = ranked_passages[:top_k]

        # tạo context cho LLM
        context = f"Đây là câu hỏi của người dùng:\n{question}\n\n"
        context += "Dưới đây là các đoạn thông tin liên quan:\n"
        
        for i, passage in enumerate(selected_passages):
            context += f"\n[Đoạn {i+1}]:\n{passage}\n"

        # gọi LLM để tạo câu trả lời
        response = self.llm.invoke(context)
        return response.content
    
    
if __name__ == "__main__":
    llm_chat=LLM_CHAT()
    while True:
        question=input("Nhập câu hỏi của bạn (gõ 'exit' để thoát): ")
        if question.lower() == 'exit':
            break
        print("Câu trả lời:")
        answer=llm_chat.answer(question)
        print(answer)