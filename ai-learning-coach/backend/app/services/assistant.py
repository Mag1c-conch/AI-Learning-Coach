from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional, Tuple

from flask import current_app
from sqlalchemy import func, or_
from werkzeug.utils import secure_filename

from ..models import Material
from .ai import generate_reply

GENERAL_CHAT_PROMPT = (
    "Role: AI teaching assistant.\n"
    "Provide practical answers about pedagogy, course design, and assessment. "
    "Keep responses concise and contextual."
    "if user greets you, greet them back."
)

CLASSIFIER_PROMPT = (
    "Pick a task from the full chat and only return JSON (no extra text). Options:\n"
    "- generate_practice: make practice questions from a file. Required: `material_name`. Optional: `course_id`, "
    "`question_count`, `difficulty`, `instruction`.\n"
    "- material_qa: answer or explain content from a file. Required: `material_name`. Optional: `course_id`, "
    "`question` or `instruction`.\n"
    "- wrong_answer_hint: give a hint for a wrong student answer. Required: `question`, `student_answer`. "
    "Optional: `correct_answer`.\n"
    "- general_chat: everything else.\n\n"
    "Return JSON like {\"task\": <name>, \"params\": {...}, \"missing\": []}. "
    "If a file is mentioned but info is missing, keep task as material_qa and list missing fields; "
    "use general_chat only when no task fits."
)

PRACTICE_PROMPT = (
    "You are an expert instructor. Create high-quality practice questions from the "
    "provided course material. Return the questions as plain text, numbered list. "
    "For each question include:\n"
    "- Question text\n"
    "- If multiple choice: label options A), B), C) etc.\n"
    "Don't give correct answers, just give the questions."
    "Keep questions aligned with the supplied material and avoid revealing answers directly when hints suffice."
)

MATERIAL_QA_PROMPT = (
    "You are an expert teaching assistant. Use the provided course material to answer "
    "the user's request. Base your response strictly on the supplied excerpt and avoid "
    "inventing details. Keep explanations concise and clear. If the excerpt lacks "
    "enough information, say so briefly and suggest what else is needed."
)

WRONG_ANSWER_PROMPT = (
    "Read the question, the student's answer, and the correct answer if present. "
    "Give a concise hint that steers the student toward the right reasoning without dumping the full solution unless asked."
)


def process_assistant_request(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    classification = classify_task(messages)
    task = classification.get("task") or "general_chat"
    raw_params = classification.get("params")
    params = raw_params if isinstance(raw_params, dict) else {}
    raw_missing = classification.get("missing")
    missing = [str(item) for item in raw_missing] if isinstance(raw_missing, list) else []

    if missing and task in {"generate_practice", "material_qa"}:
        params, missing = fill_material_info(params, missing, messages)

    required_fields = {
        "generate_practice": {"material_name"},
        "material_qa": {"material_name"},
        "wrong_answer_hint": {"student_answer"},
        "general_chat": set(),
    }.get(task, set())
    missing = [field for field in missing if field in required_fields]

    if missing:
        missing_str = ", ".join(missing)
        return {
            "task": task,
            "missing": missing,
            "text": f"Provide the following details before we can continue: {missing_str}.",
        }

    handler = TASK_HANDLERS.get(task, handle_general_chat)
    return handler(messages, params)


def classify_task(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    raw = generate_reply(messages, system_prompt=CLASSIFIER_PROMPT, temperature=0)
    data = None
    if raw:
        stripped = raw.strip()
        if stripped.startswith("```"):
            stripped = stripped.strip("`")
            if "\n" in stripped:
                stripped = stripped.split("\n", 1)[1]
            if stripped.lower().startswith("json"):
                stripped = stripped[4:].lstrip("\n")
        try:
            data = json.loads(stripped)
        except json.JSONDecodeError:
            data = None
    if not data:
        return {"task": "general_chat", "params": {}, "missing": []}
    return data


def handle_general_chat(messages: List[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
    text = generate_reply(messages, system_prompt=GENERAL_CHAT_PROMPT)
    return {"task": "general_chat", "text": text}


def handle_generate_practice(messages: List[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
    material, error_response = find_material(params)
    if error_response:
        return error_response

    try:
        material_text = read_material_text(material)
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

    request_text = params.get("instruction") or last_user_text(messages)
    try:
        question_count_raw = int(params.get("question_count"))
        question_count = max(1, min(20, question_count_raw))
    except (TypeError, ValueError):
        question_count = 5
    difficulty = params.get("difficulty")

    user_prompt = build_practice_prompt(material, material_text, request_text, question_count, difficulty)
    ai_response = generate_reply(
        [{"role": "user", "content": user_prompt}],
        system_prompt=PRACTICE_PROMPT,
    )
    if not ai_response:
        formatted = "No content returned."
    else:
        lines = [line.rstrip() for line in ai_response.splitlines() if line.strip()]
        formatted = "\n".join(lines) if lines else (ai_response.strip() or "No content returned.")

    return {
        "task": "generate_practice",
        "text": formatted,
    }


def handle_material_qa(messages: List[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
    material, error_response = find_material(params, task_name="material_qa")
    if error_response:
        return error_response

    try:
        material_text = read_material_text(material)
        
    except ValueError as exc:
        return {
            "task": "material_qa",
            "text": str(exc),
        }

    question = params.get("question") or params.get("instruction") or last_user_text(messages)
    question_str = str(question).strip() if question is not None else ""
    if not question_str:
        return {
            "task": "material_qa",
            "missing": ["question"],
            "text": "Please provide a question or instruction about the material.",
        }

    course = material.course
    course_info = f"{course.name} ({course.code})" if course else f"Course ID {material.course_id}"
    material_label = material.stored_name or material.original_name

    prompt = (
        f"Course: {course_info}\n"
        f"Material file: {material_label}\n"
        f"User request:\n{question_str}\n\n"
        "Material excerpt (truncated to first 4000 characters):\n"
        f"{material_text}"
    )
    answer = generate_reply([{"role": "user", "content": prompt}], system_prompt=MATERIAL_QA_PROMPT)
    if not answer or not answer.strip():
        answer = "The model did not return any content."
    return {
        "task": "material_qa",
        "text": answer.strip(),
    }


def handle_wrong_answer_hint(messages: List[Dict[str, Any]], params: Dict[str, Any]) -> Dict[str, Any]:
    question = params.get("question") or last_user_text(messages)
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


def find_material(params: Dict[str, Any], task_name: str = "generate_practice"):
    course_id = params.get("course_id")
    material_name = params.get("material_name")

    base_query = Material.query
    if course_id is not None:
        base_query = base_query.filter(Material.course_id == course_id)

    if params.get("material_id") is not None:
        return None, {
            "task": task_name,
            "text": "material_id is not supported; please provide material_name (file name).",
        }

    if not material_name:
        return None, {
            "task": task_name,
            "missing": ["material_name"],
            "text": "Please provide the material_name you want to use.",
        }

    name_str = str(material_name).strip()
    if not name_str:
        return None, {
            "task": task_name,
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
            stripped = "".join(ch for ch in value if ch.isalnum())
            if stripped:
                seq_pattern = "%" + "%".join(stripped) + "%"
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
            "task": task_name,
            "text": f"No material matched '{name_str}'. Verify the file name (material_name).",
        }

    if len(candidates) > 1:
        names = {candidate.original_name for candidate in candidates}
        preview = ", ".join(sorted(names)[:5])
        if len(names) > 5:
            preview += " ..."
        return None, {
            "task": task_name,
            "text": f"Multiple materials matched ({preview}). Provide a more precise file name or include course_id to disambiguate.",
        }

    return candidates[0], None


def read_material_text(material: Material, limit: int = 4000) -> str:
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


def build_practice_prompt(
    material: Material,
    material_text: str,
    request_text: Optional[str],
    question_count: int,
    difficulty: Optional[str],
) -> str:
    course = material.course
    course_info = f"{course.name} ({course.code})" if course else f"Course ID {material.course_id}"
    material_label = material.stored_name or material.original_name
    summary_parts = [
        f"Course: {course_info}",
        f"Material file: {material_label}",
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


def last_user_text(messages: List[Dict[str, Any]]) -> str:
    for message in reversed(messages or []):
        if message.get("role") == "user" and message.get("content"):
            return str(message["content"])
    return ""

def find_filename_in_messages(messages: List[Dict[str, Any]]) -> Optional[str]:
    import re

    pattern = re.compile(r"([^\s\\/:*?\"<>|]+\.(?:pdf|docx|txt|md|csv|json))", re.IGNORECASE)
    for message in reversed(messages or []):
        if (message.get("role") or "").lower() != "user":
            continue
        content = message.get("content")
        if not isinstance(content, str):
            continue
        match = pattern.search(content)
        if match:
            candidate = match.group(1).strip().rstrip('.,;:!?)]}>\"\'')
            if candidate:
                return candidate
    return None


def fill_material_info(
    params: Dict[str, Any], missing: List[str], messages: List[Dict[str, Any]]
) -> Tuple[Dict[str, Any], List[str]]:
    updated_params = dict(params or {})
    missing_set = set(missing or [])

    has_material = bool(updated_params.get("material_name"))
    if not has_material:
        filename = find_filename_in_messages(messages)
        if filename:
            updated_params["material_name"] = filename
            missing_set.discard("material_name")

    if "material_id" in missing_set:
        missing_set.discard("material_id")
        if not updated_params.get("material_name"):
            missing_set.add("material_name")

    return updated_params, list(missing_set)


TASK_HANDLERS = {
    "general_chat": handle_general_chat,
    "generate_practice": handle_generate_practice,
    "material_qa": handle_material_qa,
    "wrong_answer_hint": handle_wrong_answer_hint,
}