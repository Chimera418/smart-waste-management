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
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E2E0D5] pb-5">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14533C]">
            Citizen Support
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#141917]">Waste Assistant</h1>
          <p className="mt-1 text-sm text-[#5C6460]">
            Check live complaint statuses, submit new reports in plain English, or look up disposal rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={attachGps}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              coordinates
                ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]'
                : 'border-[#D5D2C6] bg-white text-[#141917] hover:bg-[#F5F4EF]'
            }`}
          >
            <LocateFixed className="h-3.5 w-3.5" />
            {coordinates ? `GPS (${coordinates[1]}, ${coordinates[0]})` : 'Attach GPS'}
          </button>
          <button
            type="button"
            onClick={clearHistory}
            className="civic-btn-secondary py-1.5 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5 text-[#B91C1C]" />
            Clear
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            className="rounded-md border border-[#D5D2C6] bg-white px-3 py-1.5 text-xs font-medium text-[#141917] transition hover:border-[#14533C] hover:bg-[#FAF9F6]"
          >
            {q}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2 text-xs text-[#991B1B]">
          {error}
        </div>
      )}

      <div className="civic-card flex h-[480px] flex-col overflow-hidden">
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {loadingHistory ? (
            <p className="text-sm text-[#5C6460]">Loading saved conversation...</p>
          ) : (
            messages.map((m, i) => (
              <div key={m._id || i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#14533C] text-white'
                      : 'border border-[#E2E0D5] bg-[#FAF9F6] text-[#141917]'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#14533C]">
                      <Bot className="h-3.5 w-3.5" /> CivicClean Assistant
                    </div>
                  )}
                  <div>{m.content}</div>

                  {m.actionType === 'complaint_created' && m.actionData?.complaint && (
                    <div className="mt-2.5 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] p-3 text-xs text-[#065F46]">
                      <div className="flex items-center justify-between gap-2 font-semibold">
                        <span className="flex items-center gap-1.5 font-mono">
                          <CheckCircle2 className="h-4 w-4 text-[#059669]" />
                          {m.actionData.complaint.complaintCode} Filed
                        </span>
                        <StatusBadge value={m.actionData.complaint.status} />
                      </div>
                      <p className="mt-1">
                        Category: <strong className="capitalize">{m.actionData.complaint.wasteCategory}</strong> ·{' '}
                        Priority: <strong className="uppercase">{m.actionData.complaint.priority}</strong>
                      </p>
                      <Link to="/complaints" className="mt-1.5 inline-block font-semibold text-[#14533C] hover:underline">
                        Track live in My Reports →
                      </Link>
                    </div>
                  )}

                  {m.actionType === 'status_lookup' && m.actionData?.complaints?.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      {m.actionData.complaints.map((c: any) => (
                        <div key={c._id} className="flex items-center justify-between gap-2 rounded-lg border border-[#E2E0D5] bg-white px-2.5 py-2 text-xs">
                          <div>
                            <span className="font-mono font-semibold text-[#14533C]">{c.complaintCode}</span>{' '}
                            <span className="text-[#141917]">{c.title}</span>
                          </div>
                          <StatusBadge value={c.status} />
                        </div>
                      ))}
                      <Link to="/complaints" className="inline-block text-xs font-semibold text-[#14533C] hover:underline">
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
              <div className="rounded-xl border border-[#E2E0D5] bg-[#FAF9F6] px-4 py-2.5 text-xs text-[#5C6460]">
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
          className="flex gap-2 border-t border-[#E2E0D5] bg-[#FAF9F6] p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask status, submit a report (include street address), or ask disposal advice..."
            className="civic-input flex-1"
          />
          <button type="submit" disabled={sending} className="civic-btn-primary px-4">
            <Send className="h-4 w-4" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
