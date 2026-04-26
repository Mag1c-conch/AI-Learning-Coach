import os
import json

import pytest

chromadb = pytest.importorskip("chromadb")
sentencetransformers = pytest.importorskip("sentence_transformers")

from app.services.vector_store import index_uploads_incremental, get_chroma_adapter


def write_sample_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(content)


def test_index_and_query(app, tmp_path):
    uploads = os.path.join(app.config["UPLOAD_FOLDER"])
    # create a sample file
    sample_dir = os.path.join(uploads, "test_files")
    os.makedirs(sample_dir, exist_ok=True)
    file_path = os.path.join(sample_dir, "sample.txt")
    write_sample_file(file_path, "This is a test document about linear algebra and matrices.")

    # run incremental index inside app context
    from app import create_app
    collection_name = "test_vector_store"
    with app.app_context():
        # ensure a clean chroma persistence directory for the test collection
        import shutil
        persist_dir = app.config.get("CHROMA_DB_DIR")
        if persist_dir and os.path.exists(persist_dir):
            try:
                shutil.rmtree(persist_dir)
            except Exception:
                pass
        os.makedirs(persist_dir, exist_ok=True)
        n = index_uploads_incremental(collection_name=collection_name)
    assert isinstance(n, int)
    assert n > 0

    # query and expect to find something (use app context)
    with app.app_context():
        adapter = get_chroma_adapter(collection_name=collection_name)
        resp = adapter.query("linear algebra matrices", top_k=3)
        docs = resp.get("documents") or []
        assert any("linear algebra" in d.lower() or "matrices" in d.lower() for d in docs)
