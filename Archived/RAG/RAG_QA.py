from langchain_community.embeddings import HuggingFaceEmbeddings
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.vector_stores.chroma import ChromaVectorStore
import chromadb
from llama_index.embeddings.langchain import LangchainEmbedding
from langchain_openai import ChatOpenAI
try:
    from langchain.callbacks.base import BaseCallbackHandler
except Exception:
    from langchain_core.callbacks import BaseCallbackHandler
try:
    from langchain.schema import SystemMessage, HumanMessage
except Exception:
    from langchain_core.messages import SystemMessage, HumanMessage
import torch

class StreamHandler(BaseCallbackHandler):
    def on_llm_new_token(self, token: str, **kwargs) -> None:
        print(token, end="", flush=True)
        
class LLM_CHAT:
    def __init__(self):
        # Kiểm tra và điều chỉnh đường dẫn DB_ALL:
        # Trong cấu trúc thư mục của bạn, DB_ALL nằm ở thư mục gốc (ngang hàng với RAG)
        # Hoặc nằm trong RAG (RAG/DB_ALL)
        # Dựa trên cấu trúc thư mục, đường dẫn này là chính xác nếu bạn đang dùng DB_ALL ở thư mục gốc
        self.embed_model = LangchainEmbedding(
            HuggingFaceEmbeddings(model_name="bkai-foundation-models/vietnamese-bi-encoder",model_kwargs={'device': 'cuda' if torch.cuda.is_available() else 'cpu'})
        )
        db_path = os.environ.get("DB_ALL_PATH", "./DB_ALL")
        self.chroma_client = chromadb.PersistentClient(path=db_path)
        self.chroma_collection = self.chroma_client.get_or_create_collection("KienThucYKhoa")
        self.vector_store = ChromaVectorStore(chroma_collection=self.chroma_collection)
        self.storage_context = StorageContext.from_defaults(vector_store=self.vector_store)
        self.index = VectorStoreIndex.from_vector_store(
            vector_store=self.vector_store,
            embed_model=self.embed_model,
            storage_context=self.storage_context,            
        )
        self.retriever = self.index.as_retriever(similarity_top_k=5)
        self.llm =  ChatOpenAI(
            api_key="any-string", 
            base_url="http://127.0.0.1:8080",
            # streaming=True,        #nếu streaming bật thì gỡ 2 dòng này
            # callbacks=[StreamHandler()],# streaming
            )
            
    # Phương thức cũ (không dùng system prompt, chỉ dùng question) - Giữ lại để tham khảo
    def answer(self, question):
        nodes = self.retriever.retrieve(question)
        # Lấy context từ các node
        context_rag = "\n".join([f"đây là context thứ {i+1}:\n{node.node.get_content()}" for i, node in enumerate(nodes)])
        
        # Xây dựng prompt cho LLM
        prompt_for_llm = f"Đây là câu hỏi của người dùng:\n{question}\n\nThông tin trích xuất:\n{context_rag}\n\nDựa trên thông tin trích xuất, hãy trả lời câu hỏi của người dùng."
        
        response = self.llm.invoke(prompt_for_llm)
        return response.content

    # Phương thức mới: hỗ trợ System Prompt
    def answer_with_system_prompt(self, system_prompt: str, user_query: str):
        # 1. Truy xuất RAG chỉ dựa trên câu hỏi thô của người dùng
        nodes = self.retriever.retrieve(user_query)
        
        # 2. Xây dựng ngữ cảnh RAG
        context_rag = "\n".join([f"đây là context thứ {i+1}:\n{node.node.get_content()}" for i, node in enumerate(nodes)])
        
        # 3. Tạo thông điệp người dùng cuối cùng (bao gồm context RAG)
        final_user_message = (
            f"Truy vấn của người dùng: {user_query}\n\n"
            f"NGỮ CẢNH TRUY XUẤT (Context RAG):\n{context_rag}\n\n"
            f"Dựa trên các hướng dẫn bạn nhận được (System Prompt) và Context RAG ở trên, hãy trả lời truy vấn của người dùng."
        )

        # 4. Gửi tin nhắn dưới định dạng Chat Completion
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=final_user_message)
        ]
        
        response = self.llm.invoke(messages)
        return response.content
        
if __name__ == "__main__":
    llm_chat=LLM_CHAT()
    while True:
        question=input("Nhập câu hỏi của bạn (gõ 'exit' để thoát): ")
        if question.lower() == 'exit':
            break
        print("Câu trả lời:")
        # Test với system prompt đơn giản
        system_test = "Bạn là trợ lý AI y tế. Luôn trả lời ngắn gọn trong 50 từ."
        answer=llm_chat.answer_with_system_prompt(system_test, question)
        print(answer)
