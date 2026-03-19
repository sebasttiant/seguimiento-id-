FROM node:24.14.0-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY index.html ./
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY src ./src

ARG VITE_API_BASE_URL=/api
ARG VITE_PROJECT_DATA_SOURCE=api
ARG VITE_AUTH_MODE=api
ARG VITE_HTTP_TIMEOUT_MS=10000

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_PROJECT_DATA_SOURCE=$VITE_PROJECT_DATA_SOURCE
ENV VITE_AUTH_MODE=$VITE_AUTH_MODE
ENV VITE_HTTP_TIMEOUT_MS=$VITE_HTTP_TIMEOUT_MS

RUN npm run build

FROM nginx:1.27-alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
