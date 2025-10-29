import google.generativeai as genai
from flask import current_app

_SUPPORTED_ROLES = {"user", "model"}


def _get_model():
    api_key = current_app.config.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    genai.configure(api_key=api_key)
    model_name = current_app.config.get("GEMINI_MODEL", "gemini-1.5-flash")
    return genai.GenerativeModel(model_name)


def _format_messages(messages):
    formatted = []
    for message in messages:
        role = message.get("role")
        content = message.get("content")
        if role not in _SUPPORTED_ROLES or not content:
            raise ValueError("each message must include role ('user' or 'model') and non-empty content")
        formatted.append({"role": role, "parts": [content]})
    return formatted


def generate_reply(messages, system_prompt=None, **generation_kwargs):
    """Send conversation history to Gemini and return the model reply text."""
    model = _get_model()
    contents = _format_messages(messages)

    try:
        response = model.generate_content(
            contents,
            system_instruction=system_prompt,
            **generation_kwargs,
        )
    except Exception as exc:  # pragma: no cover - surface upstream
        raise RuntimeError(f"Gemini API call failed: {exc}") from exc

    text = getattr(response, "text", None)
    if not text:
        raise RuntimeError("Gemini API returned no text response")

    return text.strip()
