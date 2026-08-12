# 免费部署（可不绑卡、可不付费）

## 当前可用：Glitch（推荐）

Hugging Face 的 Docker Space 已改为付费；Static 只适合纯网页，跑不了本项目的同步服务。  
用 **Glitch** 即可免费上线：

1. 打开 https://glitch.com 并注册/登录  
2. 右上角 **New project** → **Import from GitHub**  
3. 填写仓库：`yuanyuan-D/D-Z`  
4. 导入完成后，点左下角 **Terminal**，执行：

```bash
npm install
npm run build
```

5. 打开项目的 `package.json`，确认有：

```json
"scripts": {
  "start": "node server/index.mjs"
}
```

6. 若 Glitch 没有自动启动，在 Terminal 再执行：

```bash
npm start
```

7. 点顶部 **Share** → 复制 **Live site** 链接（类似 `https://xxxx.glitch.me`）  
   手机打开这个链接即可，**电脑关机也能用**。

> 免费项目若长时间没人访问可能休眠，再次打开会等十几秒醒来。

---

## 其他说明

- **Render**：免费但常要绑信用卡验证（一般不扣费）
- **Hugging Face Docker**：需 PRO 付费，不要选
- **Hugging Face Static**：免费，但无法运行本项目后端，不要选

## 代码仓库

https://github.com/yuanyuan-D/D-Z
