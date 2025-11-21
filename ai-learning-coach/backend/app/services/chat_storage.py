import json
from datetime import datetime, timezone
from flask import current_app
from sqlalchemy import select
from ..extensions import db
from ..models import Conversation, ConversationMessage


_DEFAULT_REDIS_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days


def redis_client():
    return current_app.extensions.get("redis")


def redis_key(conversation_id):
    return f"conversation:{conversation_id}"


def redis_ttl():
    return int(current_app.config.get("CHAT_HISTORY_TTL", _DEFAULT_REDIS_TTL_SECONDS))


def create_conversation(user_id=None, title=None):
    conversation = Conversation(user_id=user_id, title=title)
    db.session.add(conversation)
    db.session.commit()
    return conversation


def get_conversation(conversation_id):
    return db.session.get(Conversation, conversation_id)


def append_message(conversation_id, role, content):
    timestamp = datetime.now(timezone.utc)
    message = ConversationMessage(
        conversation_id=conversation_id,
        role=role,
        content=content,
        created_at=timestamp,
    )
    db.session.add(message)

    conversation = db.session.get(Conversation, conversation_id)
    if conversation is not None:
        conversation.updated_at = timestamp

    db.session.commit()

    client = redis_client()
    if client:
        payload = {
            "role": role,
            "content": content,
            "created_at": message.created_at.isoformat() if message.created_at else None,
        }
        client.rpush(redis_key(conversation_id), json.dumps(payload))
        ttl = redis_ttl()
        if ttl:
            client.expire(redis_key(conversation_id), ttl)

    return message


def parse_redis_messages(entries):
    history = []
    for entry in entries:
        try:
            history.append(json.loads(entry))
        except json.JSONDecodeError:
            continue
    return history


def get_history(conversation_id, limit=None):
    client = redis_client()
    key = redis_key(conversation_id)
    history = []

    if client:
        try:
            if limit is None:
                entries = client.lrange(key, 0, -1)
            else:
                entries = client.lrange(key, max(0, -limit), -1)
            history = parse_redis_messages(entries)
        except Exception:
            history = []

    if history:
        return history[-limit:] if limit else history

    stmt = (
        select(ConversationMessage)
        .where(ConversationMessage.conversation_id == conversation_id)
        .order_by(ConversationMessage.created_at.asc())
    )
    if limit:
        stmt = stmt.limit(limit)

    rows = db.session.execute(stmt).scalars().all()
    history = [
        {
            "role": row.role,
            "content": row.content,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]

    if client and history:
        try:
            client.delete(key)
            with client.pipeline() as pipe:
                for item in history:
                    pipe.rpush(key, json.dumps(item))
                ttl = redis_ttl()
                if ttl:
                    pipe.expire(key, ttl)
                pipe.execute()
        except Exception:
            pass

    return history


def conversation_to_dict(conversation, include_messages=False):
    data = conversation.to_dict()
    if include_messages:
        data["messages"] = get_history(conversation.id)
    return data


def list_conversations(
    user_id,
    limit=None,
    include_messages=False,
    message_limit=None,
):
    query = (
        Conversation.query.filter(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
    )
    if limit:
        query = query.limit(limit)

    conversations = query.all()
    results = []
    for conversation in conversations:
        data = conversation_to_dict(conversation, include_messages=False)
        if include_messages:
            data["messages"] = get_history(conversation.id, limit=message_limit)
        results.append(data)
    return results


def get_conversation_with_history(conversation_id, message_limit=None):
    conversation = db.session.get(Conversation, conversation_id)
    if not conversation:
        return None
    data = conversation_to_dict(conversation, include_messages=False)
    data["messages"] = get_history(conversation_id, limit=message_limit)
    return data


def delete_conversation(conversation_id, user_id=None):
    conversation = db.session.get(Conversation, conversation_id)
    if not conversation:
        return False

    # Validate ownership when requested
    if user_id is not None and conversation.user_id != user_id:
        return False

    # Remove the Redis cache entry
    client = redis_client()
    if client:
        try:
            client.delete(redis_key(conversation_id))
        except Exception:
            pass

    # Delete the database record (messages are cascade-deleted)
    db.session.delete(conversation)
    db.session.commit()

    return True
