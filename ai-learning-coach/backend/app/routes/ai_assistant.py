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
            if conversation.user_id and user_id and conversation.user_id != user_id:
                return jsonify({"error": "forbidden"}), 403
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


@bp.route("/assistant/conversations", methods=["GET"])
def list_conversations():
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    limit = request.args.get("limit", type=int)
    include_messages = request.args.get("include_messages", "false").lower() in {"true", "1", "yes"}
    message_limit = request.args.get("message_limit", type=int)

    conversations = chat_storage.list_conversations(
        user_id=user_id,
        limit=limit,
        include_messages=include_messages,
        message_limit=message_limit,
    )
    return jsonify(conversations), 200


@bp.route("/assistant/conversations/<int:conversation_id>", methods=["GET"])
def get_conversation(conversation_id: int):
    user_id = request.args.get("user_id", type=int)
    message_limit = request.args.get("message_limit", type=int)

    data = chat_storage.get_conversation_with_history(conversation_id, message_limit=message_limit)
    if not data:
        return jsonify({"error": "conversation not found"}), 404

    conv_user_id = data.get("user_id")
    if conv_user_id and user_id is None:
        return jsonify({"error": "user_id is required"}), 400
    if conv_user_id and user_id != conv_user_id:
        return jsonify({"error": "forbidden"}), 403

    return jsonify(data), 200
