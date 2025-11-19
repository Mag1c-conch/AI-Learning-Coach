# Docker Guide

## Quick Start

### Build and run

```bash
cd ai-learning-coach
docker-compose up -d --build
```

First time might take a while to build images.

### Check status

```bash
docker-compose ps
```

### View logs

```bash
# all logs
docker-compose logs -f

# just backend
docker-compose logs -f backend

# just frontend  
docker-compose logs -f frontend
```

### Stop everything

```bash
docker-compose down
```

### Stop and remove volumes (deletes db)

```bash
docker-compose down -v
```

## Database Setup

First time or when you need migrations:

```bash
docker-compose exec backend flask --app wsgi db upgrade
```

## Access

- Frontend: http://localhost:3000
- Backend: http://localhost:5001
- Health check: http://localhost:5001/test

## Environment Variables

Two ways to set env vars:

### Option 1: Edit docker-compose.yml

Just edit the environment section directly.

### Option 2: Use .env file

Create `.env` in the ai-learning-coach folder:

```env
JWT_SECRET_KEY=your-secret-key
GEMINI_API_KEY=your-api-key
GEMINI_MODEL=gemini-2.5-flash
```

Docker compose will read it automatically. Use `${VAR_NAME}` in docker-compose.yml.

## Troubleshooting

### Port already in use

If 5001 or 3000 is taken, change the port mapping:

```yaml
ports:
  - "5002:5001"  # use 5002 instead
```

### Frontend can't connect

Check that `REACT_APP_API_BASE` is correct. If you changed backend port, rebuild frontend:

```bash
docker-compose build frontend
docker-compose up -d frontend
```

### Database migrations

If you changed models:

```bash
# get into backend container
docker-compose exec backend bash

# create migration
flask --app wsgi db migrate -m "your message"

# apply it
flask --app wsgi db upgrade
```

### Get into containers

```bash
# backend
docker-compose exec backend bash

# frontend
docker-compose exec frontend sh
```

## Production

### Change JWT secret

Don't use the default JWT secret in production:

```yaml
environment:
  - JWT_SECRET_KEY=your-production-secret-key
```

### Use PostgreSQL

SQLite is fine for dev but use postgres for production. Add this to docker-compose.yml:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ai_learning_coach
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/ai_learning_coach
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### HTTPS

Set up nginx reverse proxy or use Let's Encrypt for HTTPS.

## Cleanup

```bash
# remove containers and volumes
docker-compose down -v

# remove images too
docker-compose down --rmi all
```
