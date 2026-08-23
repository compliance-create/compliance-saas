#!/usr/bin/env bash
# ============================================================
#  lighthouse.sh  -  腾讯云轻量应用服务器一键部署
#  适用: Ubuntu 22.04 LTS, 2C2G 起步
#  用法:  ssh root@<你的服务器IP>
#         curl -fsSL https://raw.githubusercontent.com/compliance-create/compliance-saas/main/deploy/lighthouse.sh | bash
#  或本地:  scp deploy/lighthouse.sh root@<IP>:/root/  然后 ssh 上去 bash /root/lighthouse.sh
# ============================================================
set -euo pipefail

# ---------- 0. 颜色 + 工具 ----------
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERR ]${NC} $*"; exit 1; }

# 检查 root
[ "$(id -u)" = 0 ] || err "请用 root 运行: sudo bash $0"

# ---------- 1. 收集配置 ----------
log "=== 1/8 收集配置 ==="
read -rp "GitHub 仓库 (默认: compliance-create/compliance-saas): " REPO
REPO=${REPO:-compliance-create/compliance-saas}

read -rp "部署分支 (默认: main): " BRANCH
BRANCH=${BRANCH:-main}

read -rp "应用目录 (默认: /opt/compliance-saas): " APP_DIR
APP_DIR=${APP_DIR:-/opt/compliance-saas}

# 生成随机密钥
NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d '\n')
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '\n' | tr '/' '_' | tr '+' '-')
log "已生成 NEXTAUTH_SECRET + DB_PASSWORD (随机 32/24 字节)"

# ---------- 2. 安装基础依赖 ----------
log "=== 2/8 安装 Node 20 + PostgreSQL + nginx + PM2 ==="
export DEBIAN_FRONTEND=noninteractive
apt update -y
apt install -y curl git postgresql postgresql-contrib nginx ufw

# Node 20
if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
log "Node: $(node -v)  npm: $(npm -v)"

# PM2
npm install -g pm2

# ---------- 3. 初始化 PostgreSQL ----------
log "=== 3/8 初始化 PostgreSQL ==="
# 启动并设开机自启
systemctl enable --now postgresql

# 创建数据库 + 用户
sudo -u postgres psql <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'compliance') THEN
    CREATE ROLE compliance WITH LOGIN PASSWORD '${DB_PASSWORD}';
  END IF;
END\$\$;

SELECT 'CREATE DATABASE compliance OWNER compliance'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'compliance')\gexec

GRANT ALL PRIVILEGES ON DATABASE compliance TO compliance;
\c compliance
GRANT ALL ON SCHEMA public TO compliance;
EOF
log "DB: compliance / user: compliance / pass: ${DB_PASSWORD:0:4}***"

# ---------- 4. 拉代码 ----------
log "=== 4/8 拉代码 ${REPO}@${BRANCH} ==="
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
else
  git clone "https://github.com/${REPO}.git" "$APP_DIR"
  cd "$APP_DIR"
  git checkout "$BRANCH"
fi
log "已拉取到 $APP_DIR"

# ---------- 5. 装依赖 + build ----------
log "=== 5/8 npm install + prisma generate + build (约 2-3 分钟) ==="
cd "$APP_DIR"
npm ci --no-audit --no-fund

# 写 .env (生产)
cat > .env <<EOF
NODE_ENV=production
NEXTAUTH_URL=https://REPLACE_WITH_YOUR_DOMAIN
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
DATABASE_URL=postgresql://compliance:${DB_PASSWORD}@localhost:5432/compliance?schema=public
NEXT_TELEMETRY_DISABLED=1
GLM_API_KEY=cd9ef97d59484acea9ca56cbb24b1fd9.cS7JJCRarTrWPQgk
GLM_MODEL=glm-4-flash
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4
LLM_PROVIDER=glm
PRICE_ANNUAL_CNY=99800
PRICE_CURRENCY=CNY
TRIAL_DAYS=7
WECHAT_PAY_NOTIFY_URL=https://REPLACE_WITH_YOUR_DOMAIN/api/wechat/pay/notify
EOF
warn "⚠️  .env 已生成, 但 NEXTAUTH_URL/WECHAT_PAY_NOTIFY_URL 是占位符, 拿到域名后要改"

# prisma 推 schema + 灌种子
npx prisma db push --skip-generate --accept-data-loss
npx tsx prisma/seed.ts

# build (standalone 模式, Docker 友好)
DOCKER_BUILD=1 npm run build

# 复制 standalone 必需资源
mkdir -p public/.next
cp -r .next/standalone/* . 2>/dev/null || true
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
cp -r public/* .next/standalone/public/ 2>/dev/null || true
cp -r prisma .next/standalone/ 2>/dev/null || true

# ---------- 6. PM2 启动 ----------
log "=== 6/8 PM2 守护进程 ==="
cd "$APP_DIR"
cat > ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: 'compliance-saas',
    script: './.next/standalone/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',
    },
    max_memory_restart: '500M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    time: true,
  }],
};
EOF
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
log "PM2 已启动, status:"
pm2 status

# ---------- 7. nginx 反代 ----------
log "=== 7/8 nginx 反向代理 ==="
cat > /etc/nginx/sites-available/compliance-saas <<'EOF'
server {
    listen 80;
    server_name REPLACE_WITH_YOUR_DOMAIN;

    client_max_body_size 10M;

    # 安全头
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header Referrer-Policy strict-origin-when-cross-origin;

    # 反代到 Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # 静态资源缓存
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
EOF
ln -sf /etc/nginx/sites-available/compliance-saas /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 防火墙
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable || true

# ---------- 8. 完成 ----------
log "=== 8/8 部署完成 ==="
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署成功! 接下来:${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "1. 拿到 ICP 备案域名后, 编辑 .env 把 NEXTAUTH_URL 改成 https://你的域名"
echo "2. 编辑 /etc/nginx/sites-available/compliance-saas 把 server_name 改成你的域名"
echo "3. 跑 certbot 装 SSL:"
echo "   apt install certbot python3-certbot-nginx -y"
echo "   certbot --nginx -d 你的域名"
echo "4. 重启 app:  pm2 restart compliance-saas"
echo ""
echo "测试访问: curl http://localhost:3000/api/auth/session"
echo ""
echo "管理员账号: demo@example.com / demo1234 (USER)"
echo "管理员账号: admin@example.com / admin1234 (SUPER_ADMIN)"
echo ""
echo "========================================"
echo "关键信息备份 (写到 /root/deploy-info.txt):"
echo "DB password:  $DB_PASSWORD" > /root/deploy-info.txt
echo "NEXTAUTH_SECRET:  $NEXTAUTH_SECRET" >> /root/deploy-info.txt
echo "App dir:  $APP_DIR" >> /root/deploy-info.txt
chmod 600 /root/deploy-info.txt
cat /root/deploy-info.txt | sed 's/=.*$/=***/'  # 显示时脱敏
