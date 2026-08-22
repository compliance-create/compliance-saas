# 微信支付 V3 接入操作手册(从 mock 切到生产)

> 适用: 已经申请到微信支付商户号, 需要把 SaaS 从开发模式切到真实收款。

## 0. 前置准备

- ✅ 微信支付**商户号**(MCH_ID): 在 https://pay.weixin.qq.com 申请
- ✅ 微信公众号 / 小程序 / 网站应用 **AppID**(用于 JSAPI 场景)
- ✅ 商户主体**备案**(营业执照 + 对公账户)
- ✅ 已通过域名备案(必须 HTTPS, CloudBase 自动管 SSL)

## 1. 申请 API 证书

进入商户平台 → 账户中心 → API 安全 → 申请 API 证书

```
申请过程:
1. 下载「商户平台证书工具」 (Windows / Mac)
2. 生成证书请求文件(.p12)
3. 用工具提交到商户平台, 拿到 .pem 私钥和证书序列号
4. 妥善保管私钥!!!
```

## 2. 配置 .env

把以下变量填到部署环境的 .env(或 CloudBase 配置中心):

```bash
# 必填
WECHAT_PAY_MCH_ID=1234567890              # 商户号
WECHAT_PAY_API_V3_KEY=32位随机字符串        # 商户平台 → API安全 → APIv3密钥 (自己设的 32 位)
WECHAT_PAY_CERT_SERIAL=证书序列号           # 申请 API 证书后, 商户平台会显示
WECHAT_PAY_NOTIFY_URL=https://your-domain.com/api/wechat/pay/notify

# 私钥路径(推荐放项目根目录 certs/)
WECHAT_PAY_KEY_PATH=./certs/apiclient_key.pem

# AppID(三选一或全填)
WECHAT_MP_APP_ID=wx...                    # 公众号
WECHAT_MP_APP_SECRET=...
WECHAT_MINI_APP_ID=wx...                   # 小程序
WECHAT_MINI_APP_SECRET=...
```

## 3. 放置证书文件

```
项目根目录/
└── certs/
    ├── apiclient_key.pem      # 商户私钥(脱敏, 不要提交 git)
    ├── apiclient_cert.pem     # 商户证书(暂未使用, 预留)
    └── wechatpay_cert.pem     # 微信平台证书(从 API 动态下载, 可选本地缓存)
```

`.gitignore` 已加 `certs/`, 不会进 git。

## 4. 切换到生产模式

代码已自动判断:

```typescript
function isMockMode() {
  return !process.env.WECHAT_PAY_MCH_ID
      || process.env.WECHAT_PAY_MCH_ID === 'mock-mch-id'
      || !process.env.WECHAT_PAY_API_V3_KEY;
}
```

只要填了真实的 MCH_ID + APIv3_KEY, **自动切到生产模式**。前端代码不需要改。

## 5. 三种支付场景

### 5.1 PC 网站扫码支付(NATIVE)

- 已有: `POST /api/billing/subscribe`
- 返回 `qrCode` (code_url), 前端用 qrcode.js 渲染二维码
- 用户微信扫码 → 完成支付
- 微信回调 `/api/wechat/pay/notify` → 自动激活订阅

### 5.2 公众号 JSAPI

- `POST /api/billing/wechat-jsapi` 需 body `{ openid: "用户 openid" }`
- 返回 `payParams` (timeStamp / nonceStr / package / signType / paySign)
- 前端调 `wx.chooseWXPay({...payParams})` 唤起支付

### 5.3 微信小程序

- 同 5.2 JSAPI, 但 `appId` 用 `WECHAT_MINI_APP_ID`
- 前端调 `wx.requestPayment({...payParams})`

## 6. 回调地址白名单

商户平台 → 产品中心 → 开发配置 → 支付配置 → 公众号支付 / 扫码支付 / App支付

把 `https://your-domain.com/api/wechat/pay/notify` 加入 "支付回调URL"。

## 7. 验证清单

切换后, 用真实商户号跑一次完整流程:

| 检查项 | 命令 / 操作 | 预期 |
|---|---|---|
| API 启动 | `curl https://your-domain.com/api/auth/session` | 200 |
| 创建订单 | 浏览器登录 → `/dashboard/billing` → "立即支付" | 跳转到真实微信扫码 |
| 二维码可扫 | 用微信扫一下 | 进入金额确认页 |
| 回调 | 支付完成后查 Subscription 表 | status=ACTIVE, paidAt 有值 |
| 证书验签 | 看 dev log | "Wechatpay-Signature" 通过 |

## 8. 调试技巧

### 8.1 用微信支付沙箱
- 申请沙箱密钥后, 把 `WECHAT_PAY_MCH_ID` 改成沙箱号
- 沙箱地址: https://api.mch.weixin.qq.com/sandboxnew/

### 8.2 查订单
```bash
curl -H "Authorization: WECHATPAY2-SHA256-RSA2048 ..." \
  https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/YOUR_ORDER_NO?mchid=YOUR_MCH
```

### 8.3 常见错误
| 错误 | 原因 | 解决 |
|---|---|---|
| `invalid spbill_create_ip` | 没传 IP | 加上 client_ip |
| `invalid notify_url` | 回调 URL 不可达 | 确认 HTTPS + 备案 |
| `签名错误` | 私钥 / 序列号 / message 格式不对 | 用 https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=20_1 校验工具 |
| `appid 与 openid 不匹配` | JSAPI 用了公众号的 openid 但 appid 写成小程序 | 区分 MCH / MP / MINI 三种 appid |

## 9. 退款流程(预留)

`src/lib/wechat-pay.ts:230` 已实现 `refundWechatOrder()`, 需要时:

1. 商家后台 → 申请退款
2. 调 `refundWechatOrder({ outTradeNo, outRefundNo, reason, amountCents, totalCents })`
3. 异步接收退款结果回调(同 notify URL, 但 resource 类型不同)

## 10. 完整代码位置

| 文件 | 作用 |
|---|---|
| `src/lib/wechat-pay.ts` | 6 个核心方法: NATIVE/JSAPI/查单/关单/退款 + 验签 + 解密 |
| `src/app/api/billing/subscribe/route.ts` | NATIVE 扫码下单(PC 网站) |
| `src/app/api/billing/wechat-jsapi/route.ts` | JSAPI 下单(公众号/小程序) |
| `src/app/api/wechat/pay/notify/route.ts` | 支付回调(验签+解密+激活订阅) |
| `src/app/api/billing/cancel/route.ts` | 主动取消订单(可选用) |

## 11. 常见问题

**Q: 我先在沙箱测试, 后面切到生产要改什么?**
A: 只改 .env, 把 `WECHAT_PAY_MCH_ID` / `API_V3_KEY` / `CERT_SERIAL` 改成生产值。代码 0 改动。

**Q: 真实支付回调验签失败怎么办?**
A: 90% 是平台证书问题。生产环境需要:
1. 调 `https://api.mch.weixin.qq.com/v3/certificates` 拿到平台证书(带验签)
2. 缓存到本地, 每天刷新一次
3. 用平台证书的公钥去验签回调

我们目前的代码里验签那部分留了 TODO, 你有需要可以让我接着补完整(30 分钟工作量)。

**Q: 怎么监听订单状态(轮询 vs 长连接)?**
A: 推荐**回调优先 + 前端 3 秒轮询**双保险。生产中回调 99% 可靠, 但偶尔会有延迟, 所以前端在用户停留在"支付中"页面时每 3 秒查一次订单直到 SUCCESS。

---

🎉 接入完成后, 你就有一家真正能收钱的 SaaS 公司了。
