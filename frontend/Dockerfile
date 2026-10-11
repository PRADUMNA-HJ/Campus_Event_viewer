# ===================================================================
# Stage 1: Build React Production Static Bundle
# ===================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Cache package dependencies
COPY package*.json ./
RUN npm ci

COPY . .

# Argument for build-time API base URL injection
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# ===================================================================
# Stage 2: Serve via Nginx Alpine
# ===================================================================
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
