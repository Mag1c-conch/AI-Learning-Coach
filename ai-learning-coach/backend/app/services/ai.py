# app/services/ai.py
from google import genai
from flask import current_app

_SUPPORTED_ROLES = {"user", "model"}

def _get_client() -> genai.Client:
    api_key = current_app.config.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    return genai.Client(api_key=api_key)

def _format_messages(messages):
    formatted = []
    for m in messages:
        role = m.get("role")
        content = m.get("content")
        if role not in _SUPPORTED_ROLES or not content:
            raise ValueError("each message must include role ('user' or 'model') and non-empty content")
        formatted.append({"role": role, "parts": [{"text": content}]})
    return formatted

def generate_reply(messages, system_prompt=None, **generation_kwargs) -> str:
    client = _get_client()
    model_name = current_app.config.get("GEMINI_MODEL", "gemini-2.5-flash")
    contents = _format_messages(messages)

    # 把 system_prompt 和采样参数放进 config
    config = {}
    if system_prompt:
        config["system_instruction"] = system_prompt

    # 可选：把常见采样参数并入 config（其余 kwargs 你也可自行映射）
    for k in ("temperature", "top_p", "top_k", "max_output_tokens", "candidate_count"):
        if k in generation_kwargs:
            config[k] = generation_kwargs.pop(k)

    try:
        resp = client.models.generate_content(
            model=model_name,
            contents=contents,
            config=config if config else None,
        )
    except Exception as exc:
        raise RuntimeError(f"Gemini API call failed: {exc}") from exc

    text = getattr(resp, "text", None)
    if not text:
        raise RuntimeError("Gemini API returned no text response")
    return text.strip()
