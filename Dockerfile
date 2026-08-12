# 部署到任意支持 Node 的平台（Render / Railway / Fly.io 等）
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY dist ./dist
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server/index.mjs"]
