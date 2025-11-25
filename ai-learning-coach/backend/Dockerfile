FROM python:3.11-slim

WORKDIR /app

# need some system stuff
RUN apt-get update && apt-get install -y \gcc \curl \&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# install python 
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn
COPY . .

# make dirs and set perms
RUN mkdir -p instance/uploads && \
    chmod -R 777 instance

ENV FLASK_APP=wsgi.py
ENV PYTHONUNBUFFERED=1

EXPOSE 5001
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "4", "--timeout", "120", "wsgi:app"]

