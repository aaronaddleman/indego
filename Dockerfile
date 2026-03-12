FROM python:3.12-slim

# Install Node.js 20 + Firebase CLI
RUN apt-get update && apt-get install -y curl openjdk-21-jre-headless && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g firebase-tools && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Version info (passed at build time)
ARG GIT_COMMIT=unknown
ARG DEPLOYED_AT=unknown
ENV GIT_COMMIT=${GIT_COMMIT}
ENV DEPLOYED_AT=${DEPLOYED_AT}

# Copy project
COPY . .

# Create venv and install dependencies (Firebase CLI expects this)
RUN python3.12 -m venv functions/venv && \
    functions/venv/bin/pip install --no-cache-dir -r functions/requirements.txt

# Also install in system Python for running tests directly
RUN pip install --no-cache-dir -r functions/requirements.txt

# Default: run tests
CMD ["pytest", "functions/tests/"]
