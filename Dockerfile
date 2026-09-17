FROM node:22-bookworm

# System packages required by Python, Playwright/Chromium and runtime tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    git \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Node dependencies
COPY package*.json ./
RUN npm ci

# Python dependencies
COPY requirements.txt ./
RUN python3 -m pip install --break-system-packages --no-cache-dir -r requirements.txt

# Application source
COPY . .

# Install Playwright Chromium and required browser dependencies
RUN python3 -m playwright install --with-deps chromium

# Build frontend + production Node server
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.mjs"]
