# syntax=docker/dockerfile:1
# Monorepo (npm workspaces): um único Dockerfile com dois alvos finais.
#   docker build --target backend  → API Express + Prisma (porta 3333)
#   docker build --target frontend → nginx servindo o build do Vite (porta 80)
# O docker-compose.yml já aponta para os alvos certos.

# ── Dependências do monorepo ────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

# ── Build do backend ────────────────────────────────────────────────────
FROM deps AS backend-build
COPY backend ./backend
RUN npx prisma generate --schema backend/prisma/schema.prisma \
 && npm run build --workspace backend

# ── Backend (runtime) ───────────────────────────────────────────────────
FROM backend-build AS backend
ENV NODE_ENV=production
EXPOSE 3333
# Aplica as migrations pendentes e sobe a API.
CMD ["sh", "-c", "npx prisma migrate deploy --schema backend/prisma/schema.prisma && node backend/dist/index.js"]

# ── Build do frontend ───────────────────────────────────────────────────
FROM deps AS frontend-build
ENV VITE_API_URL=/api
COPY frontend ./frontend
RUN npm run build --workspace frontend

# ── Frontend (runtime: nginx) ───────────────────────────────────────────
FROM nginx:alpine AS frontend
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
