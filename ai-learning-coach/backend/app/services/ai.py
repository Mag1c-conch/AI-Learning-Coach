from google import genai
from flask import current_app

_SUPPORTED_ROLES = {"user", "model"}

def _format_messages(messages):
    formatted = []
    for m in messages or []:
        role = m.get("role")
        content = m.get("content")
        if role not in _SUPPORTED_ROLES or not content:
            raise ValueError("each message must include role ('user' or 'model') and non-empty content")
        formatted.append({"role": role, "parts": [{"text": str(content)}]})
    return formatted

def _extract_text(resp):
    text = getattr(resp, "text", None)
    if isinstance(text, str) and text.strip():
        return text.strip()

    candidates = getattr(resp, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            snippet = getattr(part, "text", None)
            if isinstance(snippet, str) and snippet.strip():
                return snippet.strip()
    return ""

def generate_reply(messages, system_prompt=None, **generation_kwargs):
    api_key = current_app.config.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    client = genai.Client(api_key=api_key)
    model_name = current_app.config.get("GEMINI_MODEL", "gemini-2.5-flash")

    contents = _format_messages(messages)

    cast_map = {
        "temperature": float,
        "top_p": float,
        "top_k": int,
        "max_output_tokens": int,
        "candidate_count": int,
    }
    gen_config = {}
    for key, caster in cast_map.items():
        if key in generation_kwargs:
            try:
                gen_config[key] = caster(generation_kwargs[key])
            except (TypeError, ValueError):
                continue

    config = {}
    if system_prompt:
        config["system_instruction"] = system_prompt
    config.update(gen_config)

    try:
        resp = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=config or None,
        )
    except Exception as exc:
        raise RuntimeError(f"Gemini API call failed: {exc}") from exc

    text = _extract_text(resp)
    if text:
        return text

    candidates = getattr(resp, "candidates", None) or []
    candidate_info = [
        {
            "idx": idx,
            "finish_reason": str(getattr(c, "finish_reason", None) or getattr(c, "finishReason", None)),
            "safety_ratings": str(getattr(c, "safety_ratings", None) or getattr(c, "safetyRatings", None)),
        }
        for idx, c in enumerate(candidates)
    ]
    current_app.logger.warning("Gemini returned no text. details=%s", {"candidates": candidate_info})

    # Simple retry: use only the last user message, shorten the system prompt, and switch to flash
    last_user = ""
    for m in reversed(messages or []):
        if (m.get("role") or "").lower() == "user" and m.get("content"):
            last_user = str(m["content"])
            break

    try:
        resp2 = client.models.generate_content(
            model="gemini-2.5-flash",
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
        candidates2 = getattr(resp2, "candidates", None) or []
        info2 = [
            {
                "idx": idx,
                "finish_reason": str(getattr(c, "finish_reason", None) or getattr(c, "finishReason", None)),
                "safety_ratings": str(getattr(c, "safety_ratings", None) or getattr(c, "safetyRatings", None)),
            }
            for idx, c in enumerate(candidates2)
        ]
        current_app.logger.warning("Gemini fallback still no text. details=%s", {"candidates": info2})
    except Exception as exc:
        current_app.logger.warning("Gemini fallback retry failed: %s", exc)

    raise RuntimeError("Gemini API returned no text response")
