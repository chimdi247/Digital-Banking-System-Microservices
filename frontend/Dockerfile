# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Vite inlines VITE_* variables into the JS bundle at build time, so this
# must be a URL the browser can reach (see docker-compose.yml build.args).

ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Browser-side OpenTelemetry tracing (see src/otel.js). The browser sends
# spans straight to the otel-collector's OTLP/HTTP port, so this must also
# be a URL the browser can reach -- and it's inlined at build time like
# every VITE_* variable. Leave empty to disable browser tracing entirely.

ARG VITE_OTEL_EXPORTER_OTLP_ENDPOINT=/otlp
ENV VITE_OTEL_EXPORTER_OTLP_ENDPOINT=$VITE_OTEL_EXPORTER_OTLP_ENDPOINT
ARG VITE_OTEL_SERVICE_NAME=digital-banking-frontend
ENV VITE_OTEL_SERVICE_NAME=$VITE_OTEL_SERVICE_NAME

RUN npm run build

# ---- Runtime image ----
FROM nginx:1.27-alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
