# 多设备云端同步（电脑关机也能用）

参照 `family-menu`：用 **Supabase 实时库 + GitHub Pages 静态站**。  
不依赖家里电脑，也不占用 family-menu 的端口（5173 / 3001）。本地备用端口为 **5180**。

---

## 一、创建云端表（必须做一次）

与 family-menu **共用同一 Supabase 项目**，表名 `wedding_plan`，互不冲突。

1. 打开 https://supabase.com/dashboard 登录（与 D-Z / family-menu 同一项目）
2. 进入 **SQL Editor** → New query
3. 把本仓库 `supabase/schema.sql` **整段粘贴并 Run**
4. 刷新网页；顶部应显示 **「云端已同步」**（不再提示「待建云端表」）

---

## 二、发布到 GitHub Pages（推荐）

已与 family-menu 同一站点共存，访问地址：

**https://yuanyuan-D.github.io/D-Z/wedding/**

把本项目静态文件同步进 family-menu 仓库的 `docs/wedding/` 后推送即可：

```bash
rsync -a --delete \
  --exclude .git --exclude shared-data.json --exclude '__pycache__' \
  --exclude '*.pyc' --exclude server.py \
  /home/luna/code/wedding-plan-web/ \
  /home/luna/code/family-menu/docs/wedding/

cd /home/luna/code/family-menu
git add docs/wedding
git commit -m "Publish wedding plan static site under docs/wedding"
git push
```

也可单独建仓库，Settings → Pages → Deploy from branch（`/docs` 或 `gh-pages`）。本项目为纯静态文件，**无需 npm build**。

---

## 三、手机 / iPad / 其他电脑怎么用

1. 两部设备都打开同一个链接：`https://yuanyuan-D.github.io/D-Z/wedding/`
2. 勾选任务、采购、减重会自动保存并实时同步
3. **家里电脑可以关机**；只要手机能上网即可

---

## 四、本地开发（可选，电脑需开机）

仅本机调试时：

```bash
cd /home/luna/code/wedding-plan-web
python3 server.py
```

- 本机：http://127.0.0.1:5180  
- 不与 family-menu 的 5173 / 3001 冲突  
- 有云端配置时优先走 Supabase；云端不可用才回落到 `./api/sync`

---

## 端口一览

| 用途 | 端口 |
| --- | --- |
| family-menu Vite | 5173 |
| family-menu API/WS | 3001 |
| 备婚计划本地备用 | **5180** |
