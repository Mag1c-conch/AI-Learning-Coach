# app/services/assistant.py
"""Task routing logic for the AI assistant with conversation persistence support."""
from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

from flask import current_app
from sqlalchemy import func, or_
from werkzeug.utils import secure_filename

from ..models import Material
from .ai import generate_reply

GENERAL_CHAT_PROMPT = (
    "Act as a practical teaching coach. Give grounded, specific advice on classroom practice, "
    "course design, feedback, and workload. Offer examples or steps when they help. "
    "Keep the tone encouraging and adjust depth to the teacher's context."
)

CLASSIFIER_PROMPT = (
    "You help decide which task to run from the conversation history. Tasks:\n"
    "- generate_practice: build practice questions from a course material. Needs `material_id`(int) or `material_name`(str); "
    "optional `course_id`(int), `question_count`(int), `difficulty`(str), and extra `instruction` text.\n"
    "- wrong_answer_hint: give a hint on an incorrect answer. Needs `question`(str) and `student_answer`(str); optional `correct_answer`(str).\n"
    "- general_chat: when nothing else fits.\n"
    "Return JSON only with keys: task, params, missing (array of still-needed fields). If unsure, pick general_chat."
)

PRACTICE_PROMPT = (
    "Create practice questions from the provided material. Return plain text in a numbered list. "
    "For multiple choice, label options A), B), C) etc. and mark the correct one. "
    "Add a short answer or rationale after each item using 'Answer: ...'. Keep every question tied to the material."
)

WRONG_ANSWER_PROMPT = (
    "Read the question, the student's answer, and the correct answer if present. "
    "Give a concise hint that steers the student toward the right reasoning without dumping the full solution unless asked."
)


def process_assistant_request(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    classification = _classify_task(messages)
    task = classification.get("task") or "general_chat"
    raw_params = classification.get("params")
    params = raw_params if isinstance(raw_params, dict) else {}
    raw_missing = classification.get("missing")
    missing = [str(v) for v in raw_missing] if isinstance(raw_missing, list) else []

    if missing:
        missing_str = ", ".join(missing)
        return {
            "task": task,
            "missing": missing,
            "text": f"Provide the following details before we can continue: {missing_str}.",
        }

    handler = _TASK_HANDLERS.get(task, _handle_general_chat)
    return handler(messages, params)


def _classify_task(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    raw = generate_reply(messages, system_prompt=CLASSIFIER_PROMPT, temperature=0)
    payload = _extract_json(raw)
    if not payload:
        return {"task": "general_chat", "params": {}, "missing": []}
    return payload


def _handle_general_chat(messages: List[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
    text = generate_reply(messages, system_prompt=GENERAL_CHAT_PROMPT)
    return {"task": "general_chat", "text": text}


def _handle_generate_practice(messages: List[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
    material, error_response = _resolve_material(params)
    if error_response:
        return error_response

    try:
        material_text = _load_material_text(material)
    except FileNotFoundError:
        return {
            "task": "generate_practice",
            "text": "Material file does not exist; unable to generate practice questions.",
        }
    except ValueError as exc:
        return {
            "task": "generate_practice",
            "text": str(exc),
        }

    request_text = params.get("instruction") or _last_user_message(messages)
    question_count = _coerce_int(params.get("question_count"), default=5, minimum=1, maximum=20)
    difficulty = params.get("difficulty")

    user_prompt = _build_practice_prompt(material, material_text, request_text, question_count, difficulty)
    ai_response = generate_reply(
        [{"role": "user", "content": user_prompt}],
        system_prompt=PRACTICE_PROMPT,
    )
    formatted = _format_questions_text(ai_response)

    return {
        "task": "generate_practice",
        "text": formatted,
    }


def _handle_wrong_answer_hint(messages: List[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
    question = params.get("question") or _last_user_message(messages)
    student_answer = params.get("student_answer")
    if not student_answer:
        return {
            "task": "wrong_answer_hint",
            "missing": ["student_answer"],
            "text": "Please provide the student's answer.",
        }

    correct_answer = params.get("correct_answer")
    instruction = params.get("instruction")

    parts = [
        f"Question:\n{question}",
        f"Student answer:\n{student_answer}",
    ]
    if correct_answer:
        parts.append(f"Correct answer (if available):\n{correct_answer}")
    if instruction:
        parts.append(f"Teacher instruction:\n{instruction}")

    prompt = "\n\n".join(parts)
    hint = generate_reply(
        [{"role": "user", "content": prompt}],
        system_prompt=WRONG_ANSWER_PROMPT,
    )
    return {
        "task": "wrong_answer_hint",
        "text": hint,
    }


def _resolve_material(params: Dict[str, Any]):
    material_id = params.get("material_id")
    course_id = params.get("course_id")
    material_name = params.get("material_name")

    base_query = Material.query
    if course_id is not None:
        base_query = base_query.filter(Material.course_id == course_id)

    if material_id is not None:
        try:
            material_id = int(material_id)
        except (TypeError, ValueError):
            return None, {
                "task": "generate_practice",
                "text": "Invalid material_id. Please provide an integer.",
            }
        material = Material.query.get(material_id)
        if not material:
            return None, {
                "task": "generate_practice",
                "text": f"No material found with ID {material_id}.",
            }
        return material, None

    if not material_name:
        return None, {
            "task": "generate_practice",
            "missing": ["material_name"],
            "text": "Please provide the material_name you want to use.",
        }

    name_str = str(material_name).strip()
    if not name_str:
        return None, {
            "task": "generate_practice",
            "missing": ["material_name"],
            "text": "Material name cannot be empty.",
        }

    lowered = name_str.lower()
    sanitized = secure_filename(name_str)
    conditions = [
        func.lower(Material.original_name) == lowered,
        func.lower(Material.stored_name) == lowered,
    ]
    if sanitized:
        sanitized_lower = sanitized.lower()
        conditions.extend([
            func.lower(Material.original_name) == sanitized_lower,
            func.lower(Material.stored_name) == sanitized_lower,
        ])

    exact_matches = base_query.filter(or_(*conditions)).all()
    candidates: List[Material] = []
    seen = set()
    for candidate in exact_matches:
        if candidate.id not in seen:
            candidates.append(candidate)
            seen.add(candidate.id)

    if not candidates:
        fuzzy_values = {name_str}
        if sanitized:
            fuzzy_values.add(sanitized)

        fuzzy_conditions = []
        for value in fuzzy_values:
            pattern = f"%{value}%"
            fuzzy_conditions.extend([
                Material.original_name.ilike(pattern),
                Material.stored_name.ilike(pattern),
            ])
            seq_pattern = _build_sequential_pattern(value)
            if seq_pattern:
                fuzzy_conditions.extend([
                    Material.original_name.ilike(seq_pattern),
                    Material.stored_name.ilike(seq_pattern),
                ])
        fuzzy_query = base_query.filter(or_(*fuzzy_conditions))
        for candidate in fuzzy_query.all():
            if candidate.id not in seen:
                candidates.append(candidate)
                seen.add(candidate.id)

    if not candidates:
        return None, {
            "task": "generate_practice",
            "text": f"No material matched '{name_str}'. Verify the file name or provide material_id.",
        }

    if len(candidates) > 1:
        names = {candidate.original_name for candidate in candidates}
        preview = ", ".join(sorted(names)[:5])
        if len(names) > 5:
            preview += " ..."
        return None, {
            "task": "generate_practice",
            "text": f"Multiple materials matched ({preview}). Provide a more precise file name or specify material_id.",
        }

    return candidates[0], None


def _load_material_text(material: Material, limit: int = 4000) -> str:
    root = current_app.config.get("UPLOAD_FOLDER")
    if not root:
        raise ValueError("UPLOAD_FOLDER is not configured; cannot read materials.")

    course_dir = os.path.join(root, str(material.course_id))
    candidate_paths = []

    if material.assignment_id:
        assignment_dir = os.path.join(course_dir, str(material.assignment_id))
        if material.file_type == "assignment_submission":
            candidate_paths.append(os.path.join(assignment_dir, "student_uploads", material.stored_name))
        candidate_paths.append(os.path.join(assignment_dir, material.stored_name))

    candidate_paths.append(os.path.join(course_dir, material.stored_name))

    file_path = next((path for path in candidate_paths if os.path.isfile(path)), None)
    if not file_path:
        raise FileNotFoundError(candidate_paths[0])

    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    if ext in {".txt", ".md", ".csv", ".json"}:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as fh:
            content = fh.read()
    elif ext == ".docx":
        try:
            from docx import Document
        except ImportError as exc:
            raise ValueError("python-docx is not installed on the server; cannot parse .docx files.") from exc
        document = Document(file_path)
        content = "\n".join(paragraph.text for paragraph in document.paragraphs)
    elif ext == ".pdf":
        # Prefer pdfminer.six for better extraction; fallback to PyPDF2 if missing.
        try:
            from pdfminer.high_level import extract_text  # type: ignore
        except ImportError:
            try:
                import PyPDF2
            except ImportError as exc:
                raise ValueError("Neither pdfminer.six nor PyPDF2 is installed; cannot read .pdf files.") from exc
            try:
                with open(file_path, "rb") as fh:
                    reader = PyPDF2.PdfReader(fh)
                    pages = []
                    for page in reader.pages:
                        try:
                            pages.append(page.extract_text() or "")
                        except Exception:
                            pages.append("")
                    content = "\n".join(pages)
            except Exception as exc:
                raise ValueError(f"Failed to read PDF: {exc}") from exc
        else:
            try:
                content = extract_text(file_path) or ""
            except Exception as exc:
                raise ValueError(f"Failed to read PDF: {exc}") from exc
    else:
        raise ValueError(f"Unsupported file type: {ext or 'unknown'}.")

    return content[:limit]


def _build_practice_prompt(
    material: Material,
    material_text: str,
    request_text: Optional[str],
    question_count: int,
    difficulty: Optional[str],
) -> str:
    course = material.course
    course_info = f"{course.name} ({course.code})" if course else f"Course ID {material.course_id}"
    summary_parts = [
        f"Course: {course_info}",
        f"Material title: {material.original_name}",
        f"Requested questions: {question_count}",
    ]
    if difficulty:
        summary_parts.append(f"Difficulty: {difficulty}")
    if request_text:
        summary_parts.append(f"Teacher instruction: {request_text}")

    summary = "\n".join(summary_parts)
    return (
        f"{summary}\n\n"
        "Material excerpt (truncated to first 4000 characters):\n"
        f"{material_text}"
    )


def _format_questions_text(response: str) -> str:
    if not response:
        return "The model did not return any content."

    lines = [line.rstrip() for line in response.splitlines() if line.strip()]
    if not lines:
        return response.strip() or "The model did not return any content."

    return "\n".join(lines)


def _last_user_message(messages: List[Dict[str, Any]]) -> str:
    for message in reversed(messages or []):
        if message.get("role") == "user" and message.get("content"):
            return str(message["content"])
    return ""


def _coerce_int(value: Any, default: int, minimum: int, maximum: int) -> int:
    try:
        number = int(value)
        return max(minimum, min(maximum, number))
    except (TypeError, ValueError):
        return default


def _extract_json(text: str) -> Any:
    if not text:
        return None
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if "\n" in stripped:
            stripped = stripped.split("\n", 1)[1]
        if stripped.lower().startswith("json"):
            stripped = stripped[4:].lstrip("\n")
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        return None

def _build_sequential_pattern(value: str) -> Optional[str]:
    stripped = "".join(ch for ch in value if ch.isalnum())
    if not stripped:
        return None
    return "%" + "%".join(stripped) + "%"


_TASK_HANDLERS = {
    "general_chat": _handle_general_chat,
    "generate_practice": _handle_generate_practice,
    "wrong_answer_hint": _handle_wrong_answer_hint,
}