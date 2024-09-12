# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /backend

COPY ./requirements.txt /backend/requirements.txt

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --timeout=120 --retries=10 --upgrade -r /backend/requirements.txt -i https://pypi.org/simple

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
