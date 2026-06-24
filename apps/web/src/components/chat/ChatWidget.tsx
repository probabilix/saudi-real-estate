'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, X, MessageSquare, Lock, LogIn } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Helper to parse and render markdown links as clickable React anchors
function renderMessageContent(content: string, role: 'user' | 'assistant') {
  const linkRegex = /\[([^\]]+)\]\s*\((https?:\/\/[^\s)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const [, label, url] = match;
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      parts.push(content.substring(lastIndex, matchIndex));
    }

    parts.push(
      <a
        key={matchIndex}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={
          role === 'assistant'
            ? "text-primary-600 hover:text-primary-700 underline font-bold transition-colors"
            : "text-white underline font-bold hover:opacity-90 transition-opacity"
        }
      >
        {label}
      </a>
    );

    lastIndex = linkRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

interface ChatWidgetProps {
  floating?: boolean;
  showBubble?: boolean;
  mode?: 'general' | 'qualification' | 'project_qualification';
  context?: Record<string, unknown>; // For listing/project details
  onQualified?: () => void;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

const WELCOME_DELAY = 800;

export default function ChatWidget({ 
  floating = false, 
  showBubble = true,
  mode = 'general', 
  context, 
  onQualified,
  open: controlledOpen,
  setOpen: controlledSetOpen
}: ChatWidgetProps) {
  const t = useTranslations('chat');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  
  const [internalOpen, setInternalOpen] = useState(!floating);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledSetOpen ?? setInternalOpen;

  const { isAuthenticated } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = '38px'; // Reset to default line height
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; // Auto-grow to fits scroll height (capped at 120px)
  };

  // Show welcome message if there is no persistent history loaded
  useEffect(() => {
    if (messages.length === 0) {
      const timer = setTimeout(() => {
        setMessages([
          {
            role: 'assistant',
            content: (mode === 'qualification' || mode === 'project_qualification')
              ? (locale === 'ar' ? 'مرحباً! أنا مساعدك العقاري. هل ترغب في معرفة المزيد عن هذا العقار؟' : 'Hello! I am your real estate assistant. Would you like to know more about this property?')
              : (locale === 'ar' ? 'مرحباً! أنا مساعدك في منصة تمليك. كيف يمكنني مساعدتك في استكشاف العقارات أو الإجابة على استفساراتك؟' : 'Welcome! I am your Tamleeq assistant. How can I help you explore properties or answer questions about our platform?'),
            timestamp: new Date(),
          },
        ]);
      }, WELCOME_DELAY);
      return () => clearTimeout(timer);
    }
  }, [t, mode, locale, messages.length]);

  // Load chat history if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      async function loadHistory() {
        try {
          const projectId = context?.projectId as string | undefined;
          const listingId = context?.id as string | undefined;
          const res = await api.getChatHistory(projectId, listingId);
          if (res.success && res.data && Array.isArray(res.data.history)) {
            if (res.data.history.length > 0) {
              setMessages(res.data.history.map((m: { role: string; content: string; timestamp: string }) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
                timestamp: new Date(m.timestamp)
              })));
            } else {
              // Reset to welcome message if no context-specific history exists
              setMessages([
                {
                  role: 'assistant',
                  content: (mode === 'qualification' || mode === 'project_qualification')
                    ? (locale === 'ar' ? 'مرحباً! أنا مساعدك العقاري. هل ترغب في معرفة المزيد عن هذا العقار؟' : 'Hello! I am your real estate assistant. Would you like to know more about this property?')
                    : (locale === 'ar' ? 'مرحباً! أنا مساعدك في منصة تمليك. كيف يمكنني مساعدتك في استكشاف العقارات أو الإجابة على استفساراتك؟' : 'Welcome! I am your Tamleeq assistant. How can I help you explore properties or answer questions about our platform?'),
                  timestamp: new Date(),
                },
              ]);
            }
          }
        } catch (err) {
          console.error('Failed to load persistent chat history:', err);
        }
      }
      loadHistory();
    }
  }, [isAuthenticated, context?.projectId, context?.id, mode, locale]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = '38px';
    }
    setLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      const res = await api.chatProxy({
        mode,
        message: userMsg.content,
        history,
        locale,
        context: context ? context : undefined
      });

      if (!res.success) throw new Error(res.error || 'Failed to connect to AI');

      const data = res.data;
      let aiContent = typeof data === 'string' ? data : (data.output || data.message || data.text || '...');

      // Check for redirection flag
      const redirectMatch = aiContent.match(/REDIRECT_TO_LISTING:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
        || aiContent.match(/REDIRECT_TO_LISTING:(SRE-[A-Z0-9]{6})/i);
      
      let targetRedirectId = '';
      if (redirectMatch) {
        targetRedirectId = redirectMatch[1];
        aiContent = aiContent.replace(/REDIRECT_TO_LISTING:[^\s]+/i, '').trim();
      }

      // Check for qualification success flag in the response
      if ((mode === 'qualification' || mode === 'project_qualification') && (aiContent.includes('QUALIFIED_SUCCESS') || data.qualified === true)) {
        onQualified?.();
      }

      const aiMsg: Message = {
        role: 'assistant',
        content: aiContent.replace('QUALIFIED_SUCCESS', '').trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Trigger automatic client-side redirection to targeted unit details
      if (targetRedirectId) {
        setTimeout(() => {
          router.push(`/${locale}/listings/${targetRedirectId}?ai=true`);
        }, 1500);
      }
    } catch (err) {
      const error = err as Error;
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message || 'Something went wrong'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const chatContent = !isAuthenticated ? (
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
            <h3 className="text-sm font-bold text-charcoal">
              {(mode === 'qualification' || mode === 'project_qualification')
                ? (locale === 'ar' ? 'مساعد العقارات' : 'Property Advisor')
                : (locale === 'ar' ? 'مساعد منصة تمليك' : 'Tamleeq Assistant')
              }
            </h3>
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

      {/* Content Gating Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-surface-50 to-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03] pointer-events-none z-0" />
        
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm relative shrink-0 z-10">
          <Lock className="w-6 h-6 animate-pulse" />
          <span className="absolute -top-1 -end-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
        </div>

        <h3 className="text-lg font-bold text-charcoal mb-3 relative z-10">
          {locale === 'ar' ? 'تحدث مع مساعدنا العقاري الذكي' : 'Speak with our AI Property Advisor'}
        </h3>
        
        <p className="text-xs text-charcoal-muted leading-relaxed max-w-sm mb-8 font-medium relative z-10">
          {locale === 'ar' 
            ? 'سجل دخولك أو أنشئ حساباً جديداً للحصول على تفاصيل الاتصال المباشر بالعقارات.'
            : 'Sign in or create an account to get direct contact access to properties.'}
        </p>

        <div className="w-full max-w-xs space-y-3 shrink-0 relative z-10">
          <button
            onClick={() => router.push(`/${locale}/auth/login?returnTo=${encodeURIComponent(pathname)}`)}
            className="w-full py-3.5 bg-primary-600 text-white rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-primary-600/20 hover:bg-primary-700 active:scale-95 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            {locale === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
          </button>
          <button
            onClick={() => router.push(`/${locale}/auth/register?returnTo=${encodeURIComponent(pathname)}`)}
            className="w-full py-3.5 border-2 border-charcoal text-charcoal rounded-2xl flex items-center justify-center font-bold text-sm hover:bg-surface-50 active:scale-95 transition-all cursor-pointer"
          >
            {locale === 'ar' ? 'إنشاء حساب' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  ) : (
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
            <h3 className="text-sm font-bold text-charcoal">
              {(mode === 'qualification' || mode === 'project_qualification')
                ? (locale === 'ar' ? 'مساعد العقارات' : 'Property Advisor')
                : (locale === 'ar' ? 'مساعد منصة تمليك' : 'Tamleeq Assistant')
              }
            </h3>
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
                className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed shadow-sm rounded-2xl whitespace-pre-wrap ${
                  msg.role === 'assistant'
                    ? 'bg-surface-50 text-charcoal border border-surface-100'
                    : 'bg-primary-600 text-white'
                } ${locale === 'ar' ? 'font-arabic' : 'font-medium'}`}
              >
                {renderMessageContent(msg.content, msg.role)}
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
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            disabled={loading}
            className={`flex-1 bg-transparent px-3 py-1.5 text-sm text-charcoal placeholder-charcoal-muted outline-none disabled:opacity-50 resize-none max-h-32 overflow-y-auto leading-relaxed ${locale === 'ar' ? 'font-arabic text-right' : ''}`}
            style={{ height: '38px' }}
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
          {(!open && showBubble) && (
            <motion.button
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 20 }}
              onClick={() => setOpen(true)}
              className="fixed bottom-24 md:bottom-6 end-6 w-16 h-16 bg-primary-600 text-white rounded-2xl shadow-2xl z-50 flex items-center justify-center hover:bg-primary-700 hover:scale-105 active:scale-95 transition-all group"
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
              className="fixed bottom-24 md:bottom-6 end-6 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-8rem)] rounded-3xl overflow-hidden z-50 border border-surface-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex flex-col"
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
