# syntax=docker/dockerfile:1.6
# ---------- builder ----------
# Use a fat builder to compile wheels (torch + transformers come later in
# #242/#246). Final stage copies only the installed site-packages, keeping
# the runtime image lean.
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# torch-cpu wheels live on a separate index. Pinning here so future model
# work (#242, #246) doesn't accidentally pull the 2GB CUDA build.
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir --target=/install \
        --extra-index-url https://download.pytorch.org/whl/cpu \
        torch==2.5.1+cpu \
 && pip install --no-cache-dir --target=/install -r requirements.txt

# ---------- runtime ----------
FROM python:3.11-slim AS runtime

WORKDIR /app

# curl is used by the ECS healthcheck command in the task-def.
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user — matches the pattern used by other services in this repo.
RUN useradd --create-home --shell /bin/bash appuser

COPY --from=builder /install /usr/local/lib/python3.11/site-packages
COPY app/ app/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=3011

USER appuser

EXPOSE 3011

# ECS task-def overrides this for production via the `command` field.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3011"]
