# 推送到 GitHub - 步骤清单

> 仓库已经本地 commit 好（2 个 commit, 103 文件, 21,427 行），现在只要推上去就能 Vercel 部署。

---

## 整体流程

```
┌──────────────────────────────────────┐
│  1. GitHub 上创建空仓库 (1 分钟)      │
└──────────┬───────────────────────────┘
           ↓
┌──────────────────────────────────────┐
│  2. 生成 GitHub PAT (2 分钟)         │
└──────────┬───────────────────────────┘
           ↓
┌──────────────────────────────────────┐
│  3. 跑 push-to-github.ps1 (1 分钟)   │
└──────────┬───────────────────────────┘
           ↓
┌──────────────────────────────────────┐
│  4. Vercel 导入仓库 + 部署 (5 分钟)   │
└──────────────────────────────────────┘
```

---

## Step 1: GitHub 创建空仓库

1. 打开 https://github.com/new
2. **Repository name**: `compliance-saas`
3. **Visibility**: 选 `Private` (业务代码)
4. **⚠️ 不要勾选**:
   - ☐ Add a README file
   - ☐ Add .gitignore
   - ☐ Choose a license
5. 点 **Create repository**
6. 看到 "Quick setup" 页面就行, 不要复制下面的命令 (本地已经准备好了)

---

## Step 2: 生成 Personal Access Token (PAT)

GitHub 2021 年 8 月后已经不支持账号密码推送, 必须用 PAT。

1. 打开 https://github.com/settings/tokens
2. 点 **Generate new token** → **Generate new token (classic)**
3. 填表:
   - **Note**: `compliance-saas-deploy` (随便起)
   - **Expiration**: `90 days` (或 No expiration, 看自己)
   - **Scopes**: **只勾选 `repo`** (其他都不要)
4. 点 **Generate token**
5. **⚠️ 立即复制 `ghp_xxxxxxxxxxxxxxxxx`** (只显示一次, 关掉就找不到了)

---

## Step 3: 跑推送脚本

### 方式 A: 双击脚本 (推荐)

1. 打开文件资源管理器
2. 找到 `C:\Users\Administrator\.minimax-agent-cn\projects\compliance-saas\push-to-github.ps1`
3. **右键** → **"使用 PowerShell 运行"**
4. 按提示输入:
   - GitHub 用户名
   - PAT (粘贴)
5. 等 30-60 秒, 看到 `✓ 推送成功!` 就完事了

### 方式 B: 手动命令

```powershell
# 1. 打开 PowerShell, 切到项目
cd C:\Users\Administrator\.minimax-agent-cn\projects\compliance-saas

# 2. 加 remote
git remote add origin https://github.com/<你的用户名>/compliance-saas.git

# 3. 用 PAT 推送 (会弹窗让你输, 直接粘贴 PAT 当密码)
git push -u origin main
```

> ⚠️ 推的时候用户输入框出现, **Username** 填 GitHub 用户名, **Password** 填 PAT (不是账号密码)。

---

## Step 4: Vercel 部署

推完就能在 Vercel 部署, 详细步骤看 `docs/VERCEL_DEPLOY.md`。简版:

1. https://vercel.com/new → 选刚推的 `compliance-saas` 仓库 → Import
2. **Storage** Tab → Create Database → Postgres → Singapore → Hobby
3. **Settings** → **Environment Variables**, 至少加这 5 个:
   ```
   DATABASE_URL         = (复制 POSTGRES_PRISMA_URL 的值)
   NEXTAUTH_SECRET      = (openssl rand -base64 32)
   NEXTAUTH_URL         = https://compliance-saas.vercel.app
   GLM_API_KEY          = (你的智谱 key)
   LLM_PROVIDER         = glm
   ```
4. **Deployments** → 第一次会失败 (DB 还是空的), 点 "..." → **Redeploy**
5. 跑种子: 临时改 Install Command 为 `npm install && npx prisma db push --accept-data-loss && npx tsx prisma/seed.ts`, 再 Redeploy 一次
6. 完事, 打开 `https://compliance-saas.vercel.app`, 用 `demo@example.com` / `demo1234` 登录

---

## 常见问题

**Q: 推送报 403 / Authentication failed?**
A: PAT 没勾 `repo` 权限, 重新生成。

**Q: 推送报 "Repository not found"?**
A: GitHub 上还没创建 `compliance-saas` 仓库, 回去 Step 1。

**Q: 推送报 "Could not resolve host github.com"?**
A: 网络问题, 国内偶尔推不上去:
- 重试几次
- 或在 `C:\Windows\System32\drivers\etc\hosts` 加 `140.82.112.3 github.com`
- 或开代理 `git config --global http.proxy http://127.0.0.1:7890`

**Q: 想换 GitHub 账号?**
A: 编辑 `C:\Users\Administrator\.git-credentials`, 删掉旧 token 那行, 重新跑脚本。

**Q: 推送后 Vercel 还是找不到仓库?**
A: Vercel → Settings → Git → 点 "Disconnect" 再 "Connect Git Repository" 重连。
