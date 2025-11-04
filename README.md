# AI Learning Coach Platform

AI Learning Coach is a full-stack web platform designed to assist instructors and students throughout the teaching and learning cycle. It combines course content management, AI-assisted grading, personalised feedback, and practice generation into a single experience.

## Key Capabilities

- **Instructor Workspace**
  - Upload and organize course materials and assignments.
  - Leverage AI assistance to generate lesson plans, hints, and explanations.
  - Use AI-powered grading to review student submissions and produce actionable feedback.

- **Student Experience**
  - Browse enrolled courses, download learning resources, and submit assignments.
  - Receive guided feedback and track course progress through the student dashboard.

- **AI Services**
  - Intelligent routing of assistant requests (e.g., Q&A, plan creation, practice generation).
  - Automatic practice question creation from uploaded materials.
  - Structured grading reports that highlight strengths, mistakes, and next steps.

This repository contains both the Flask backend (REST APIs, AI service integration, data persistence) and the React frontend (web dashboards for instructors and students).

## Project Structure

```
ai-learning-coach/
  backend/
    app/
      __init__.py            # Flask application factory and extension wiring
      models.py              # SQLAlchemy models (users, courses, assignments, materials, etc.)
      routes/                # REST endpoints (auth, courses, materials, AI assistant, ...)
      services/              # AI helpers, chat storage, Gemini integration
    instance/                # SQLite database + uploaded files (runtime data)
    requirements.txt         # Backend Python dependencies
    test_scripts/            # Utility scripts (e.g., reset DB, grading smoke tests)
  frontend/
    src/
      Admin/                 # Instructor dashboards (courses, grading, AI assistant)
      Student/               # Student-facing pages (courses, dashboard, AI chat)
      components/            # Shared UI pieces (sidebar, layout components)
      api/                   # Axios configuration and HTTP helpers
    package.json             # Frontend dependencies and scripts
    public/                  # Static assets served by React
  README.md                  # Project overview (this file)
  .gitignore
```

