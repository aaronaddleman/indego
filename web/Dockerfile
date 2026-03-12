# ── Stage 1: Dependencies (cached until package.json changes) ──
FROM node:20-slim AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# ── Stage 2: App (rebuilt on every code change — fast) ──
FROM deps AS app

COPY . .

CMD ["npm", "run", "dev"]
