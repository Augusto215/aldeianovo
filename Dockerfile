# syntax=docker/dockerfile:1
# Monorepo (npm workspaces): um único Dockerfile com dois alvos finais.
#   docker build --target backend  → API Express + Supabase (porta 3333)
#   docker build --target frontend → nginx servindo o build do Vite (porta 80)
# O docker-compose.yml já aponta para os alvos certos.
# Schema do banco: aplicar backend/sql/schema.sql uma vez no SQL Editor do
# Supabase — não há mais migration automática no start do container.

# ── Dependências do monorepo ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

# ── Build do backend ────────────────────────────────────────────────────
FROM deps AS backend-build
COPY backend ./backend
RUN npm run build --workspace backend

# ── Backend (runtime) ───────────────────────────────────────────────────
FROM backend-build AS backend
ENV NODE_ENV=production
EXPOSE 3333
CMD ["node", "backend/dist/index.js"]

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
