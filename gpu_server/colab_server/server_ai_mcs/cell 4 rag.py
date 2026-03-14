import chromadb
import os
import torch
from langchain_community.embeddings import HuggingFaceEmbeddings
from llama_index.embeddings.langchain import LangchainEmbedding
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core import StorageContext, VectorStoreIndex
try:
    from sentence_transformers import CrossEncoder
except Exception:
    CrossEncoder = None
DB_ALL_PATH = os.environ.get("DB_ALL_PATH", "/content/drive/MyDrive/DoctorAI/data/DB_ALL")
device_name = "cuda" if torch.cuda.is_available() else "cpu"
embed_model = LangchainEmbedding(HuggingFaceEmbeddings(model_name="bkai-foundation-models/vietnamese-bi-encoder", model_kwargs={'device': device_name}))
chroma_client = chromadb.PersistentClient(path=DB_ALL_PATH)
chroma_collection = chroma_client.get_or_create_collection("KienThucYKhoa")
vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
storage_context = StorageContext.from_defaults(vector_store=vector_store)
index = VectorStoreIndex.from_vector_store(vector_store=vector_store, embed_model=embed_model, storage_context=storage_context)
retriever = index.as_retriever(similarity_top_k=10)
reranker = None
if CrossEncoder is not None:
    try:
        reranker = CrossEncoder("Alibaba-NLP/gte-multilingual-reranker-base", trust_remote_code=True)
    except Exception:
        reranker = None
