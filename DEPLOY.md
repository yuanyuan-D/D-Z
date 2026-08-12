# 免费部署（不绑卡、不付费）

Glitch 已停服；Hugging Face Docker 要付费；Render 常要绑卡。  
请用 **Zeabur**（免费、一般不需要信用卡）：

## Zeabur 部署步骤

1. 打开 https://zeabur.com 注册/登录（可用 GitHub 登录）
2. 点 **Create Project** 新建项目
3. 点 **Add Service** → **Git** → 选择仓库 **`yuanyuan-D/D-Z`**
4. Zeabur 会自动识别 Node 项目并部署
5. 部署完成后，在服务里打开 **Networking / Domain**，生成公网域名  
   类似：`https://xxxx.zeabur.app`
6. 手机打开这个域名即可（任意网络、电脑关机也能用）

若构建失败，在服务设置里确认：
- **Root Directory**：仓库根目录
- **Build Command**：`npm ci && npm run build`（或留空让它自动检测）
- **Start Command**：`node server/index.mjs`

## 代码仓库

https://github.com/yuanyuan-D/D-Z
