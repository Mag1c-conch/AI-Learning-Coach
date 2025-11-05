from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

from redis import Redis

from .extensions import db, migrate
from .routes import ai_assistant, assignment, auth, course,material


def create_app():
    load_dotenv()  # Load environment variables from .env file
    app = Flask(__name__)
    #     CORS(
    #     app,
    #     resources={r"/*": {
    #         "origins": [
    #             re.compile(r"http://localhost:\d+"),
    #             re.compile(r"http://127\\.0\\.0\\.1:\d+"),
    #         ],
    #         "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    #         "allow_headers": ["Content-Type", "Authorization"],
    #     }},
    #     supports_credentials=False,
    # )
    CORS(
        app,
        resources={r"/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }},
        supports_credentials=False,
    )
    # Ensure instance directory exists
    instance_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "instance")
    os.makedirs(instance_dir, exist_ok=True)

    # load ai api key
    app.config["GEMINI_API_KEY"] = os.getenv("GEMINI_API_KEY", "")
    app.config["GEMINI_MODEL"] = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    app.config["CHAT_HISTORY_TTL"] = int(os.getenv("CHAT_HISTORY_TTL", 60 * 60 * 24 * 7))

    # Set database URI - use environment variable if available, otherwise use default SQLite
    db_path = os.path.join(instance_dir, "app.db")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", f"sqlite:///{db_path}")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    # Ensure upload folder exists
    os.makedirs(os.path.join(instance_dir, "uploads"), exist_ok=True)
    app.config["UPLOAD_FOLDER"] = os.path.join(instance_dir, "uploads")
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    from . import models

    redis_client = None
    redis_url = os.getenv("REDIS_URL")
    if redis_url:
        try:
            redis_client = Redis.from_url(redis_url, decode_responses=True)
            redis_client.ping()
        except Exception as exc:
            app.logger.warning("Redis unavailable: %s", exc)
            redis_client = None
    app.extensions["redis"] = redis_client

    # Create all database tables if they don't exist
    with app.app_context():
        db.create_all()

    @app.route("/test")
    def test():
        return "Hello, World!"

    # Register blueprints
    app.register_blueprint(auth.bp)
    app.register_blueprint(course.bp)
    # assignment blueprint
    app.register_blueprint(assignment.bp)
    # material blueprint
    app.register_blueprint(material.bp)
    # ai assistant blueprint
    app.register_blueprint(ai_assistant.bp)
    # feedback notifications blueprint
    #app.register_blueprint(feedback.bp)
    return app




