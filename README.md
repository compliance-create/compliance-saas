# 合规 SaaS · 小微企业劳动合规与合同审核平台

> 基于《行业分析方法论》(DCF + 自由现金流 + 折现率) 量化呈现合规风险对小微企业营收/利润的影响。
> 
> 把"违法了会罚多少"的传统视角, 升级为"合规缺失每年让我少赚多少"的老板语言。

## 🎯 目标用户
- **小微企业**(员工 < 50)
- **个体工商户**

## ✨ 已实现能力
- ✅ 账号体系: 邮箱密码 + 微信开放平台扫码 + 微信小程序一键登录
- ✅ 订阅/计费: 按年订阅(¥998/年), 包年含劳动+合同两个模块
- ✅ 微信支付 V3 (mock + 真实双模式)
- ✅ 劳动合规模块: **12 章 79 项** 审核点(基于《劳动法》《劳动合同法》)
- ✅ 合同审核模块: **14 章 100+ 项** 审核点(基于《民法典》《民事诉讼法》)
- ✅ **行业方法论量化引擎**: 13 条内置公式, 把每项风险折算为"年化现金流损失 / 占营收比 / 占净利比"
- ✅ **自动文档生成**: docx 高管摘要(可下载, 含法律依据 + 量化影响 + 签字栏)
- ✅ **CMS 后台**: 模块管理 / 用户管理 / 订阅管理 / 行业方法论知识库
- ✅ **预留扩展接口**: 税法/数据合规/知识产权等模块已设计好, 加一个文件夹即可
- ✅ **微信小程序对接包**: `miniprogram-shared/api.ts` 通用 API 客户端

## 📁 目录结构

```
compliance-saas/
├── prisma/
│   ├── schema.prisma         # 数据模型 (User/Subscription/Module/ChecklistItem/AuditRun/Report/...)
│   └── seed.ts               # 写入演示数据(79 劳动 + 118 合同 + 4 CMS)
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── page.tsx          # 营销首页
│   │   ├── (marketing)/      # pricing, about (方法论)
│   │   ├── (auth)/           # login, register
│   │   ├── (dashboard)/      # 用户控制台
│   │   │   ├── page.tsx              # 概览
│   │   │   ├── modules/              # 模块列表 + 详情
│   │   │   ├── audit/[id]/           # 审核流程
│   │   │   ├── report/[id]/          # 报告查看 + 下载
│   │   │   ├── documents/            # 我的文档
│   │   │   ├── billing/              # 订阅与账单
│   │   │   └── settings/             # 设置
│   │   ├── (admin)/          # 后台 CMS
│   │   └── api/              # 全部 REST API
│   ├── components/
│   │   ├── layout/           # 通用布局
│   │   └── modules/          # 审核相关组件
│   ├── lib/
│   │   ├── prisma.ts         # Prisma 单例
│   │   ├── auth.ts           # NextAuth v5 配置
│   │   ├── impact-engine.ts  # ⭐ 行业方法论量化引擎核心
│   │   ├── wechat-pay.ts     # 微信支付 V3
│   │   ├── wechat-mp.ts      # 微信小程序/公众号 OAuth
│   │   ├── doc-generator.ts  # docx 生成器
│   │   ├── modules/          # 模块抽象 + 注册中心
│   │   └── data/             # 劳动/合同/方法论 种子数据
│   └── types/
├── content/
│   └── modules/              # (预留)模块化 JSON 内容
├── miniprogram-shared/       # 微信小程序共享 API 客户端
├── cloudbaserc.json          # 腾讯云开发部署配置
├── Dockerfile                # 自有服务器部署
└── README.md
```

## 🚀 快速开始

### 1. 环境要求
- Node.js ≥ 18.18 (推荐 20 LTS)
- npm 或 pnpm

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env: 至少填好 NEXTAUTH_SECRET (openssl rand -base64 32)
```

### 4. 初始化数据库 + 写入种子数据
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

种子会写入:
- 3 个模块(劳动/合同/未来税法)
- **79 项**劳动审核点 + **118 项**合同审核点
- 4 个行业方法论 CMS 页面
- 演示用户: `demo@example.com / demo1234`
- 管理员: `admin@example.com / admin1234`

### 5. 启动开发服务器
```bash
npm run dev
# 访问 http://localhost:3000
```

### 6. 生产构建
```bash
npm run build
npm start
```

## 💳 微信支付配置(生产)

> 开发模式下, 点击"立即支付"会自动激活订阅(mock 模式), 无需真实商户号。

生产环境需要:
1. 注册**微信支付商户号**: https://pay.weixin.qq.com
2. 在商户平台下载 API 证书, 保存到 `certs/` 目录
3. 在 `.env` 填入:
   ```
   WECHAT_PAY_MCH_ID=your-merchant-id
   WECHAT_PAY_API_V3_KEY=your-32-char-key
   WECHAT_PAY_CERT_PATH=./certs/apiclient_cert.pem
   WECHAT_PAY_KEY_PATH=./certs/apiclient_key.pem
   WECHAT_PAY_NOTIFY_URL=https://your-domain.com/api/wechat/pay/notify
   ```
4. 实现 `src/lib/wechat-pay.ts` 中 `createWechatOrder()` 的 `// 真实生产实现` 部分(已留好结构)

## 📱 微信小程序对接

1. 在微信公众平台申请小程序, 拿到 AppID + AppSecret
2. 填入 `.env`:
   ```
   WECHAT_MINI_APP_ID=wx...
   WECHAT_MINI_APP_SECRET=...
   ```
3. 另起一个 Taro 项目:
   ```bash
   npx @tarojs/cli init compliance-mini
   ```
4. 复制 `miniprogram-shared/api.ts` 和 `types.ts` 到 Taro 项目
5. 业务页面(审核 UI、报告 UI)用 Taro 重写, 直接调用 `api.ts` 的方法

详见 `miniprogram-shared/README.md`。

## 🧩 扩展新模块(如税法)

要加一个"税务合规"模块, 只需要:

1. **写数据** `src/lib/data/tax-items.ts`:
   ```ts
   import type { ChecklistItemSeed } from '../modules/base';
   export const taxItems: ChecklistItemSeed[] = [
     { chapter: '1', chapterTitle: '...', orderIndex: 1, title: '...', ... },
     ...
   ];
   ```

2. **写量化规则** `src/lib/impact-engine.ts`:
   ```ts
   export const taxImpactRules: ImpactRule[] = [
     { key: 'vat_underdeclared', module: 'tax', description: '...', formula: '...',
       compute: ({ assumption, answer }) => ({ impactCents: ..., narrative: '...' }) },
   ];
   ```
   然后在 `impactRegistry` 注册:
   ```ts
   export const impactRegistry = [
     ...labourImpactRules, ...contractImpactRules, ...taxImpactRules,
   ].reduce(...);
   ```

3. **注册模块** `src/lib/modules/registry.ts`:
   ```ts
   { slug: 'tax', name: '税务合规', enabled: true, ... }
   ```

4. **写入数据库**:
   ```bash
   npx tsx prisma/seed.ts  # 自动写入
   ```

5. **老用户升级**: 由于订阅 `includedModulesJson` 是数组, 给老用户追加即可:
   ```sql
   UPDATE Subscription SET includedModulesJson = json_insert(includedModulesJson, '$[#]', 'tax')
   WHERE status = 'ACTIVE';
   ```

## 📊 行业方法论落地说明

核心公式(来自 `src/lib/impact-engine.ts`):

```
企业价值 V = Σ (D_t / (1 + r)^t)         # DCF
净产出 D = 资金产出 - 资金占用
折现率 r = 9% (平均) / 6% (弱者)
```

合规风险 → 现金流的折算思路:

| 场景 | 折算公式 |
|---|---|
| 未签书面合同 | 月薪 × 未签月数 × 涉及员工数 × 2 |
| 加班未足额付 | 月均加班 h × 时薪 × 50% × 12 个月 |
| 违法解除 | 月薪 × 工龄 × 2N |
| 合同条款过弱 | 合同金额 × 实际损失率 × 差额 |
| 时效过期 | 应收余额 × 失效率 |

每个审核点的 `impactKey` 关联一条公式, 用户回答时录入数字字段(影响人数/金额/比率),
引擎即时计算并展示在报告里。

## ☁️ 部署到腾讯云开发 (CloudBase)

```bash
# 1. 安装 CLI
npm i -g @cloudbase/cli
tcb login

# 2. 编辑 cloudbaserc.json, 填入你的 envId
# 3. 一键部署
npm run deploy:cloudbase
```

CloudBase 自动:
- 构建 Next.js
- 部署到云函数 + 云托管
- 开通云数据库 PostgreSQL
- 申请/校验域名 SSL

数据库连接串会自动注入到 `DATABASE_URL`。

## 🛠️ 维护 & 升级

- **更新审核清单**: 直接修改 `src/lib/data/labour-items.ts` / `contract-items.ts`,
  跑 `npm run db:seed` 覆盖(开发环境)。生产环境请用 Prisma Migrate 增量。
- **CMS 编辑**: 进入 `admin/cms` 后台, 可直接编辑方法论页面
- **审核清单版本化**: `ModuleVersion` 表已经预留, 每次发布新版本时写入 changelog

## 📜 法律声明

本平台提供的审核清单与量化分析系通用工具, **不构成个案法律意见**。
高风险条款或重大交易, 应由执业律师出具专项法律意见。

## 📞 联系

天津金诺律师事务所 · 协办律师: 梅海军、何钇杉
核稿: Mavis
