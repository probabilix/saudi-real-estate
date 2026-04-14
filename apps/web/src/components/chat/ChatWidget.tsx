'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, X, MessageSquare } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatWidgetProps {
  floating?: boolean;
  onProfileExtracted?: (profile: Record<string, unknown>) => void;
}

const WELCOME_DELAY = 800;

export default function ChatWidget({ floating = false, onProfileExtracted }: ChatWidgetProps) {
  const t = useTranslations('chat');
  const locale = useLocale();
  const [open, setOpen] = useState(!floating);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show welcome message
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([
        {
          role: 'assistant',
          content: t('welcome'),
          timestamp: new Date(),
        },
      ]);
    }, WELCOME_DELAY);
    return () => clearTimeout(timer);
  }, [t]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  // Focus input when opened (Only for User-triggered floating chat)
  useEffect(() => {
    if (open && floating) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, floating]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Mock AI response for now
    await new Promise((r) => setTimeout(r, 1200));

    const responses = locale === 'ar' ? [
      'شكراً! ما هي المدينة التي تفضلها؟ الرياض أم جدة أم الدمام؟',
      'ممتاز! وما هو نوع العقار الذي تبحث عنه؟ شقة، فيلا، أو أرض؟',
      'رائع! وما هو غرضك من الشراء؟ للسكن الخاص أم للاستثمار؟',
      'شكراً على المعلومات. سأبحث لك عن أفضل العقارات المناسبة الآن...',
    ] : [
      'Great! Which city are you interested in? Riyadh, Jeddah, or Dammam?',
      'Perfect! What type of property are you looking for? Apartment, Villa, or Land?',
      'Excellent! Is this for your own use, investment, or rental income?',
      'Thanks for sharing. Let me find the best matching properties for you...',
    ];

    const randomResp = responses[Math.floor(Math.random() * responses.length)];

    const aiMsg: Message = {
      role: 'assistant',
      content: randomResp,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const chatContent = (
    <div
      className={`flex flex-col bg-white dark:bg-charcoal overflow-hidden ${floating ? 'h-full' : 'flex-1'}`}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-surface-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center border border-primary-100">
            <Sparkles className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-charcoal">{t('title')}</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Online Assistant</span>
            </div>
          </div>
        </div>
        {floating && (
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg text-charcoal-muted hover:bg-surface-50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6 scroll-smooth bg-white">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === 'assistant'
                    ? 'bg-primary-600 text-white'
                    : 'bg-surface-100 text-charcoal-muted'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <Bot className="w-4 h-4" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed shadow-sm rounded-2xl ${
                  msg.role === 'assistant'
                    ? 'bg-surface-50 text-charcoal border border-surface-100'
                    : 'bg-primary-600 text-white'
                } ${locale === 'ar' ? 'font-arabic' : 'font-medium'}`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-surface-50 border border-surface-100 px-4 py-3 rounded-2xl flex gap-1 items-center">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-5 border-t border-surface-100 bg-white">
        <div className="flex gap-2 p-1.5 bg-surface-50 border border-surface-200 rounded-2xl focus-within:border-primary-500/50 transition-all">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            disabled={loading}
            className={`flex-1 bg-transparent px-3 py-2 text-sm text-charcoal placeholder-charcoal-muted outline-none disabled:opacity-50 ${locale === 'ar' ? 'font-arabic text-right' : ''}`}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="w-10 h-10 bg-primary-600 flex items-center justify-center rounded-xl shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all disabled:opacity-40 disabled:scale-95 shrink-0"
          >
            <Send className={`w-4 h-4 text-white ${locale === 'ar' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );

  if (floating) {
    return (
      <>
        <AnimatePresence>
          {!open && (
            <motion.button
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 20 }}
              onClick={() => setOpen(true)}
              className="fixed bottom-6 end-6 w-16 h-16 bg-primary-600 text-white rounded-2xl shadow-2xl z-50 flex items-center justify-center hover:bg-primary-700 hover:scale-105 active:scale-95 transition-all group"
            >
              <MessageSquare className="w-7 h-7 group-hover:rotate-12 transition-transform" />
              <div className="absolute -top-1 -end-1 w-4 h-4 bg-accent-500 rounded-full border-2 border-white animate-pulse" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-6 end-6 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-8rem)] rounded-3xl overflow-hidden z-50 border border-surface-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col"
            >
              {chatContent}
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="rounded-3xl overflow-hidden border border-surface-100 shadow-xl bg-white h-full flex flex-col">
      {chatContent}
    </div>
  );
}
