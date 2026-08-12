FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
  && npm prune --omit=dev

ENV PORT=3001
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server/index.mjs"]
