import sys
import types
from pathlib import Path

import pytest

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

redis_stub = types.ModuleType("redis")


class _RedisStub:
    @classmethod
    def from_url(cls, *args, **kwargs):
        return cls()

    def ping(self):
        return True


redis_stub.Redis = _RedisStub
sys.modules.setdefault("redis", redis_stub)

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402


@pytest.fixture()
def app(monkeypatch, tmp_path):
    test_db = tmp_path / "test.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{test_db}")
    monkeypatch.delenv("REDIS_URL", raising=False)

    application = create_app()
    application.config.update(TESTING=True)

    with application.app_context():
        db.drop_all()
        db.create_all()

    yield application

    with application.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()
