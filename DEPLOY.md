# 免费长期部署（不买服务器、不绑卡）

你截图里的 Zeabur「购买新服务器」**不要买**——那是付费 VPS。  
本方案改用：**Supabase（免费云端数据库+实时同步）+ GitHub Pages（免费静态网页）**。  
手机任意网络都能用，家里电脑关机也没关系。

---

## 一、创建 Supabase（约 3 分钟）

1. 打开 https://supabase.com 用 GitHub 登录，新建项目（Free 计划）
2. 进 **SQL Editor** → New query，把仓库里 `supabase/schema.sql` **整段粘贴执行**
3. 打开 **Project Settings → API**，复制：
   - Project URL
   - `anon` `public` key

---

## 二、在本机写入密钥并验证

在项目根目录创建 `.env.local`（已在 `.gitignore`，不会提交）：

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon密钥
```

本地测试：

```bash
npm run dev:web
```

有云端配置时**不需要**再开本地 `server`，多开几个浏览器窗口应能互相看到点菜。

---

## 三、发布到 GitHub Pages

1. 仓库 Settings → Pages → Source 选 **GitHub Actions**
2. 仓库 Settings → Secrets and variables → Actions，添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. 推送代码到 `main` 后，Actions 会自动构建并发布  
4. 页面地址类似：  
   **https://yuanyuan-D.github.io/D-Z/**

---

## 四、本地开发（可选，无云端）

不配 Supabase 时，仍可用原来的本机 WebSocket：

```bash
npm run dev
```

同一 WiFi / 隧道场景下可用；要「电脑关机也能用」请走上面的 Supabase + Pages。

---

## 代码仓库

https://github.com/yuanyuan-D/D-Z
