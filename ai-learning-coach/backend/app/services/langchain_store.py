from typing import List, Optional, Any
from flask import current_app

try:
    from langchain.embeddings import SentenceTransformerEmbeddings
    from langchain.vectorstores import Chroma
except Exception:  # pragma: no cover - optional import
    SentenceTransformerEmbeddings = None
    Chroma = None


def get_langchain_chroma(collection_name: str = "default") -> Any:
    if Chroma is None or SentenceTransformerEmbeddings is None:
        raise RuntimeError("langchain or sentence-transformers not installed")
    persist_dir = current_app.config.get("CHROMA_DB_DIR")
    model_name = current_app.config.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    embedder = SentenceTransformerEmbeddings(model_name=model_name)
    vs = Chroma(persist_directory=persist_dir, collection_name=collection_name, embedding_function=embedder)
    return vs


def add_texts_to_collection(texts: List[str], metadatas: Optional[List[dict]] = None,
                            ids: Optional[List[str]] = None, collection_name: str = "default") -> None:
    vs = get_langchain_chroma(collection_name)
    vs.add_texts(texts=texts, metadatas=metadatas, ids=ids)
    try:
        vs.persist()
    except Exception:
        current_app.logger.debug("LangChain Chroma persist not available")


def similarity_search(query: str, k: int = 5, collection_name: str = "default") -> List[Any]:
    vs = get_langchain_chroma(collection_name)
    return vs.similarity_search(query, k=k)
