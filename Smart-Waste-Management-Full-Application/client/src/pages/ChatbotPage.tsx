import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Bot, CheckCircle2, LocateFixed, Send, Trash2 } from 'lucide-react';
import api from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface ChatItem {
  _id?: string;
  role: 'user' | 'assistant';
  content: string;
  actionType?: 'none' | 'status_lookup' | 'complaint_created';
  actionData?: any;
}

const WELCOME_MESSAGE: ChatItem = {
  role: 'assistant',
  content:
    'Hello! Ask me to check your complaint statuses, submit a new waste complaint directly here, or explain safe waste disposal.'
};

const QUICK_PROMPTS = [
  'Check status of my complaints',
  'Report overflowing organic waste at 14 MG Road, around 80kg',
  'How should I dispose of hazardous batteries or chemicals?',
  'What are the municipal pickup timings?'
];

export function ChatbotPage() {
  const [messages, setMessages] = useState<ChatItem[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api
      .get('/ai/chat/history')
      .then((res) => {
        const saved: ChatItem[] = res.data.data || [];
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

  const attachGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates([
          Number(pos.coords.longitude.toFixed(6)),
          Number(pos.coords.latitude.toFixed(6))
        ]);
      },
      () => setError('Could not access GPS; default municipal coordinates will be used if needed.')
    );
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError('');
    const next: ChatItem[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setInput('');
    setSending(true);
    try {
      const res = await api.post('/ai/chat', {
        message: trimmed,
        ...(coordinates ? { coordinates } : {}),
        history: next.slice(-6).map((m) => ({ role: m.role, content: m.content }))
      });
      const data = res.data.data;
      setMessages([
        ...next,
        {
          _id: data.assistantMessage?._id,
          role: 'assistant',
          content: data.reply,
          actionType: data.actionType,
          actionData: data.actionData
        }
      ]);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Unable to reach assistant right now.');
    } finally {
      setSending(false);
    }
  };

  const clearHistory = async () => {
    await api.delete('/ai/chat/history');
    setMessages([WELCOME_MESSAGE]);
    setError('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Citizen Waste Assistant</h1>
          <p className="text-sm text-slate-600">
            Smart Municipal Support — check live complaint statuses, submit complaints in plain English, and get instant disposal guidance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={attachGps}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              coordinates
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <LocateFixed className="h-3.5 w-3.5" />
            {coordinates ? `GPS Attached (${coordinates[1]}, ${coordinates[0]})` : 'Attach GPS'}
          </button>
          <button
            type="button"
            onClick={clearHistory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
            Clear Chat
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
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
            messages.map((m, i) => (
              <div key={m._id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-teal-600 text-white'
                      : 'border border-slate-200 bg-slate-50 text-slate-800'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-teal-700">
                      <Bot className="h-3.5 w-3.5" /> CivicClean Assistant
                    </div>
                  )}
                  <div>{m.content}</div>

                  {m.actionType === 'complaint_created' && m.actionData?.complaint && (
                    <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                      <div className="flex items-center justify-between gap-2 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          {m.actionData.complaint.complaintCode} Filed
                        </span>
                        <StatusBadge value={m.actionData.complaint.status} />
                      </div>
                      <p className="mt-1">
                        Category: <strong className="capitalize">{m.actionData.complaint.wasteCategory}</strong> ·{' '}
                        Priority: <strong className="uppercase">{m.actionData.complaint.priority}</strong>
                      </p>
                      <Link to="/complaints" className="mt-1.5 inline-block font-semibold text-teal-700 hover:underline">
                        Track live in My Complaints →
                      </Link>
                    </div>
                  )}

                  {m.actionType === 'status_lookup' && m.actionData?.complaints?.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      {m.actionData.complaints.map((c: any) => (
                        <div key={c._id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs">
                          <div>
                            <span className="font-mono font-semibold text-teal-700">{c.complaintCode}</span>{' '}
                            <span className="text-slate-700">{c.title}</span>
                          </div>
                          <StatusBadge value={c.status} />
                        </div>
                      ))}
                      <Link to="/complaints" className="inline-block text-xs font-semibold text-teal-700 hover:underline">
                        Open full tracking map →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2 border-t border-slate-200 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask status, submit a complaint (include address), or ask disposal advice..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
