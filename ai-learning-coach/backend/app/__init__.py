from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from .extensions import db, migrate
from .routes import auth,course
import os


def create_app():
    load_dotenv()  # Load environment variables from .env file
    app = Flask(__name__)
    CORS(app)
    
    # Ensure instance directory exists
    instance_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance')
    os.makedirs(instance_dir, exist_ok=True)
    
    # Set database URI - use environment variable if available, otherwise use default SQLite
    db_path = os.path.join(instance_dir, 'app.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL", f"sqlite:///{db_path}")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    from . import models
    
    # Create all database tables if they don't exist
    with app.app_context():
        db.create_all()
    
    @app.route("/test")
    def test():
        return "Hello, World!"
    
    # Register blueprints
    app.register_blueprint(auth.bp)
    # course blueprint
    app.register_blueprint(course.bp)
    
    return app
