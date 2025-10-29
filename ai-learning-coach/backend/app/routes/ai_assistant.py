from flask import Blueprint, abort, current_app, jsonify, request

from ..services.ai import generate_reply

bp = Blueprint("ai_assistant", __name__, url_prefix="/assistant")


@bp.route("/chat", methods=["POST"])
def chat():
    payload = request.get_json(silent=True) or {}
    messages = payload.get("messages")
    system_prompt = payload.get("system_prompt")

    if not isinstance(messages, list) or not messages:
        abort(400, description="messages must be a non-empty list")

    try:
        reply = generate_reply(messages, system_prompt=system_prompt)
    except ValueError as err:
        abort(400, description=str(err))
    except RuntimeError as err:
        abort(502, description=str(err))

    return jsonify(
        {
            "reply": reply,
            "model": current_app.config.get("GEMINI_MODEL", "gemini-1.5-flash"),
        }
    ), 200
