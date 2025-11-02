# app/routes/ai_assistant.py
from flask import Blueprint, current_app, jsonify, request

bp = Blueprint("ai_assistant", __name__)


@bp.route("/assistant/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json(force=True, silent=True) or {}
    current_app.logger.debug("AI assistant payload: %s", data)
    try:
        messages = data.get("messages", [])
        from ..services.assistant import process_assistant_request

        result = process_assistant_request(messages)
        return jsonify(result), 200
    except Exception as exc:
        current_app.logger.exception("ERROR in /assistant/chat: %s", exc)
        return jsonify({"error": str(exc)}), 500
