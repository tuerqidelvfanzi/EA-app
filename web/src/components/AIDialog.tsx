/**
 * AIDialog — AI 原生对话框（每页顶部复用）
 *
 * 设计依据（来自 [docs/requirements-draft/requirements-draft-v40-mvp-redesign.md]）：
 *   - "几乎每个页面顶部都有一个 AI 对话框"
 *   - "对话框根据菜单/系统的功能来做各种操作"
 *   - "操作通常基于浏览器插件"
 *   - "提示词输入框 + 大模型处理结果显示"
 *
 * 逻辑要点：
 *   1. 状态机：idle（空） → composing（输入中） → running（执行中） → result（结果）
 *   2. 子组件决定 prompt 模板和结果如何渲染（slot 模式）
 *   3. 历史记录：每次提交都进 messages 列表，可回滚查看
 *   4. 占位符按上下文不同（每页传 contextHint）
 *
 * 暂为本地 mock：调用方传入 onSubmit，组件本身不发请求，
 *   等待后端 Skill 接通后接入。
 */
import { useState } from 'react';
import { Card, Button, Badge } from './ui';

export type AIMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ts: number;
  status?: 'running' | 'done' | 'error';
};

type AIDialogProps = {
  /** 上下文提示（显示在占位符） */
  contextHint: string;
  /** 提交回调，返回 mock 文本即可 */
  onSubmit: (prompt: string) => Promise<string> | string;
  /** 预设按钮（常见操作） */
  presets?: { id: string; label: string; prompt: string }[];
  /** 顶部标签文案 */
  title?: string;
};

export function AIDialog({ contextHint, onSubmit, presets, title = '🤖 AI 操作台' }: AIDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [composing, setComposing] = useState(false);

  async function send(rawPrompt?: string) {
    const text = (rawPrompt ?? prompt).trim();
    if (!text) return;
    const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setComposing(true);
    setMessages((prev) => [
      ...prev,
      { id, role: 'user', text, ts: Date.now(), status: 'done' },
      { id: id + '-r', role: 'assistant', text: '', ts: Date.now(), status: 'running' },
    ]);
    setPrompt('');
    try {
      const result = await onSubmit(text);
      setMessages((prev) =>
        prev.map((m) => (m.id === id + '-r' ? { ...m, text: result, status: 'done' } : m)),
      );
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id + '-r' ? { ...m, text: `执行失败: ${(e as Error).message}`, status: 'error' } : m,
        ),
      );
    } finally {
      setComposing(false);
    }
  }

  function pickPreset(p: { id: string; label: string; prompt: string }) {
    send(p.prompt);
  }

  return (
    <Card className="border-2 border-[var(--color-primary)]/30 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30">
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="font-semibold text-sm">{title}</span>
          <Badge tone="ok">AI 原生</Badge>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            onClick={() => setMessages([])}
          >
            清空对话
          </button>
        )}
      </div>

      {/* 预设按钮 */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pickPreset(p)}
              disabled={composing}
              className="rounded-full bg-white border border-[var(--color-border)] px-3 py-1 text-xs hover:bg-[var(--color-primary-soft)] hover:border-[var(--color-primary)] disabled:opacity-50 transition"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* 输入区 */}
      <div className="flex gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={contextHint}
          rows={2}
          disabled={composing}
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-focus-ring)] disabled:opacity-60"
        />
        <Button onClick={() => send()} disabled={composing || !prompt.trim()}>
          {composing ? '执行中…' : '发送'}
        </Button>
      </div>
      <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
        提示: Cmd/Ctrl + Enter 发送 · 数据通过浏览器插件采集
      </p>

      {/* 对话历史 */}
      {messages.length > 0 && (
        <div className="mt-3 border-t border-[var(--color-border)] pt-3 space-y-2 max-h-72 overflow-y-auto">
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[80%] rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-fg)] px-3 py-2 text-sm">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-start">
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.status === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-[var(--color-muted)] text-[var(--color-text)]'
                  }`}
                >
                  {m.status === 'running' ? (
                    <span className="inline-flex items-center gap-1 text-[var(--color-text-muted)]">
                      <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                      AI 思考中…
                    </span>
                  ) : (
                    m.text || '（空响应）'
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </Card>
  );
}