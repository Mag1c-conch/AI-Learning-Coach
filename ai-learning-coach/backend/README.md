# Backend

## Overview
This directory contains the Flask backend for the AI Learning Coach project. It exposes a small REST API, manages SQLAlchemy models, and wires together extensions such as database migrations and CORS support.

## Prerequisites
- Python 3.10+
- pip (bundled with modern Python installs)

## Installation
1. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```
2. Activate it:
   - Windows PowerShell:
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
   - macOS/Linux:
     ```bash
     source .venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Environment Variables
Configuration is loaded from `.env`. The default development file contains:
```
FLASK_ENV=development
DATABASE_URL=sqlite:///instance/dev.db
```
Update `DATABASE_URL` if you want to run against a different database (e.g. PostgreSQL).

## Database Migrations
Flask-Migrate (Alembic) is configured for schema management. After installing dependencies and activating the virtual environment:
```bash
flask db upgrade        # apply migrations
flask db migrate -m "message"  # create a new migration
每次更新models.py后执行：
flask --app wsgi db migrate -m "message"  #生成迁移脚本
flask --app wsgi db upgrade  #把迁移应用到数据库
```

## Running the Server
You can start the development server with either command:
```bash
flask --app wsgi run --debug
# or
python wsgi.py
```
The API will be available at `http://127.0.0.1:5000`.

## Available Endpoints
- `GET /test` - health check endpoint that returns "Hello, World!".
- `POST /auth/register` - accepts `first_name`, `last_name`, `username`, and `password` in JSON and currently echoes the payload (persistence to the database is still a TODO).

## Project Structure
```
backend/
|-- app/
|   |-- __init__.py        # application factory and blueprint registration
|   |-- extensions.py      # Flask extensions (SQLAlchemy, Migrate)
|   |-- models.py          # SQLAlchemy models (User)
|   `-- routes/
|       `-- Auth.py        # authentication blueprint and routes
|-- migrations/            # Alembic migration scripts
|-- instance/              # SQLite database lives here in development
|-- requirements.txt       # Python dependencies
|-- wsgi.py                # entrypoint for Flask / WSGI servers
`-- .env                   # local environment configuration
```

## Next Steps
- Implement persistent user registration and authentication workflows.
- Add automated tests (e.g. pytest) covering models and routes.
- Harden configuration for production (secrets handling, logging, etc.).

# material使用formData来传输数据