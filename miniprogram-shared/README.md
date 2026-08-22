# 微信小程序接入说明

## 1. 总体架构

```
┌──────────────────────┐         ┌──────────────────────┐
│  微信小程序 (Taro)   │  HTTP   │  Next.js SaaS 后端   │
│  同一份 TypeScript   │ <─────> │  /api/wechat/mp-login│
│  API 客户端          │         │  /api/modules        │
│  /api/audit          │         │  /api/reports        │
└──────────────────────┘         └──────────────────────┘
```

- **本目录**(`miniprogram-shared/`)是**类型 + API 客户端**共享层
- 业务页面(`pages/`, `components/`)由 `npx @tarojs/cli init` 生成的 Taro 项目承载

## 2. 初始化 Taro 项目

```bash
# 在本仓库外另起目录(避免与 web 代码冲突)
npx @tarojs/cli init compliance-mini
cd compliance-mini
# 把本目录的 api.ts 和 types.ts 复制过去
cp ../compliance-saas/miniprogram-shared/api.ts src/utils/api.ts
cp ../compliance-saas/miniprogram-shared/types.ts src/types.ts
```

## 3. 关键流程

### 3.1 登录
```ts
import Taro from '@tarojs/taro';
import { api } from '@/utils/api';

Taro.login({
  success: async (res) => {
    const data = await api.wechatMpLogin(res.code, true);
    Taro.setStorageSync('token', data.token);
    Taro.setStorageSync('userId', data.userId);
  },
});
```

### 3.2 列出模块
```ts
const { modules } = await api.listModules();
```

### 3.3 启动审核
```ts
const { runId } = await api.startAudit('labour', {
  revenueCents: 50_000_000,
  grossMargin: 0.4,
  headcount: 10,
  avgSalaryCents: 800_000,
  industryCode: 'general',
});
```

### 3.4 提交答案
```ts
await api.submitAnswers(runId, [
  { itemId: 'xxx', answer: { compliant: false, note: '未签书面合同 2 月' } },
]);
```

### 3.5 获取报告
```ts
const { report } = await api.getReport(reportId);
```

## 4. 部署到微信开发者工具

1. 在微信公众平台申请小程序, 拿到 AppID
2. 在 `.env` 中填入 `WECHAT_MINI_APP_ID` / `WECHAT_MINI_APP_SECRET`
3. 部署 SaaS 后端到 CloudBase, 配置**业务域名**白名单
4. `npm run build:weapp` → 用微信开发者工具打开 `dist/` → 上传发布

## 5. 复用本仓库的代码

`api.ts` 和 `types.ts` 直接是 TS 文件, 在 Taro 项目里 `import` 即可。
后续业务页面(审核 UI、报告 UI)可以独立开发, 也可以直接用 Taro 把本仓库 `src/components/modules/*` 跨端复用。
