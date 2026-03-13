from datetime import timedelta

from flask import Flask
from flask_cors import CORS
from flasgger import Swagger
from dotenv import load_dotenv
import os

from redis import Redis

from .extensions import db, migrate, jwt


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

    # JWT / auth configuration
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-change-me")
    jwt_minutes = int(os.getenv("JWT_ACCESS_TOKEN_MINUTES", "120"))
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(minutes=jwt_minutes)
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]

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
    jwt.init_app(app)

    # Initialize Flasgger for API documentation
    swagger = Swagger(app, template={
        "swagger": "3.0.0",
        "info": {
            "title": "AI Learning Coach API",
            "description": "Full-stack teaching platform with AI-driven grading and personalized feedback",
            "contact": {"email": "support@ailearningcoach.com"},
            "version": "1.0.0",
        },
        "host": "localhost:5001",
        "basePath": "/",
        "schemes": ["http", "https"],
        "securityDefinitions": {
            "Bearer": {
                "type": "apiKey",
                "name": "Authorization",
                "in": "header",
                "description": "JWT token with Bearer prefix"
            }
        }
    })

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

    skip_create_all = os.getenv("SKIP_DB_CREATE_ALL", "0").strip().lower() in {"1", "true", "yes"}
    if not skip_create_all:
        # Create all database tables if they don't exist.
        # This can be disabled (e.g., during Alembic migrations) by setting SKIP_DB_CREATE_ALL=1.
        with app.app_context():
            db.create_all()

    @app.route("/test")
    def test():
        return "Hello, World!"

    # Register blueprints
    from .routes import ai_assistant, assignment, auth, course, feedback, material, progress

    app.register_blueprint(auth.bp)
    app.register_blueprint(course.bp)
    # assignment blueprint
    app.register_blueprint(assignment.bp)
    # material blueprint
    app.register_blueprint(material.bp)
    # ai assistant blueprint
    app.register_blueprint(ai_assistant.bp)
    # feedback blueprint
    app.register_blueprint(feedback.bp)
    # progress blueprint
    app.register_blueprint(progress.bp)
    return app




