// 微信小程序 / H5 / 第三方系统 通用 API 客户端
// 建议在小程序端:
//   import { api } from '@/utils/api';
//   api.setBaseUrl('https://your-domain.com')

import type {
  Module,
  ChecklistItem,
  StartAuditInput,
  AuditAnswer,
  Report,
} from './types';

const DEFAULT_BASE = 'https://your-domain.com';

class ApiClient {
  baseUrl = DEFAULT_BASE;
  token: string | null = null;

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }
  setToken(t: string | null) {
    this.token = t;
  }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const r = await fetch(this.baseUrl + path, { ...init, headers });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`API ${path} failed ${r.status}: ${t}`);
    }
    return r.json() as Promise<T>;
  }

  // 微信小程序登录
  wechatMpLogin(code: string, isMini = true) {
    return this.req<{ userId: string; openid: string; token: string }>(
      '/api/wechat/mp-login',
      { method: 'POST', body: JSON.stringify({ code, isMini }) },
    );
  }

  // 模块
  listModules() {
    return this.req<{ modules: Module[] }>('/api/modules');
  }
  getModule(slug: string) {
    return this.req<{ module: Module; items: ChecklistItem[] }>(`/api/modules/${slug}`);
  }

  // 审核
  startAudit(input: StartAuditInput) {
    return this.req<{ runId: string }>('/api/audit', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
  submitAnswers(runId: string, answers: AuditAnswer[], complete = false) {
    return this.req<{ ok: boolean; reportId?: string; rating?: string }>(
      `/api/audit/${runId}`,
      { method: 'POST', body: JSON.stringify({ answers, complete }) },
    );
  }

  // 报告
  getReport(id: string) {
    return this.req<{ report: Report }>(`/api/reports/${id}`);
  }
  downloadReport(id: string) {
    return this.req<{ url: string }>(`/api/reports/${id}`, { method: 'POST' });
  }
}

export const api = new ApiClient();
