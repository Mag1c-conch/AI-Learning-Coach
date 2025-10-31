# app/routes/ai_assistant.py
from flask import Blueprint, request, jsonify
import traceback, sys

bp = Blueprint("ai_assistant", __name__)

@bp.route("/assistant/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json(force=True, silent=True) or {}
    print(data) 
    try:
        messages = data.get("messages", [])
        system_prompt = data.get("system_prompt")
        from ..services.ai import generate_reply
        reply = generate_reply(messages, system_prompt=system_prompt)
        return jsonify({"text": reply}), 200
    except Exception as e:
        print("ERROR in /assistant/chat:", e, file=sys.stderr)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
