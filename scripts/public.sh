#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "构建前端…"
npm run build

echo "启动服务（端口 3001）…"
fuser -k 3001/tcp 2>/dev/null || true
sleep 0.3
node server/index.mjs &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT

sleep 0.8
echo "创建公网隧道（任意地点手机可访问）…"
echo "请等待下方出现 https://xxxx.lhr.life 链接"
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -R 80:127.0.0.1:3001 nokey@localhost.run
