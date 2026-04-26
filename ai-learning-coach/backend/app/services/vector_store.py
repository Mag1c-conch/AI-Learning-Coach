import os
from typing import List, Optional, Any, Dict

from flask import current_app
import json
import numpy as np

try:
    import chromadb
    from chromadb.config import Settings
except Exception:  # pragma: no cover - chromadb optional at import time
    chromadb = None

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover - optional at import time
    SentenceTransformer = None
    
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
except Exception:
    TfidfVectorizer = None


class ChromaAdapter:
    """Simple Chroma adapter using sentence-transformers for embeddings.

    Methods:
    - add_texts(texts, metadatas=None, ids=None)
    - query(query_text, top_k=5)
    - persist()
    """

    def __init__(self, collection_name: str = "default"):
        self.collection_name = collection_name
        persist_dir = current_app.config.get("CHROMA_DB_DIR")

        # Try to initialize embedding backend first
        self._embed_model_name = current_app.config.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        self._use_tfidf = False
        self._corpus = []
        # if running in offline mode, avoid attempting to download HF models
        offline_mode = os.environ.get("TRANSFORMERS_OFFLINE") in ("1", "true") or os.environ.get("HF_OFFLINE") in ("1", "true")
        if SentenceTransformer is not None:
            try:
                if offline_mode:
                    raise RuntimeError("offline mode - skip HF model load")
                self._embedder = SentenceTransformer(self._embed_model_name)
            except Exception:
                current_app.logger.warning("SentenceTransformer model load failed; falling back to TF-IDF embedder")
                self._embedder = None
        else:
            self._embedder = None

        if self._embedder is None:
            if TfidfVectorizer is None:
                raise RuntimeError("No suitable embedding backend available: install sentence-transformers or scikit-learn")
            self._use_tfidf = True
            # in TF-IDF fallback mode, maintain an in-memory store and a simple persistent JSON file
            self._vectorizer = None
            self._store_path = os.path.join(persist_dir or ".", f"{self.collection_name}_tfidf_store.json")
            # load existing store if present
            if os.path.exists(self._store_path):
                try:
                    with open(self._store_path, "r", encoding="utf-8") as fh:
                        self._store = json.load(fh)
                except Exception:
                    self._store = {"ids": [], "documents": [], "metadatas": [], "embeddings": []}
            else:
                self._store = {"ids": [], "documents": [], "metadatas": [], "embeddings": []}
            # reconstruct vectorizer by fitting on stored documents (fixed max_features)
            if TfidfVectorizer is not None and self._store.get("documents"):
                try:
                    vec = TfidfVectorizer(max_features=256)
                    vec.fit(self._store.get("documents", []))
                    self._vectorizer = vec
                    # recompute embeddings to ensure consistency
                    mats = vec.transform(self._store.get("documents", [])).toarray().astype(float)
                    self._store["embeddings"] = mats.tolist()
                except Exception:
                    self._vectorizer = None
            else:
                self._vectorizer = None
            self.client = None
            self.collection = None
            return

        # chromadb client path
        try:
            settings = Settings(chroma_db_impl="duckdb+parquet", persist_directory=persist_dir)
            self.client = chromadb.Client(settings=settings)
        except Exception:
            current_app.logger.warning("Chroma Settings deprecated or unavailable; falling back to default Client")
            self.client = chromadb.Client()

        # get or create collection
        try:
            collections = [c.name for c in self.client.list_collections()]
        except Exception:
            collections = []

        if self.collection_name in collections:
            self.collection = self.client.get_collection(self.collection_name)
        else:
            self.collection = self.client.create_collection(self.collection_name)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        if self._use_tfidf:
            # if a vectorizer with fixed vocabulary exists, use it to transform texts
            if self._vectorizer is not None:
                mat = self._vectorizer.transform(texts)
                arr = mat.toarray()
                return [e.tolist() for e in arr]
            # otherwise, fit a temporary vectorizer on the provided texts
            self._vectorizer = TfidfVectorizer(max_features=256)
            mat = self._vectorizer.fit_transform(texts)
            arr = mat.toarray()
            # persist vocabulary into store if using local store
            try:
                if hasattr(self, "_store"):
                    self._store["vocabulary"] = self._vectorizer.vocabulary_
            except Exception:
                pass
            return [e.tolist() for e in arr]
        else:
            embs = self._embedder.encode(texts, show_progress_bar=False)
            return [e.tolist() if hasattr(e, "tolist") else list(e) for e in embs]

    def add_texts(self, texts: List[str], metadatas: Optional[List[Dict[str, Any]]] = None,
                  ids: Optional[List[str]] = None) -> Dict[str, Any]:
        if not texts:
            return {}
        if self._use_tfidf:
            # build or update vectorizer and recompute embeddings for consistency
            corpus_existing = list(self._store.get("documents", []))
            corpus = corpus_existing + list(texts)
            # fit a new vectorizer on the combined corpus to obtain a stable vocabulary and fixed dim
            try:
                vec = TfidfVectorizer(max_features=256)
                mat = vec.fit_transform(corpus).toarray().astype(float)
                # update store with new corpus and embeddings
                self._store["documents"] = corpus
                # ensure ids and metadatas aligned
                existing_ids = list(self._store.get("ids", []))
                existing_metas = list(self._store.get("metadatas", []))
                # pad existing ids/metas if needed
                while len(existing_ids) < len(corpus_existing):
                    existing_ids.append(str(len(existing_ids)))
                while len(existing_metas) < len(corpus_existing):
                    existing_metas.append({})
                new_ids = [ids[i] if ids and i < len(ids) else str(len(existing_ids) + i) for i in range(len(texts))]
                new_metas = [metadatas[i] if metadatas and i < len(metadatas) else {} for i in range(len(texts))]
                self._store["ids"] = existing_ids + new_ids
                self._store["metadatas"] = existing_metas + new_metas
                self._store["embeddings"] = mat.tolist()
                # update in-memory vectorizer
                self._vectorizer = vec
            except Exception:
                # fallback: compute embeddings individually
                embeddings = self.embed_texts(texts)
                for i, txt in enumerate(texts):
                    self._store["ids"].append(ids[i] if ids and i < len(ids) else str(len(self._store["ids"])))
                    self._store["documents"].append(txt)
                    self._store["metadatas"].append(metadatas[i] if metadatas and i < len(metadatas) else {})
                    self._store["embeddings"].append(embeddings[i])

            try:
                with open(self._store_path, "w", encoding="utf-8") as fh:
                    json.dump(self._store, fh)
            except Exception:
                current_app.logger.debug("Failed to persist TF-IDF store %s", self._store_path)
            return {"added": len(texts)}

        embeddings = self.embed_texts(texts)
        # chroma collection.add accepts documents, metadatas, ids, embeddings
        result = self.collection.add(documents=texts, metadatas=metadatas or [{} for _ in texts],
                                     ids=ids, embeddings=embeddings)
        return result

    def query(self, query_text: str, top_k: int = 5) -> Dict[str, Any]:
        if not query_text:
            return {"ids": [], "documents": [], "metadatas": [], "distances": []}
        q_emb = self.embed_texts([query_text])[0]
        if self._use_tfidf:
            # compute cosine similarity against local store
            store = self._store
            if not store["embeddings"]:
                return {"ids": [], "documents": [], "metadatas": [], "distances": []}
            q = np.array(q_emb, dtype=float)
            mats = np.array(store["embeddings"], dtype=float)
            # ensure shapes
            if mats.ndim == 1:
                mats = mats.reshape(1, -1)
            # cosine similarity
            norms = np.linalg.norm(mats, axis=1) * (np.linalg.norm(q) + 1e-12)
            sims = (mats @ q) / norms
            # higher is more similar; get top_k
            idxs = sims.argsort()[::-1][:top_k]
            ids = [store["ids"][i] for i in idxs]
            docs = [store["documents"][i] for i in idxs]
            metas = [store["metadatas"][i] for i in idxs]
            dists = [float(1.0 - float(sims[i])) for i in idxs]
            current_app.logger.debug("TFIDF local store size=%d, returning ids=%s", len(store["ids"]), ids)
            return {"ids": ids, "documents": docs, "metadatas": metas, "distances": dists}

        # new chroma versions expect include fields from a set; 'ids' is not valid in some versions
        include_fields = ["documents", "metadatas", "distances", "uris"]
        resp = self.collection.query(query_embeddings=[q_emb], n_results=top_k, include=include_fields)
        # response fields are lists per query; we only queried one
        docs = resp.get("documents", [[]])[0]
        metas = resp.get("metadatas", [[]])[0]
        dists = resp.get("distances", [[]])[0]
        # try several possible id-like fields
        ids = resp.get("ids") or resp.get("uris") or resp.get("data") or [[]]
        ids = ids[0] if isinstance(ids, list) and ids else []
        return {
            "ids": ids,
            "documents": docs,
            "metadatas": metas,
            "distances": dists,
        }

    def persist(self):
        try:
            self.client.persist()
        except Exception:
            # older versions may persist on create_collection; ignore
            current_app.logger.debug("Chroma persist not available or failed; ignoring")

    def delete_collection(self):
        try:
            self.client.delete_collection(self.collection_name)
        except Exception:
            current_app.logger.debug("Failed to delete chroma collection %s", self.collection_name)

    def delete_by_ids(self, ids: List[str]):
        try:
            # chromadb Collection.delete supports ids kwarg
            self.collection.delete(ids=ids)
        except Exception:
            current_app.logger.debug("Failed to delete ids from collection %s", self.collection_name)

def get_chroma_adapter(collection_name: str = "default") -> ChromaAdapter:
    return ChromaAdapter(collection_name=collection_name)


def _chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200):
    if not text:
        return []
    chunks = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size, length)
        chunks.append(text[start:end])
        start = end - overlap if end < length else end
    return chunks


def index_uploads(collection_name: str = "default", root_dir: Optional[str] = None,
                  chunk_size: int = 1000, overlap: int = 200) -> int:
    """Index text files under instance uploads into the chroma collection.

    Only reads plain text and markdown files (.txt, .md). Returns number of chunks indexed.
    """
    root = root_dir or current_app.config.get("UPLOAD_FOLDER")
    if not root:
        raise RuntimeError("UPLOAD_FOLDER not configured")
    adapter = get_chroma_adapter(collection_name=collection_name)
    to_add_texts = []
    to_add_metadatas = []
    to_add_ids = []
    count = 0
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            if not fn.lower().endswith((".txt", ".md")):
                continue
            full = os.path.join(dirpath, fn)
            try:
                with open(full, "r", encoding="utf-8") as fh:
                    text = fh.read()
            except Exception:
                current_app.logger.debug("Could not read file for indexing: %s", full)
                continue
            chunks = _chunk_text(text, chunk_size=chunk_size, overlap=overlap)
            for i, ch in enumerate(chunks):
                to_add_texts.append(ch)
                to_add_metadatas.append({"source": os.path.relpath(full, root), "chunk_index": i})
                to_add_ids.append(f"{os.path.relpath(full, root)}::{i}")
            count += len(chunks)
            # flush in batches to avoid OOM for large datasets
            if len(to_add_texts) >= 256:
                adapter.add_texts(to_add_texts, metadatas=to_add_metadatas, ids=to_add_ids)
                to_add_texts = []
                to_add_metadatas = []
                to_add_ids = []
    if to_add_texts:
        adapter.add_texts(to_add_texts, metadatas=to_add_metadatas, ids=to_add_ids)
    try:
        adapter.persist()
    except Exception:
        current_app.logger.debug("Chroma persist failed or not available")
    current_app.logger.info("Indexed %d text chunks into collection %s", count, collection_name)
    return count


def _meta_path_for_collection(collection_name: str = "default") -> str:
    persist_dir = current_app.config.get("CHROMA_DB_DIR")
    if not persist_dir:
        persist_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "instance", "chroma_db")
    return os.path.join(persist_dir, f"index_meta_{collection_name}.json")


def index_uploads_incremental(collection_name: str = "default", root_dir: Optional[str] = None,
                              chunk_size: int = 1000, overlap: int = 200) -> int:
    """Index text files under uploads incrementally using a small metadata file to track mtimes.

    Returns number of chunks newly indexed.
    """
    root = root_dir or current_app.config.get("UPLOAD_FOLDER")
    if not root:
        raise RuntimeError("UPLOAD_FOLDER not configured")
    adapter = get_chroma_adapter(collection_name=collection_name)
    meta_path = _meta_path_for_collection(collection_name)
    try:
        if os.path.exists(meta_path):
            import json
            with open(meta_path, "r", encoding="utf-8") as mf:
                meta = json.load(mf)
        else:
            meta = {}
    except Exception:
        meta = {}

    to_add_texts = []
    to_add_metadatas = []
    to_add_ids = []
    newly_indexed = 0

    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            if not fn.lower().endswith((".txt", ".md")):
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root)
            try:
                mtime = os.path.getmtime(full)
            except Exception:
                current_app.logger.debug("Could not stat file for indexing: %s", full)
                continue

            entry = meta.get(rel)
            if entry and entry.get("mtime") == mtime:
                # unchanged
                continue

            # if changed and we have prior ids, delete them
            prior_ids = entry.get("ids") if entry else None
            if prior_ids:
                try:
                    adapter.delete_by_ids(prior_ids)
                except Exception:
                    current_app.logger.debug("Failed to delete prior ids for %s", rel)

            try:
                with open(full, "r", encoding="utf-8") as fh:
                    text = fh.read()
            except Exception:
                current_app.logger.debug("Could not read file for indexing: %s", full)
                continue

            chunks = _chunk_text(text, chunk_size=chunk_size, overlap=overlap)
            ids_for_file = []
            for i, ch in enumerate(chunks):
                cid = f"{rel}::{i}"
                to_add_texts.append(ch)
                to_add_metadatas.append({"source": rel, "chunk_index": i})
                to_add_ids.append(cid)
                ids_for_file.append(cid)
            newly_indexed += len(chunks)

            # update meta for this file
            meta[rel] = {"mtime": mtime, "ids": ids_for_file}

            # flush in batches
            if len(to_add_texts) >= 256:
                adapter.add_texts(to_add_texts, metadatas=to_add_metadatas, ids=to_add_ids)
                to_add_texts = []
                to_add_metadatas = []
                to_add_ids = []

    if to_add_texts:
        adapter.add_texts(to_add_texts, metadatas=to_add_metadatas, ids=to_add_ids)

    try:
        adapter.persist()
    except Exception:
        current_app.logger.debug("Chroma persist failed or not available")

    # save meta
    try:
        import json
        os.makedirs(os.path.dirname(meta_path), exist_ok=True)
        with open(meta_path, "w", encoding="utf-8") as mf:
            json.dump(meta, mf)
    except Exception:
        current_app.logger.debug("Failed to write index metadata %s", meta_path)

    current_app.logger.info("Incrementally indexed %d new chunks into collection %s", newly_indexed, collection_name)
    return newly_indexed
