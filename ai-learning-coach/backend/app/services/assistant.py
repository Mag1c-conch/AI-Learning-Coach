# app/services/assistant.py
"""Task routing logic for the AI assistant with conversation persistence support."""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from flask import current_app
from sqlalchemy import func, or_
from werkzeug.utils import secure_filename

from ..models import Material
from .ai import generate_reply

GENERAL_CHAT_PROMPT = (
    "You are an AI learning coach. Provide concise, structured answers tailored to "
    "the provided course context and learner needs. After each response, check whether "
    "the user needs help with other tasks such as generating practice questions or "
    "analyzing wrong answers. Do not reveal full solutions directly; prefer hints and "
    "guiding steps."
)

CLASSIFIER_PROMPT = (
    "You are a routing assistant for an educational platform. Based on the full "
    "conversation history, decide which task to run. Available tasks:\n"
    "- generate_practice: create practice questions from a specific course material. "
    "Requires either `material_id` (int) or `material_name` (str). Capture the exact "
    "name when the user references a file. Optional fields: `course_id` (int) to "
    "disambiguate, `question_count` (int), `difficulty` (str), and any additional "
    "`instruction` text.\n"
    "- wrong_answer_hint: provide hints when a student submits an incorrect answer. "
    "Requires `question` (str) and `student_answer` (str). Optional: `correct_answer` (str).\n"
    "- general_chat: default conversational response when no special task fits.\n\n"
    "Return a JSON object with keys:\n"
    "`task`: one of the task names.\n"
    "`params`: object containing extracted parameters.\n"
    "`missing`: array of parameter names still required to execute the task (empty array if ready).\n"
    "If information is insufficient for specialised tasks, prefer setting task to general_chat. "
    "Respond with JSON only without markdown fences or additional commentary."
)

PRACTICE_PROMPT = (
    "You are an expert instructor. Create high-quality practice questions from the "
    "provided course material. Return the questions as plain text, numbered list. "
    "For each question include:\n"
    "- Question text\n"
    "- If multiple choice: label options A), B), C) etc. and mark the correct one clearly.\n"
    "- Provide the correct answer or brief rationale after each question using the format 'Answer: ...'.\n"
    "Keep questions aligned with the supplied material and avoid revealing answers directly when hints suffice."
)

WRONG_ANSWER_PROMPT = (
    "You are a supportive tutor. Review the question, the student's incorrect answer, "
    "and the correct answer if available. Provide a constructive hint (not the full "
    "solution unless explicitly requested) that helps the student understand the mistake "
    "and identify the correct reasoning."
)


class TaskExecutionError(RuntimeError):
    """Raised when a task cannot be completed."""


def process_assistant_request(messages: List[Dict[str, Any]]) -> Dict[str, Any]:
    classification = _classify_task(messages)
    task = classification.get("task") or "general_chat"
    params = _safe_dict(classification.get("params"))
    missing = _ensure_list(classification.get("missing"))

    if missing:
        missing_str = "、".join(missing)
        return {
            "task": task,
            "missing": missing,
            "text": f"要继续执行该任务，还需要提供以下信息：{missing_str}。",
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
            "text": "资料文件不存在，无法生成习题。",
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
            "text": "请提供学生的回答内容。",
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
                "text": "无效的 material_id，请提供整数。",
            }
        material = Material.query.get(material_id)
        if not material:
            return None, {
                "task": "generate_practice",
                "text": f"未找到 ID 为 {material_id} 的课程资料。",
            }
        return material, None

    if not material_name:
        return None, {
            "task": "generate_practice",
            "missing": ["material_name"],
            "text": "请提供要使用的课程资料名称（material_name）。",
        }

    name_str = str(material_name).strip()
    if not name_str:
        return None, {
            "task": "generate_practice",
            "missing": ["material_name"],
            "text": "请输入非空的资料名称。",
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
            "text": f"未找到名称包含「{name_str}」的课程资料，请确认文件名或提供 material_id。",
        }

    if len(candidates) > 1:
        names = {candidate.original_name for candidate in candidates}
        preview = "、".join(sorted(names)[:5])
        if len(names) > 5:
            preview += " 等"
        return None, {
            "task": "generate_practice",
            "text": f"找到多个匹配的资料：{preview}。请提供更精确的文件名或直接给出 material_id。",
        }

    return candidates[0], None


def _load_material_text(material: Material, limit: int = 4000) -> str:
    root = current_app.config.get("UPLOAD_FOLDER")
    if not root:
        raise ValueError("未配置上传目录，无法读取资料。")

    file_path = os.path.join(root, str(material.course_id), material.stored_name)
    if material.assignment_id:
        file_path = os.path.join(root, str(material.course_id), str(material.assignment_id), material.stored_name)

    if not os.path.isfile(file_path):
        raise FileNotFoundError(file_path)

    _, ext = os.path.splitext(file_path)
    ext = ext.lower()

    if ext in {".txt", ".md", ".csv", ".json"}:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as fh:
            content = fh.read()
    elif ext == ".docx":
        try:
            from docx import Document  # type: ignore
        except ImportError as exc:
            raise ValueError("服务器未安装 python-docx，无法解析 .docx 文件。") from exc
        document = Document(file_path)
        content = "\n".join(paragraph.text for paragraph in document.paragraphs)
    else:
        raise ValueError(f"暂不支持读取该文件类型：{ext or '未知'}。")

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
        return "模型未返回任何内容。"

    lines = [line.rstrip() for line in response.splitlines() if line.strip()]
    if not lines:
        return response.strip() or "模型未返回任何内容。"

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


def _safe_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _ensure_list(value: Any) -> List[str]:
    if isinstance(value, list):
        return [str(v) for v in value]
    return []


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
