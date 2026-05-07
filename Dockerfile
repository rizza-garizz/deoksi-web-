FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3001
ENV STATIC_ROOT=/app/dist

EXPOSE 3001

CMD ["node", "api-bridge.mjs"]
