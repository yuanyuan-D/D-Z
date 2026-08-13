# 小董和小赵的备婚计划（网页版）

基于《2027年5月婚礼 · 完整备婚方案》的网页项目。  
微信小程序版仍保留在：`/home/luna/code/wedding-plan-miniprogram`

## 功能

- 总览 / 任务 / 采购 / 减重打卡 / 预算 / 须知
- **多设备云端同步**（同 family-menu）：手机、平板、其他电脑打开同一链接即可；**家里电脑关机也能用**
- 勾选自动保存 + 手动保存；关闭前提示

## 日常使用（推荐）

1. 按 **[DEPLOY.md](./DEPLOY.md)** 在 Supabase 执行一次 `supabase/schema.sql`
2. 打开线上地址（部署后）：  
   **https://yuanyuan-D.github.io/D-Z/wedding/**
3. 双方用同一链接；顶部显示「云端已同步」即可互相看见改动

手机说明见 **[README-手机端.md](./README-手机端.md)**。

## 本地调试（可选）

云端就绪后，本地也可直接用静态服务；备用同步端口为 **5180**（避开 family-menu 的 5173 / 3001）：

```bash
cd /home/luna/code/wedding-plan-web
python3 server.py
```

- 电脑：http://127.0.0.1:5180

## 自定义

- 婚礼日期：编辑 `js/app.js` 中的 `WEDDING_DATE`
- 方案默认模板：编辑 `js/plan.js`（运行后的修改保存在云端共享数据里）
- 云端密钥：`js/cloud-config.js`（与 family-menu 同一 Supabase 项目，表名 `wedding_plan`）
