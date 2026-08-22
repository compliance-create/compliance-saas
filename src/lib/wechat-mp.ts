// 微信小程序登录 / 公众号 OAuth
//
// jscode2session 流程: 小程序前端 wx.login() -> 拿到 code ->
// 后端用 code + AppID + AppSecret 换 openid / session_key
//
// 公众号扫码: 用户扫码 -> 微信回调 -> 拿到 code -> 同样换 openid

import crypto from 'node:crypto';

export async function code2Session(code: string, isMini = false) {
  const appId = isMini ? process.env.WECHAT_MINI_APP_ID : process.env.WECHAT_MP_APP_ID;
  const appSecret = isMini ? process.env.WECHAT_MINI_APP_SECRET : process.env.WECHAT_MP_APP_SECRET;
  if (!appId || !appSecret || appId.startsWith('mock')) {
    return mockCode2Session(code, isMini);
  }
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`wechat jscode2session http ${resp.status}`);
  const data = (await resp.json()) as {
    openid?: string;
    unionid?: string;
    session_key?: string;
    errcode?: number;
    errmsg?: string;
  };
  if (data.errcode) throw new Error(`wechat err: ${data.errcode} ${data.errmsg}`);
  return data as { openid: string; unionid?: string; session_key: string };
}

function mockCode2Session(code: string, isMini: boolean) {
  return {
    openid: `mock_openid_${isMini ? 'mini' : 'mp'}_${code}`,
    session_key: 'mock_session_key_' + crypto.randomBytes(8).toString('hex'),
    unionid: `mock_unionid_${code}`,
  };
}
