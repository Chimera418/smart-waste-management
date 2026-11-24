import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, Send, Trash2 } from 'lucide-react';
import api from '../services/api';

interface Message {
  _id?: string;
  role: 'user' | 'assistant';
  content: string;
  modelUsed?: string;
  fallbackUsed?: boolean;
}

const WELCOME_MESSAGE: Message = {
  role: 'assistant',
  content:
    'Hello! I am the CivicClean Waste Assistant powered by Google Gemini. Ask me about waste categories, safe disposal rules, or how to register and track a complaint.'
};

const QUICK_PROMPTS = [
  'What waste categories do you support?',
  'How should I dispose of hazardous batteries or chemicals?',
  'Walk me through submitting a waste complaint.'
];

export function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api
      .get('/ai/chat/history')
      .then((res) => {
        const saved: Message[] = res.data.data || [];
        setMessages(saved.length > 0 ? saved : [WELCOME_MESSAGE]);
      })
      .catch(() => {
        setMessages([WELCOME_MESSAGE]);
      })
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError('');
    const nextMessages: Message[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    try {
      const res = await api.post('/ai/chat', {
        message: trimmed,
        history: nextMessages.slice(-6).map((m) => ({ role: m.role, content: m.content }))
      });
      const data = res.data.data;
      setMessages([
        ...nextMessages,
        {
          _id: data.assistantMessage?._id,
          role: 'assistant',
          content: data.reply,
          modelUsed: data.modelUsed,
          fallbackUsed: data.fallbackUsed
        }
      ]);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Sorry, I could not reach the assistant right now.');
    } finally {
      setSending(false);
    }
  };

  const clearHistory = async () => {
    await api.delete('/ai/chat/history');
    setMessages([WELCOME_MESSAGE]);
    setError('');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Citizen Waste Assistant</h1>
          <p className="text-sm text-slate-600">
            Gemini-powered conversational guide. Chat history persists across refreshes.
          </p>
        </div>
        <button
          type="button"
          onClick={clearHistory}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Trash2 className="h-3.5 w-3.5 text-rose-600" />
          Clear Chat
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => sendMessage(q)}
            className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-100"
          >
            {q}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="flex h-[480px] flex-col rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {loadingHistory ? (
            <p className="text-sm text-slate-500">Loading saved conversation...</p>
          ) : (
            messages.map((m, idx) => (
              <div
                key={m._id || idx}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-teal-600 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-800'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-semibold text-teal-700">
                      <span className="flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5" />
                        CivicClean Assistant
                      </span>
                      {m.modelUsed && (
                        <span className="font-normal text-slate-400">
                          {m.fallbackUsed ? 'fallback' : m.modelUsed}
                        </span>
                      )}
                    </div>
                  )}
                  {m.content}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
                Thinking with Gemini...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-200 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about e-waste, organic composting, or tracking..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
