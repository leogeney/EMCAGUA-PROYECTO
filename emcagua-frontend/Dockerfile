# ── Etapa 1: Compilar ────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# Instalar dependencias (se cachea si package*.json no cambia)
COPY package.json package-lock.json ./
RUN npm ci

# Copiar código fuente y compilar
COPY . .

# API_URL vacía = usa rutas relativas (/api/...) que Nginx proxea al backend
ENV VITE_API_URL=""
RUN npm run build

# ── Etapa 2: Servir con Nginx ────────────────────────────────────
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
