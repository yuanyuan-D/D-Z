# 电脑关机后仍可使用（云端部署）

电脑关机后，家里的服务会停。要把网站放到云端，才能随时用手机打开。

推荐用免费的 [Render](https://render.com)，大约 5–10 分钟。

## 步骤

### 1. 把代码放到 GitHub

1. 打开 https://github.com/new 新建一个仓库（可设为 Private）
2. 在本机项目目录执行（把 `你的用户名/仓库名` 换成你的）：

```bash
cd /home/luna/code/family-menu
git add .
git commit -m "家庭菜单云端部署"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

### 2. 在 Render 创建网站

1. 打开 https://dashboard.render.com 注册/登录（可用 GitHub 账号）
2. 点 **New +** → **Blueprint**
3. 选择刚才的 GitHub 仓库
4. Render 会读取项目里的 `render.yaml`，确认后点创建
5. 等待 Build 完成（几分钟）

### 3. 用手机打开

部署成功后，Render 会给出地址，例如：

`https://family-menu-xxxx.onrender.com`

把这个链接发给家人即可。  
**任意地点、任意手机、电脑关机都能用。**

## 注意

- 免费套餐若一段时间没人访问，服务会休眠；下次打开可能要等 30 秒左右醒来
- 电脑上的 `localhost` / 临时隧道链接，关机后都会失效，请改用上面的云端链接

## 需要我代操作时

把你的 **GitHub 仓库地址**发给我（或完成第 1 步后告诉我），我可以继续帮你核对部署配置。
