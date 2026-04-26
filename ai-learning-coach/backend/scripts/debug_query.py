from app import create_app
from app.services.vector_store import get_chroma_adapter, index_uploads_incremental

app = create_app()
with app.app_context():
    collection = "test_vector_store"
    print('Indexing...')
    n = index_uploads_incremental(collection_name=collection)
    print('Indexed', n)
    adapter = get_chroma_adapter(collection_name=collection)
    resp = adapter.query('linear algebra matrices', top_k=3)
    print('Query resp:')
    for k, v in resp.items():
        print(k, v)
    # if using tfidf local store, dump it
    try:
            if getattr(adapter, '_use_tfidf', False):
                print('Adapter _use_tfidf True; in-memory store:')
                try:
                    print('store len docs=', len(adapter._store.get('documents', [])))
                    print('store documents=', adapter._store.get('documents'))
                except Exception as ie:
                    print('error printing in-memory store', ie)
    except Exception as e:
        print('No local store or error:', e)
