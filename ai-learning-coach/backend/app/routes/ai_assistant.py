# app/routes/ai_assistant.py
from flask import Blueprint, current_app, jsonify, request

_DEFAULT_SYSTEM_PROMPT = (
    "You are an AI learning coach. Provide concise, structured answers tailored to "
    "the provided course context and learner needs."
)

bp = Blueprint("ai_assistant", __name__)


@bp.route("/assistant/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json(force=True, silent=True) or {}
    current_app.logger.debug("AI assistant payload: %s", data)
    try:
        messages = data.get("messages", [])
        system_prompt = current_app.config.get("AI_ASSISTANT_SYSTEM_PROMPT", _DEFAULT_SYSTEM_PROMPT)
        from ..services.ai import generate_reply

        reply = generate_reply(messages, system_prompt=system_prompt)
        return jsonify({"text": reply}), 200
    except Exception as exc:
        current_app.logger.exception("ERROR in /assistant/chat: %s", exc)
        return jsonify({"error": str(exc)}), 500
