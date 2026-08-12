# 免费部署（可不绑信用卡）

Render 免费套餐现在常会要求添加信用卡做身份验证（预授权约 1 美元，一般不扣费）。  
如果你**不想绑卡**，用下面任一方案。

---

## 方案 A：Hugging Face Spaces（推荐，免费、不绑卡）

1. 打开 https://huggingface.co/join 注册（可用邮箱）
2. 打开 https://huggingface.co/new-space
3. 填写：
   - Space name：例如 `family-menu`
   - SDK：选 **Docker**
   - Visibility：Public
4. 创建后，在 Space 的 **Files** 里点 **Add file** → **Upload files**  
   或者用 Git 把本仓库导入（Settings → 连接 GitHub 仓库 `yuanyuan-D/D-Z`）
5. 若用 GitHub 导入：把仓库根目录的 `Dockerfile` 保留即可；可选把 `README_HF.md` 内容作为 Space 的 `README.md` 开头配置
6. 等待 Build 完成
7. 打开 Space 页面，复制公网链接（形如 `https://xxxx.hf.space`）  
   **任意手机、电脑关机都能用**

> 注意：免费 Space 若长时间无人访问可能休眠，再次打开会稍慢。

---

## 方案 B：Glitch（免费、不绑卡）

1. 打开 https://glitch.com 注册
2. **New project** → **Import from GitHub**
3. 填入：`yuanyuan-D/D-Z`
4. 在终端执行：
```bash
npm install
npm run build
npm start
```
5. 点 **Share** 获取公网链接

---

## 方案 C：继续用 Render（免费但不绑卡过不了）

若你愿意绑卡验证：

1. 填卡完成验证（通常不扣费）
2. New + → Blueprint → 选 `yuanyuan-D/D-Z`
3. 部署后得到 `https://xxxx.onrender.com`

---

## 代码仓库

https://github.com/yuanyuan-D/D-Z
