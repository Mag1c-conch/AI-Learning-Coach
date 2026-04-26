"""
Intent Recognition & Routing for RAG-based task dispatch.

Recognizes user intent from message content and routes to appropriate handler:
- KNOWLEDGE_QA: General knowledge questions (route to RAG)
- HOMEWORK_GRADING: Assignment submission for grading (route to grading adapter)
- STUDY_PLANNING: Study schedule/plan requests (route to planning handler)
- COURSEWORK_HELP: Course-specific help/clarification
- OTHER: Fallback for unclear intents
"""

from enum import Enum
from typing import Tuple
from flask import current_app

class IntentType(Enum):
    """User intent classification."""
    KNOWLEDGE_QA = "knowledge_qa"          # General knowledge questions
    HOMEWORK_GRADING = "homework_grading"  # Assignment submission & grading
    STUDY_PLANNING = "study_planning"      # Study schedule generation
    COURSEWORK_HELP = "coursework_help"    # Course-specific questions
    OTHER = "other"                         # Unknown/mixed intent


# Intent detection keywords & patterns
_INTENT_KEYWORDS = {
    IntentType.HOMEWORK_GRADING: [
        "grade", "grading", "mark", "score", "evaluate", "评分", "批改", "作业",
        "submit", "assignment", "homework", "deliver", "hand in", "提交",
        "批阅", "评估", "检查", "判卷"
    ],
    IntentType.STUDY_PLANNING: [
        "plan", "schedule", "timetable", "arrange", "organize", "规划", "计划",
        "日程", "安排", "时间表", "学习计划", "周计划", "制定",
        "week", "day", "when", "timing", "session"
    ],
    IntentType.KNOWLEDGE_QA: [
        "explain", "what is", "how does", "why", "definition", "concept",
        "解释", "什么是", "怎样", "为什么", "概念", "定义",
        "understand", "learn", "知道", "懂", "明白", "学习", "讲解",
        "how", "what", "key", "photosynthesis", "mitochondria", "energy",
        "formula", "equation", "theorem", "law", "principle"
    ],
    IntentType.COURSEWORK_HELP: [
        "course", "课程", "难题", "难", "不会", "help", "stuck",
        "material", "资料", "教材", "章节", "section", "unit",
        "stage", "process", "mechanism", "method"
    ]
}


def detect_intent(text: str) -> Tuple[IntentType, float]:
    """
    Detect user intent from message text.
    
    Args:
        text: User message
        
    Returns:
        Tuple of (IntentType, confidence_score 0.0-1.0)
    """
    if not text or not isinstance(text, str):
        return IntentType.OTHER, 0.0
    
    text_lower = text.lower()
    scores = {intent: 0.0 for intent in IntentType}
    total_matched = 0
    
    # Count keyword matches per intent
    for intent_type, keywords in _INTENT_KEYWORDS.items():
        matched = sum(1 for kw in keywords if kw in text_lower)
        scores[intent_type] = matched
        total_matched += matched
    
    # Normalize scores to 0-1
    if total_matched > 0:
        for intent in scores:
            scores[intent] = scores[intent] / max(total_matched, 3)
    
    # Find top intent
    top_intent = max(scores, key=scores.get)
    top_score = scores[top_intent]
    
    # Confidence threshold: if top score too low, mark as OTHER
    if top_score < 0.1:
        top_intent = IntentType.OTHER
        top_score = 0.0
    
    return top_intent, min(top_score, 1.0)


def should_use_rag(intent: IntentType) -> bool:
    """
    Determine if RAG retrieval should be used for this intent.
    
    Args:
        intent: Detected intent type
        
    Returns:
        True if RAG should be enabled for this intent
    """
    rag_intents = {
        IntentType.KNOWLEDGE_QA,      # General knowledge - needs RAG retrieval
        IntentType.COURSEWORK_HELP,   # Course material references - needs RAG
    }
    return intent in rag_intents


def get_system_prompt_for_intent(intent: IntentType) -> str:
    """
    Get specialized system prompt based on detected intent.
    
    Args:
        intent: Detected intent type
        
    Returns:
        System prompt for the LLM
    """
    prompts = {
        IntentType.KNOWLEDGE_QA: (
            "You are an educational assistant. Answer the student's knowledge questions clearly and accurately. "
            "Cite relevant course materials if available. Encourage deeper understanding."
        ),
        IntentType.HOMEWORK_GRADING: (
            "You are an expert grader. Evaluate the student's work fairly. Provide constructive feedback, "
            "identify strengths, note areas for improvement, and suggest next steps."
        ),
        IntentType.STUDY_PLANNING: (
            "You are a learning coach. Create realistic study plans that balance workload, respect deadlines, "
            "and promote effective learning. Be specific with timing and resources."
        ),
        IntentType.COURSEWORK_HELP: (
            "You are a tutor for this course material. Help the student understand course concepts using examples "
            "from the course materials. Be patient and clear."
        ),
        IntentType.OTHER: (
            "You are a helpful educational assistant. Answer the student's question as best you can."
        ),
    }
    return prompts.get(intent, prompts[IntentType.OTHER])


def route_request(text: str, enable_rag: bool = True) -> dict:
    """
    Analyze user request and return routing decision with context.
    
    Args:
        text: User message
        enable_rag: Whether RAG is available/enabled
        
    Returns:
        Dict with:
            - intent: IntentType
            - confidence: float 0-1
            - use_rag: bool (recommended)
            - system_prompt: str
            - route_notes: str
    """
    intent, confidence = detect_intent(text)
    recommended_rag = should_use_rag(intent) and enable_rag
    
    notes = f"Detected {intent.value} with {confidence:.1%} confidence"
    if recommended_rag:
        notes += "; RAG enabled for context"
    
    return {
        "intent": intent.value,
        "intent_type": intent,
        "confidence": confidence,
        "use_rag": recommended_rag,
        "system_prompt": get_system_prompt_for_intent(intent),
        "route_notes": notes,
    }
