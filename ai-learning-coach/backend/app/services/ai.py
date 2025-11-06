# app/services/ai.py
from typing import List, Dict, Any
from google import genai
from flask import current_app

_SUPPORTED_ROLES = {"user", "model"}

# 尽量宽松的安全阈值，减少被误拦
_DEFAULT_SAFETY = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
    {"category": "HARM_CATEGORY_SEXUAL", "threshold": "BLOCK_ONLY_HIGH"},
    {"category": "HARM_CATEGORY_DANGEROUS", "threshold": "BLOCK_ONLY_HIGH"},
]

def _get_client() -> genai.Client:
    api_key = current_app.config.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    return genai.Client(api_key=api_key)

def _format_messages(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    formatted = []
    for m in messages or []:
        role = m.get("role")
        content = m.get("content")
        if role not in _SUPPORTED_ROLES or not content:
            raise ValueError("each message must include role ('user' or 'model') and non-empty content")
        formatted.append({"role": role, "parts": [{"text": str(content)}]})
    return formatted

def _pick_generation_config(kwargs: Dict[str, Any]) -> Dict[str, Any]:
    out = {}
    if "temperature" in kwargs:       out["temperature"] = float(kwargs["temperature"])
    if "top_p" in kwargs:             out["top_p"] = float(kwargs["top_p"])
    if "top_k" in kwargs:             out["top_k"] = int(kwargs["top_k"])
    if "max_output_tokens" in kwargs: out["max_output_tokens"] = int(kwargs["max_output_tokens"])
    if "candidate_count" in kwargs:   out["candidate_count"] = int(kwargs["candidate_count"])
    return out

def _extract_text(resp) -> str:
    # 优先用 resp.text；为空则从 candidates 里取
    text = getattr(resp, "text", None)
    if text:
        return text.strip()
    try:
        for c in getattr(resp, "candidates", []) or []:
            parts = getattr(getattr(c, "content", None), "parts", None) or []
            for p in parts:
                t = getattr(p, "text", None)
                if t:
                    return t.strip()
    except Exception:
        pass
    return ""

def _finish_info(resp) -> Dict[str, Any]:
    info = {"candidates": []}
    try:
        for i, c in enumerate(getattr(resp, "candidates", None) or []):
            info["candidates"].append({
                "idx": i,
                "finish_reason": str(getattr(c, "finish_reason", None) or getattr(c, "finishReason", None)),
                "safety_ratings": str(getattr(c, "safety_ratings", None) or getattr(c, "safetyRatings", None)),
            })
    except Exception:
        pass
    return info

def generate_reply(messages: List[Dict[str, Any]], system_prompt: str = None, **generation_kwargs) -> str:
    client = _get_client()
    # ✅ 用真实存在的默认模型；也可在 .env 里覆盖 GEMINI_MODEL
    model_name = current_app.config.get("GEMINI_MODEL", "gemini-1.5-flash")

    contents = _format_messages(messages)
    gen_config = _pick_generation_config(generation_kwargs)

    # ✅ 合并config：包含system_instruction和generation参数
    config = {}
    if system_prompt:
        config["system_instruction"] = system_prompt
    # 将generation参数合并到config中
    if gen_config:
        config.update(gen_config)

    try:
        resp = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=config if config else None,
        )
    except Exception as exc:
        raise RuntimeError(f"Gemini API call failed: {exc}") from exc

    text = _extract_text(resp)
    if text:
        return text

    current_app.logger.warning("Gemini returned no text. details=%s", _finish_info(resp))

    # 简单回退重试（只用最后一条 user，缩短 system，改成更稳的 flash）
    last_user = ""
    for m in reversed(messages or []):
        if (m.get("role") or "").lower() == "user" and m.get("content"):
            last_user = str(m["content"])
            break

    try:
        resp2 = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[{"role": "user", "parts": [{"text": last_user}]}],
            config={
                "system_instruction": (system_prompt or "")[:2000],
                "temperature": 0.1,
                "max_output_tokens": 512
            },
        )
        text2 = _extract_text(resp2)
        if text2:
            current_app.logger.info("Gemini fallback retry succeeded")
            return text2
        current_app.logger.warning("Gemini fallback still no text. details=%s", _finish_info(resp2))
    except Exception as exc:
        current_app.logger.warning("Gemini fallback retry failed: %s", exc)

    raise RuntimeError("Gemini API returned no text response")
