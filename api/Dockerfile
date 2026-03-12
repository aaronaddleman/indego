# ── Stage 1: Base with system dependencies (cached, rarely changes) ──
FROM python:3.12-slim AS base

RUN apt-get update && apt-get install -y curl openjdk-21-jre-headless && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g firebase-tools && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Stage 2: Dependencies (cached until requirements.txt changes) ──
FROM base AS deps

COPY functions/requirements.txt functions/requirements.txt

# Venv outside functions/ so Firebase doesn't upload it
RUN python3.12 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir -r functions/requirements.txt

# Symlink so Firebase CLI can find it at functions/venv
RUN ln -s /opt/venv functions/venv

# System Python for tests
RUN pip install --no-cache-dir -r functions/requirements.txt

# ── Stage 3: App (rebuilt on every code change — fast) ──
FROM deps AS app

ARG GIT_COMMIT=unknown
ARG DEPLOYED_AT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}
ENV DEPLOYED_AT=${DEPLOYED_AT}

COPY . .

CMD ["pytest", "functions/tests/"]
