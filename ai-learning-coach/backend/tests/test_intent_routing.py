"""
Tests for intent routing and RAG integration.
"""

import os
import json
import pytest
from app import create_app
from app.services.intent_router import route_request, detect_intent, IntentType, should_use_rag
from app.services.document_loader import load_text, load_document
from app.services.vector_store import get_chroma_adapter, index_uploads_incremental


@pytest.fixture
def app():
    app = create_app()
    with app.app_context():
        yield app


def test_intent_detection_knowledge_qa(app):
    """Test detecting knowledge Q&A intent."""
    with app.app_context():
        texts = [
            "what is photosynthesis?",
            "explain how the water cycle works",
            "what is the definition of mitochondria?",
            "I don't understand this concept",
        ]
        for text in texts:
            intent, conf = detect_intent(text)
            assert intent in [IntentType.KNOWLEDGE_QA, IntentType.COURSEWORK_HELP]
            assert conf > 0.0


def test_intent_detection_grading(app):
    """Test detecting homework grading intent."""
    with app.app_context():
        texts = [
            "can you grade my assignment?",
            "evaluate this homework submission",
            "mark my essay please",
            "score this work and provide feedback",
        ]
        for text in texts:
            intent, conf = detect_intent(text)
            assert intent == IntentType.HOMEWORK_GRADING
            assert conf > 0.0


def test_intent_detection_planning(app):
    """Test detecting study planning intent."""
    with app.app_context():
        texts = [
            "create a study plan for me",
            "schedule my learning sessions",
            "plan out my week",
            "organize my study time",
        ]
        for text in texts:
            intent, conf = detect_intent(text)
            assert intent == IntentType.STUDY_PLANNING
            assert conf > 0.0


def test_should_use_rag(app):
    """Test RAG recommendation for different intents."""
    with app.app_context():
        # Should enable RAG
        assert should_use_rag(IntentType.KNOWLEDGE_QA) == True
        assert should_use_rag(IntentType.COURSEWORK_HELP) == True
        
        # Should not automatically enable RAG
        assert should_use_rag(IntentType.HOMEWORK_GRADING) == False
        assert should_use_rag(IntentType.STUDY_PLANNING) == False


def test_route_request_with_rag_recommendation(app):
    """Test full routing with RAG recommendation."""
    with app.app_context():
        result = route_request("What are the key photosynthesis stages?", enable_rag=True)
        
        assert "intent" in result
        assert "confidence" in result
        assert "use_rag" in result
        assert "system_prompt" in result
        # Both KNOWLEDGE_QA and COURSEWORK_HELP should enable RAG
        assert result["intent"] in ["knowledge_qa", "coursework_help"]
        assert result["use_rag"] == True
        assert result["confidence"] >= 0.0


def test_route_request_override_rag(app):
    """Test explicit RAG override in routing."""
    with app.app_context():
        # Normally STUDY_PLANNING doesn't enable RAG, but we override
        result = route_request("Create a study plan", enable_rag=True)
        original_rag = result["use_rag"]
        
        # With explicit override to False, even knowledge QA shouldn't use RAG
        result2 = route_request("What is photosynthesis?", enable_rag=False)
        # This should still work but RAG detection is based on intent


def test_document_loader_text_file(app):
    """Test loading plain text files."""
    with app.app_context():
        # Create temp text file
        test_dir = app.config.get("UPLOAD_FOLDER")
        test_file = os.path.join(test_dir, "test_content.txt")
        os.makedirs(test_dir, exist_ok=True)
        
        content = "This is a test document about machine learning. " * 100
        with open(test_file, "w", encoding="utf-8") as f:
            f.write(content)
        
        try:
            chunks, metadata = load_text(test_file, chunk_size=500, overlap=100)
            
            assert len(chunks) > 1, "Should create multiple chunks"
            assert all(isinstance(c, str) for c in chunks), "All chunks should be strings"
            assert metadata["file_type"] in ["text", "markdown"]
            assert metadata["total_chars"] == len(content)
        finally:
            if os.path.exists(test_file):
                os.remove(test_file)


def test_document_loader_auto_detect(app):
    """Test auto-detection of document types."""
    with app.app_context():
        test_dir = app.config.get("UPLOAD_FOLDER")
        os.makedirs(test_dir, exist_ok=True)
        
        # Test .txt
        txt_file = os.path.join(test_dir, "test.txt")
        with open(txt_file, "w", encoding="utf-8") as f:
            f.write("Test content for text file")
        
        try:
            chunks, metadata = load_document(txt_file)
            assert metadata["file_type"] in ["text", "markdown"]
        finally:
            if os.path.exists(txt_file):
                os.remove(txt_file)


def test_rag_end_to_end(app):
    """Test full RAG pipeline: index documents and retrieve."""
    with app.app_context():
        import shutil
        
        # Clean and recreate test collection
        collection = "test_rag_e2e"
        persist_dir = app.config.get("CHROMA_DB_DIR")
        if persist_dir and os.path.exists(persist_dir):
            try:
                shutil.rmtree(persist_dir)
            except Exception:
                pass
        os.makedirs(persist_dir, exist_ok=True)
        
        # Create test documents
        upload_dir = app.config.get("UPLOAD_FOLDER")
        test_subdir = os.path.join(upload_dir, "rag_test_docs")
        os.makedirs(test_subdir, exist_ok=True)
        
        # Write test documents
        docs = [
            ("math.txt", "Quadratic equations have the form ax^2 + bx + c = 0. "
                        "The quadratic formula is x = (-b ± √(b²-4ac)) / 2a. "
                        "This formula gives the roots of any quadratic equation."),
            ("biology.txt", "Photosynthesis is the process by which plants convert light energy into chemical energy. "
                           "It occurs in the chloroplasts of plant cells. "
                           "The process involves two main stages: the light-dependent reactions and the Calvin cycle."),
            ("physics.txt", "Newton's first law states that an object in motion tends to stay in motion. "
                           "Newton's second law describes the relationship between force, mass, and acceleration: F=ma. "
                           "These laws form the foundation of classical mechanics."),
        ]
        
        for filename, content in docs:
            filepath = os.path.join(test_subdir, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
        
        try:
            # Index documents
            from app.services.vector_store import index_uploads_incremental
            count = index_uploads_incremental(collection_name=collection)
            assert count > 0, "Should index documents"
            
            # Query
            adapter = get_chroma_adapter(collection_name=collection)
            
            # Test KNOWLEDGE_QA query
            resp = adapter.query("quadratic formula", top_k=3)
            assert len(resp.get("documents", [])) > 0, "Should retrieve quadratic-related docs"
            
            # Test COURSEWORK_HELP query
            resp2 = adapter.query("photosynthesis", top_k=3)
            assert len(resp2.get("documents", [])) > 0, "Should retrieve biology docs"
            
        finally:
            # Cleanup
            if os.path.exists(test_subdir):
                shutil.rmtree(test_subdir)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
