# app/routes/ai_assistant.py
from flask import Blueprint, current_app, jsonify, request

from ..services import chat_storage
from ..services.assistant import process_assistant_request

bp = Blueprint("ai_assistant", __name__)


@bp.route("/assistant/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        return "", 200

    data = request.get_json(force=True, silent=True) or {}
    current_app.logger.debug("AI assistant payload: %s", data)
    try:
        messages = data.get("messages", []) or []
        conversation_id = data.get("conversation_id")
        user_id = data.get("user_id")
        conversation_title = data.get("conversation_title")

        if conversation_id:
            conversation = chat_storage.get_conversation(conversation_id)
            if not conversation:
                return jsonify({"error": "conversation not found"}), 404
        else:
            conversation = chat_storage.create_conversation(
                user_id=user_id,
                title=conversation_title,
            )
            conversation_id = conversation.id

        history = chat_storage.get_history(conversation_id)
        prompt_messages = list(history)

        latest_user_message = None
        if messages:
            latest_user_message = messages[-1]
            role = latest_user_message.get("role")
            content = latest_user_message.get("content")
            if role != "user" or not content:
                raise ValueError("latest message must be from user with non-empty content")
            chat_storage.append_message(conversation_id, role, content)
            prompt_messages.append({"role": role, "content": content})

        result = process_assistant_request(prompt_messages)
        reply_text = result.get("text")

        if reply_text:
            chat_storage.append_message(conversation_id, "model", reply_text)

        result["conversation_id"] = conversation_id
        result["messages"] = chat_storage.get_history(conversation_id)

        return jsonify(result), 200
    except Exception as exc:
        current_app.logger.exception("ERROR in /assistant/chat: %s", exc)
        return jsonify({"error": str(exc)}), 500
