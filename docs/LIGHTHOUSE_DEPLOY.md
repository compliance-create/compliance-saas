# 腾讯云轻量服务器部署手册

> 不用 Vercel, 不用 CloudBase, 直接一台 24 元/月的 VPS 跑全套 Next.js + PostgreSQL + AI, 国内访问飞快。

---

## 0. 整体流程

```
┌────────────────────────────────────┐
│ 1. 买轻量服务器 (10 分钟)          │   腾讯云 Lighthouse 2C2G
└──────────┬─────────────────────────┘
           ↓
┌────────────────────────────────────┐
│ 2. 注册域名 + ICP 备案 (1-7 天)     │   国内域名必须备案, 否则 80/443 端口会被封
└──────────┬─────────────────────────┘
           ↓
┌────────────────────────────────────┐
│ 3. ssh 上服务器, 跑一键脚本 (10 分钟) │
└──────────┬─────────────────────────┘
           ↓
┌────────────────────────────────────┐
│ 4. 域名解析 + 装 SSL (15 分钟)      │   certbot 一键 Let's Encrypt
└──────────┬─────────────────────────┘
           ↓
┌────────────────────────────────────┐
│ 5. 验证 + 微信支付回调 URL 调整 (5 分钟)│
└────────────────────────────────────┘
```

---

## 1. 买轻量应用服务器

### 1.1 选配置

打开 https://console.cloud.tencent.com/lighthouse/instance/create

| 选项 | 推荐值 | 备注 |
|------|--------|------|
| 地域 | **上海 / 广州 / 北京** | 看你的目标用户在哪 |
| 镜像 | **Ubuntu 22.04 LTS** | 不要选 CentOS, apt 更方便 |
| 实例规格 | **2C2G 50G SSD** | 24 元/月, 跑 MVP 够用 |
| 带宽 | **5 Mbps** | 100 用户内够, 不够再升 |
| 流量包 | **500GB/月** | 超出按 0.8 元/GB |
| 购买时长 | 至少 1 年 | ICP 备案要求境内服务器 ≥ 3 个月 |

### 1.2 安全组
- 放通 22 (ssh), 80 (http), 443 (https)
- 关掉其他所有

### 1.3 重置密码
- 控制台 → 实例 → **重置密码** (root 用户)
- 记下公网 IP: `123.123.123.123` (举例)

---

## 2. 域名注册 + ICP 备案

### 2.1 域名注册
- 国内: 腾讯云 https://dnspod.cloud.tencent.com/ , 阿里云 https://wanwang.aliyun.com/
- 推荐: `your-saas.com` / `your-saas.cn` (.cn 便宜)
- 不要用国外注册商 (解析慢, 备案麻烦)

### 2.2 ICP 备案 (必须!)
打开 https://console.cloud.tencent.com/beian
- 选 "腾讯云代备案系统"
- 填主体信息 (个人/企业)
- 填网站信息 (域名, 服务器 IP 选刚买的轻量)
- 提交初审 → 上传资料 → 管局审核 (3-7 个工作日)
- 期间域名解析必须指向这台轻量服务器 IP (可以先 http 测, https 等备案通过)

> ⚠️ **不备案**: 域名能解析到 IP, 但 80/443 端口会被运营商封, 用户只能 IP+端口访问, 体验极差且违法。

---

## 3. 跑一键部署脚本

### 3.1 ssh 登录服务器
```bash
ssh root@123.123.123.123
# 第一次连接会问 yes/no, 输入 yes
# 然后输密码
```

### 3.2 拉脚本并执行
```bash
curl -fsSL https://raw.githubusercontent.com/compliance-create/compliance-saas/main/deploy/lighthouse.sh -o lighthouse.sh
bash lighthouse.sh
```

脚本会交互式问 3 个问题, 直接回车用默认值:
- GitHub 仓库: `compliance-create/compliance-saas`
- 部署分支: `main`
- 应用目录: `/opt/compliance-saas`

### 3.3 跑完会输出
```
[21:45:00] === 8/8 部署完成 ===
========================================
  部署成功! 接下来:
========================================
1. 拿到 ICP 备案域名后, 编辑 .env 把 NEXTAUTH_URL 改成 https://你的域名
2. 编辑 /etc/nginx/sites-available/compliance-saas 把 server_name 改成你的域名
3. 跑 certbot 装 SSL:
   apt install certbot python3-certbot-nginx -y
   certbot --nginx -d 你的域名
4. 重启 app:  pm2 restart compliance-saas
```

### 3.4 验证跑起来
```bash
# 看进程
pm2 status
# 看日志
pm2 logs compliance-saas --lines 50
# curl 测试
curl http://localhost:3000/api/auth/session
# 应该返回 {"user":null} 这种
```

---

## 4. 域名解析 + SSL

### 4.1 域名解析到服务器 IP
腾讯云 DNSPod (https://console.dnspod.cn/dns/list):
- 主机记录: `@` 和 `www`
- 记录类型: `A`
- 记录值: `123.123.123.123`
- TTL: 600

等 1-5 分钟生效, `ping your-saas.com` 应该返回你的服务器 IP。

### 4.2 装 SSL (Let's Encrypt 免费)
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-saas.com -d www.your-saas.com
```
按提示输邮箱 + 同意条款。会自动改 nginx 配置 + 申请证书 + 配 301 跳转 https。

### 4.3 改 .env
```bash
cd /opt/compliance-saas
nano .env
```
把这两行的 `REPLACE_WITH_YOUR_DOMAIN` 改成 `your-saas.com`:
```
NEXTAUTH_URL=https://your-saas.com
WECHAT_PAY_NOTIFY_URL=https://your-saas.com/api/wechat/pay/notify
```

### 4.4 改 nginx server_name
```bash
sed -i 's/REPLACE_WITH_YOUR_DOMAIN/your-saas.com/g' /etc/nginx/sites-available/compliance-saas
nginx -t && systemctl reload nginx
```

### 4.5 重启 app
```bash
pm2 restart compliance-saas
```

### 4.6 测试
打开浏览器 → `https://your-saas.com` → 看到登录页, 用 `demo@example.com` / `demo1234` 登录。

---

## 5. 微信支付回调 URL (接支付时再做)

只有当用户真的开始订阅付费, 才需要改这个:

1. 打开 `https://your-saas.com/admin` (admin@example.com / admin1234)
2. 微信公众号后台 → 微信支付商户平台 → 产品中心 → 开发配置 → **支付回调 URL**:
   ```
   https://your-saas.com/api/wechat/pay/notify
   ```
3. 把 V3 证书 `apiclient_cert.pem` / `apiclient_key.pem` 放到服务器的 `/opt/compliance-saas/certs/`
4. 在 `.env` 加:
   ```
   WECHAT_PAY_MCH_ID=1234567890
   WECHAT_PAY_API_V3_KEY=32位的APIv3密钥
   WECHAT_PAY_CERT_PATH=./certs/apiclient_cert.pem
   WECHAT_PAY_KEY_PATH=./certs/apiclient_key.pem
   ```
5. `pm2 restart compliance-saas`

详细见 `docs/WECHAT_PAY_SETUP.md`。

---

## 6. 日常维护

### 6.1 更新代码
```bash
ssh root@123.123.123.123
cd /opt/compliance-saas
git pull origin main
npm ci
npx prisma db push --accept-data-loss
DOCKER_BUILD=1 npm run build
cp -r .next/standalone/* .
pm2 restart compliance-saas
```

可以写成一个 `deploy/update.sh` 简化:

```bash
cat > /opt/compliance-saas/deploy/update.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
APP_DIR=/opt/compliance-saas
cd $APP_DIR
git pull origin main
npm ci --no-audit --no-fund
npx prisma db push --accept-data-loss --skip-generate
DOCKER_BUILD=1 npm run build
cp -r .next/standalone/* .
pm2 restart compliance-saas
echo "[$(date)] updated"
EOF
chmod +x /opt/compliance-saas/deploy/update.sh
```

以后更新一行命令: `bash /opt/compliance-saas/deploy/update.sh`

### 6.2 数据库每日备份
```bash
# 装 cron
apt install cron -y
# 每天凌晨 3 点备份
echo "0 3 * * * root /opt/compliance-saas/deploy/backup-db.sh" > /etc/cron.d/compliance-backup
chmod +x /opt/compliance-saas/deploy/backup-db.sh
systemctl enable --now cron
```
备份文件在 `/var/backups/compliance/`, 保留 7 天, 想远程保留就 scp 到 OSS。

### 6.3 看日志
```bash
pm2 logs compliance-saas --lines 100   # app 日志
tail -f /var/log/nginx/access.log        # nginx 访问日志
tail -f /var/log/nginx/error.log         # nginx 错误日志
```

### 6.4 看资源
```bash
htop                # 进程
df -h               # 磁盘
free -h             # 内存
nethogs             # 流量 (装: apt install nethogs -y)
```

---

## 7. 性能调优 (用户多了再做)

### 7.1 加 swap
2G 内存编译 Next.js 可能 OOM, 加 2G swap:
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 7.2 PostgreSQL 调优
```bash
nano /etc/postgresql/14/main/postgresql.conf
```
关键参数 (2G 内存机器):
```
shared_buffers = 512MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 128MB
```
然后 `systemctl restart postgresql`

### 7.3 CDN 加速静态资源
把 `/_next/static/` 和 `/docs/generated/` 走腾讯云 CDN:
- 控制台 → CDN → 添加域名
- 回源到轻量服务器 IP
- 缓存规则: `*.js,*.css,*.woff2` 缓存 30 天

### 7.4 数据库迁移到托管 (100+ 用户时)
- 轻量上的 PG 是单机版, 性能有限
- 迁移到 腾讯云 PostgreSQL (TencentDB), ~50元/月起
- 把 `DATABASE_URL` 改成腾讯云内网地址

---

## 8. 费用清单 (MVP 阶段)

| 项目 | 月费 | 年费 |
|------|------|------|
| 轻量 2C2G | ¥24 | ¥264 |
| 域名 (.com) | - | ¥70/年 |
| ICP 备案 | 免费 | 免费 |
| SSL | 免费 | 免费 |
| 流量 (500GB 内) | 包含 | 包含 |
| **合计** | **~¥24/月** | **~¥330/年** |
| 微信支付费率 | 0.6%/笔 | - |
| 智谱 GLM-4-Flash | ~¥0.001/千 token | - |

100 个付费用户前, 月成本 < 50 元。100 个付费用户后, 营收 ¥99,800/年, 净利 99%。

---

## 9. 常见问题

**Q: 没备案能先用 IP 访问吗?**
A: 可以, `http://123.123.123.123:3000` 直接访问。但生产环境必须备案。

**Q: PM2 进程挂了自动重启?**
A: 是的, PM2 默认崩溃自动拉起。`pm2 resurrect` 开机自启。

**Q: 数据库挂了?**
A: `systemctl restart postgresql`。看日志 `journalctl -u postgresql -n 50`。

**Q: 服务器重启?**
A: `pm2 resurrect` (恢复 PM2 进程列表), `systemctl start nginx postgresql`。

**Q: 怎么监控报警?**
A: 简单方案: 写个 cron 每 5 分钟 curl `/api/auth/session`, 失败发邮件/短信。
生产方案: 装 node_exporter + Prometheus + Grafana, 或用腾讯云自带的云监控。

**Q: 微信小程序怎么调这个 API?**
A: `miniprogram-shared/api.ts` 里的 `API_BASE` 改成 `https://your-saas.com`, 微信开发者工具里勾选 "不校验合法域名" (开发期) 或在小程序后台加 `request 合法域名: your-saas.com`。
