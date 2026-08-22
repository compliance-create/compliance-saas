# Vercel 部署手册

> 把本地 `localhost:3000` 的合规 SaaS 部署到公网, 让其他人通过 https 链接访问。预计总耗时 15-30 分钟。

---

## 0. 总体流程

```
┌─────────────────────────┐
│ 1. 准备 GitHub 仓库      │   (源码托管)
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│ 2. Vercel 创建项目      │   (绑定 GitHub repo)
│    + 开通 Vercel Postgres │   (内置 Postgres, 免费 Hobby 256MB)
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│ 3. 配置环境变量          │   (在 Vercel Dashboard)
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│ 4. 触发首次部署          │   (git push)
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│ 5. 跑数据库迁移 + 种子   │   (一次性)
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│ 6. 验证部署结果          │
└─────────────────────────┘
```

---

## 1. 准备 GitHub 仓库

### 1.1 在 GitHub 网站创建空仓库
- 打开 https://github.com/new
- 仓库名: `compliance-saas` (或你喜欢的名字)
- 选 **Private** (合规 SaaS 涉及业务)
- **不要**勾选 Add README / .gitignore / license (本地已有)

### 1.2 把本地项目推上去

本机没装 git, 需要先装: https://git-scm.com/download/win (装好重启 PowerShell)

```powershell
cd C:\Users\Administrator\.minimax-agent-cn\projects\compliance-saas
git init
git add .
git commit -m "feat: initial commit - compliance SaaS MVP"
git branch -M main
git remote add origin https://github.com/<你的用户名>/compliance-saas.git
git push -u origin main
```

> 提示: `.gitignore` 已就位, 不会把 `node_modules`、`.env`、`dev.db` 推上去。

---

## 2. Vercel 创建项目

### 2.1 注册 / 登录
- 打开 https://vercel.com/signup
- 选 "Continue with GitHub"

### 2.2 导入仓库
- 打开 https://vercel.com/new
- 找到 `compliance-saas` 仓库, 点 "Import"

### 2.3 配置项目
- **Project Name**: `compliance-saas` (或自定义, 会成为子域名前缀)
- **Framework Preset**: 自动识别为 Next.js
- **Root Directory**: `./` (默认)
- **Build Command**: 留空 (用 package.json 里的 `prisma generate && next build`)
- **Install Command**: 留空 (默认 `npm install`)
- **Output Directory**: 留空 (默认 `.next`)
- **Region**: 选 `Singapore (sin1)` (国内访问快)

先别点 Deploy, 先去开 Postgres。

---

## 3. 开通 Vercel Postgres (Hobby 免费)

### 3.1 在项目页
- 顶部切到 **Storage** Tab
- 点 **Create Database** → 选 **Postgres** → **Continue**
- Database Name: `compliance-db`
- Region: `Singapore` (跟项目一致, 减少跨区延迟)
- Plan: **Hobby** (免费, 256MB 够 MVP 跑一年)

### 3.2 获取连接串
- 创建后会自动注入到项目的环境变量, 名字是 `POSTGRES_PRISMA_URL` 或 `POSTGRES_URL`
- 也可以在 Storage 页面点 "Show secret" 看完整连接串

---

## 4. 配置环境变量

Vercel 项目页 → **Settings** → **Environment Variables** → 逐条添加 (全选 Production/Preview/Development):

| Key | Value | 说明 |
|-----|-------|------|
| `DATABASE_URL` | (从 Step 3.2 复制) | Postgres 连接串, `postgresql://...` 开头 |
| `NEXTAUTH_URL` | `https://compliance-saas.vercel.app` | **用你 Vercel 分配的实际域名** |
| `NEXTAUTH_SECRET` | (用 `openssl rand -base64 32` 生成) | 32 字节随机字符串 |
| `NEXT_TELEMETRY_DISABLED` | `1` | 关掉 Vercel 遥测 |
| `GLM_API_KEY` | `cd9ef...` (你的智谱 key) | LLM 必需 |
| `GLM_MODEL` | `glm-4-flash` | |
| `GLM_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4` | |
| `LLM_PROVIDER` | `glm` | |
| `PRICE_ANNUAL_CNY` | `99800` | 订阅价格 (分) |
| `TRIAL_DAYS` | `7` | 试用天数 |
| `PRICE_CURRENCY` | `CNY` | |

> **微信支付**相关变量 (`WECHAT_PAY_*`) 先不填, 留到正式接入支付时再配。
> Vercel 会自动注入 `POSTGRES_PRISMA_URL` / `POSTGRES_URL`, 但我们代码用 `DATABASE_URL`, 所以手动复制一份过来。

---

## 5. 触发首次部署

回到项目 **Deployments** Tab, 第一次 push 之后 Vercel 应该已经自动开始部署了。

如果没有, 点右上 **Deploy** → 选 main 分支。

部署会跑:
1. `npm install` (装依赖)
2. `prisma generate` (生成 client)
3. `next build` (编译)

> ⏱ 首次约 3-5 分钟。

**常见报错**:
- `Error validating datasource db: the URL must start with postgresql://` → `DATABASE_URL` 没设对, 回去检查 Step 4
- `Can't reach database server` → Vercel Postgres 还没创建, 或区域不一致

---

## 6. 跑数据库迁移 + 种子数据

部署成功后, 数据库还是空的。需要手动推 schema + 灌种子数据。

### 6.1 在 Vercel 用一次性脚本
**Vercel Dashboard** → 项目 → **Settings** → **Functions** → 找到 "Build & Development Settings" → **Override** Install Command, 临时改成:

```
npm install && npx prisma db push --accept-data-loss && npx tsx prisma/seed.ts
```

> ⚠️ **注意**: 种子脚本会插入演示数据 (79 项劳动合规 + 100+ 项合同 + demo/admin 账号), 跑完一次后**改回** `npm install`, 不然每次部署都重复灌。

### 6.2 触发一次新部署
到 **Deployments** → 点最新一次 → 右上 "..." → "Redeploy", 会跑改后的 install command。

### 6.3 验证种子
部署完打开 `https://你的域名.vercel.app/login`, 用 `demo@example.com` / `demo1234` 登录。
进入 `/dashboard` 应该能看到 "劳动用工合规" "合同审核" 两个模块, 各 79 / 100+ 项。

---

## 7. 绑定自定义域名 (可选)

Vercel 项目 → **Settings** → **Domains** → 输入 `your-domain.com` → 按提示加 CNAME 记录到 `cname.vercel-dns.com`。

生效后记得改:
- `NEXTAUTH_URL` → `https://your-domain.com`
- 微信支付回调 URL (如果接了支付)

---

## 8. 维护更新流程

之后改代码:
```powershell
git add .
git commit -m "feat: xxx"
git push
```
Vercel 自动检测 push, 跑 build, 1-2 分钟出新版本。
Preview Deployment (PR 触发) 和 Production (main 触发) 是分开的, 不会影响线上。

---

## 9. 费用预估 (Hobby 免费额度)

| 项目 | 额度 | 实际用量 (MVP) |
|------|------|---------------|
| Vercel 部署 | 100 GB 流量/月 | < 1 GB |
| Vercel Postgres Hobby | 256 MB 存储 + 60 小时计算 | 用到 50 MB 一年 |
| Serverless Function | 100 GB-小时 | < 5 GB-小时 |
| LLM 调用 (智谱) | 按 token 计费 | 取决于使用量, Flash 模型 ¥0.001/千 token |

100 个付费用户以内基本零成本, 微信支付接入后开始有营收。

---

## 10. 常见问题

**Q: 国内访问 Vercel 慢怎么办?**
A: 用 Vercel 的香港/新加坡 region (`sin1`/`hkg1`), 已优化过. 如果还不够快, 切到 CloudBase 部署 (见 `cloudbaserc.json`).

**Q: SQLite 还能用吗?**
A: 本地开发可以, 把 `prisma/schema.prisma` 改回 `provider = "sqlite"`, `DATABASE_URL=file:./prisma/dev.db`. 但 Vercel 部署必须用 Postgres.

**Q: 数据库能迁回吗?**
A: 可以, 用 `prisma migrate diff` 从 Postgres 导出 SQL, 然后 `prisma db push` 到 SQLite (仅字段, 不带数据).

**Q: 怎么查看线上日志?**
A: Vercel 项目 → **Logs** Tab, 实时显示 Serverless Function 输出.

**Q: 怎么加监控?**
A: 装 Sentry: `npm i @sentry/nextjs`, 改 `next.config.mjs` 加 withSentryConfig.
