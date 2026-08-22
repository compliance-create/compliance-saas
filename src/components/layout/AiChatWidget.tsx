'use client';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, History, Plus, Trash2, BookOpen, ExternalLink } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string; ts: number };
type Conv = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
};

// 提取 assistant 消息中的法条引用
// 支持以下格式, 统一转成【法律-第xx条】chip:
//   1) 【xxx-第xx条】 - 标准方括号引用
//   2) 《xxx-第xx条》 - 圆括号连号式
//   3) 《xxx》第xx条   - 散文式 (法名+条号分属两段)
function extractCitations(text: string): string[] {
  const out = new Set<string>();
  // 1) 【xxx-第xx条】
  for (const m of text.match(/【([^】]+-第[一二三四五六七八九十百零0-9]+条)】/g) ?? []) {
    out.add(m.slice(1, -1));
  }
  // 2) 《xxx-第xx条》
  for (const m of text.match(/《([^》]+-第[一二三四五六七八九十百零0-9]+条)》/g) ?? []) {
    out.add(m.slice(1, -1));
  }
  // 3) 《xxx》第xx条
  for (const m of text.matchAll(/《([^》]+)》第([一二三四五六七八九十百零0-9]+)条/g)) {
    out.add(`${m[1]}-第${m[2]}条`);
  }
  return Array.from(out);
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content: '你好! 我是 合规 AI 助手, 可以帮你解答劳动 / 合同 / 税务相关问题。',
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // 打开时拉历史
  useEffect(() => {
    if (open) loadHistory();
  }, [open]);

  // 监听外部 "打开并预填" 事件
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ prefill: string }>;
      setOpen(true);
      setView('chat');
      setInput(custom.detail.prefill);
    };
    window.addEventListener('ai-chat:open-and-fill', handler);
    return () => window.removeEventListener('ai-chat:open-and-fill', handler);
  }, []);

  async function loadHistory() {
    try {
      const r = await fetch('/api/ai/chat/list');
      const j = await r.json();
      if (j.conversations) setConversations(j.conversations);
    } catch {
      // ignore
    }
  }

  async function loadConversation(id: string) {
    setView('chat');
    setActiveConvId(id);
    try {
      const r = await fetch(`/api/ai/chat/${id}`);
      const j = await r.json();
      if (j.conversation?.messages) {
        setMessages(
          j.conversation.messages.map((m: { role: string; content: string; createdAt: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            ts: new Date(m.createdAt).getTime(),
          })),
        );
      }
    } catch {
      // ignore
    }
  }

  function newChat() {
    setActiveConvId(null);
    setMessages([
      {
        role: 'assistant',
        content: '你好! 我是 合规 AI 助手, 可以帮你解答劳动 / 合同 / 税务相关问题。',
        ts: Date.now(),
      },
    ]);
    setView('chat');
  }

  async function deleteConv(id: string) {
    if (!confirm('确定删除此对话?')) return;
    await fetch(`/api/ai/chat/${id}`, { method: 'DELETE' });
    loadHistory();
    if (activeConvId === id) newChat();
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: Msg = { role: 'user', content: text, ts: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    try {
      const history = messages.slice(-9).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          conversationId: activeConvId,
          history,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: `⚠️ ${j.error ?? 'AI 暂时不可用'}`, ts: Date.now() },
        ]);
      } else {
        if (j.conversationId && !activeConvId) {
          setActiveConvId(j.conversationId);
        }
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: j.text, ts: Date.now() },
        ]);
        loadHistory(); // 刷新列表(updatedAt 变了)
      }
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `⚠️ 网络错误: ${e instanceof Error ? e.message : '请重试'}`,
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg hover:scale-105 transition"
          aria-label="打开 AI 助手"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[600px] w-[420px] flex-col rounded-lg border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between rounded-t-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">合规 AI 助手</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setView(view === 'chat' ? 'history' : 'chat')}
                className="rounded p-1 hover:bg-white/20"
                aria-label="历史"
                title="历史对话"
              >
                <History className="h-4 w-4" />
              </button>
              <button
                onClick={newChat}
                className="rounded p-1 hover:bg-white/20"
                aria-label="新对话"
                title="新对话"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/20">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {view === 'history' ? (
            <div className="flex-1 overflow-y-auto p-2">
              <div className="mb-2 px-2 text-xs text-slate-500">最近 50 条对话</div>
              {conversations.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-slate-400">还没有对话</p>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className="group flex items-start gap-2 rounded-md px-2 py-2 hover:bg-slate-100"
                  >
                    <button
                      onClick={() => loadConversation(c.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="truncate text-sm font-medium">{c.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <span>{new Date(c.updatedAt).toLocaleString('zh-CN', { hour12: false })}</span>
                        {c._count && <span>{c._count.messages} 条</span>}
                      </div>
                    </button>
                    <button
                      onClick={() => deleteConv(c.id)}
                      className="rounded p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-500"
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((m, i) => {
                  const citations = m.role === 'assistant' ? extractCitations(m.content) : [];
                  return (
                    <div key={i}>
                      <div
                        className={
                          m.role === 'user'
                            ? 'ml-auto max-w-[85%] rounded-lg bg-brand-600 px-3 py-2 text-sm text-white'
                            : 'mr-auto max-w-[85%] rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800 whitespace-pre-wrap'
                        }
                      >
                        {m.content}
                      </div>
                      {citations.length > 0 && (
                        <div className="mr-auto mt-1 max-w-[85%] flex flex-wrap gap-1">
                          <span className="text-[10px] text-slate-400">引用:</span>
                          {citations.map((c) => (
                            <a
                              key={c}
                              href={`/about?law=${encodeURIComponent(c)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] text-violet-700 hover:bg-violet-100"
                              title={c}
                            >
                              <BookOpen className="h-2.5 w-2.5" />
                              {c.length > 14 ? c.slice(0, 14) + '…' : c}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {loading && (
                  <div className="mr-auto flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    思考中...
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    className="input min-h-[60px] resize-none"
                    placeholder="问点什么, 例如: 员工加班费怎么算?"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <button
                    onClick={send}
                    disabled={!input.trim() || loading}
                    className="btn-primary h-[60px] w-12 flex-shrink-0"
                    aria-label="发送"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1 text-right text-[10px] text-slate-400">
                  Enter 发送 · Shift+Enter 换行
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
