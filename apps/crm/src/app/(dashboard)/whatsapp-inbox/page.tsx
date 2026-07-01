'use client';
import { useState, useRef, useEffect } from 'react';
import { CrmTopBar } from '@/components/CrmSidebar';
import {
  Search, Send, Bot, User, Phone, MessageCircle,
  CheckCheck, Check, ChevronRight, AlertCircle,
  UserCheck, BrainCircuit, Zap, ZapOff, HandMetal, Star, MapPin,
  Banknote, CalendarClock, Home, ArrowUpRight
} from 'lucide-react';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────

type AiMode = 'ON' | 'MONITORING' | 'OFF';
type MessageRole = 'user' | 'ai' | 'agent';
type ConvStatus = 'QUALIFYING' | 'QUALIFIED' | 'NEEDS_AGENT' | 'CLOSED' | 'NEW';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
}

interface Qualification {
  budget: string | null;
  city: string | null;
  purpose: string | null;
  timeline: string | null;
  score: number;
}

interface Conversation {
  id: string;
  phone: string;
  name: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  aiMode: AiMode;
  status: ConvStatus;
  qualification: Qualification;
  messages: Message[];
  flaggedForAgent: boolean;
}

// ─── Rich Mock Data ───────────────────────────────────────────────────────────

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    phone: '+966 50 123 4567',
    name: 'Mohammed Al-Rashid',
    lastMessage: 'What is the payment plan for the Riyadh Hills project?',
    lastMessageAt: '2 min ago',
    unreadCount: 3,
    aiMode: 'ON',
    status: 'QUALIFYING',
    flaggedForAgent: false,
    qualification: { budget: 'SAR 1.2M – 1.8M', city: 'Riyadh', purpose: 'Investment', timeline: null, score: 62 },
    messages: [
      { id: 'm1', role: 'user', content: 'السلام عليكم، أنا مهتم ببروجيكت ريادة هيلز', timestamp: '10:15 AM', status: 'read' },
      { id: 'm2', role: 'ai', content: 'وعليكم السلام ورحمة الله! أنا سارة من تمليك. سعيدة باهتمامك بمشروع ريادة هيلز 🏡\n\nلأتمكن من مساعدتك بشكل أفضل، ما هو النطاق الميزانية الذي تفكر فيه؟', timestamp: '10:15 AM', status: 'read' },
      { id: 'm3', role: 'user', content: 'الميزانية بين 1.2 و 1.8 مليون ريال', timestamp: '10:17 AM', status: 'read' },
      { id: 'm4', role: 'ai', content: 'ممتاز! هذا يتوافق مع عدة وحدات في المشروع 🎯\n\nهل أنت تبحث للسكن الشخصي أم للاستثمار؟', timestamp: '10:17 AM', status: 'read' },
      { id: 'm5', role: 'user', content: 'للاستثمار بشكل رئيسي، أبحث عن عائد إيجاري جيد', timestamp: '10:19 AM', status: 'read' },
      { id: 'm6', role: 'ai', content: 'اختيار ممتاز! ريادة هيلز تقدم عائد إيجاري متوقع من 7-9% سنوياً في منطقة شمال الرياض 📈\n\nهل تفضل الرياض تحديداً؟ أم لديك مدن أخرى بالاعتبار؟', timestamp: '10:20 AM', status: 'read' },
      { id: 'm7', role: 'user', content: 'الرياض أفضل، ما هي خطط السداد للمشروع؟', timestamp: '10:22 AM', status: 'read' },
    ],
  },
  {
    id: '2',
    phone: '+966 55 987 6543',
    name: 'Sara Al-Ahmadi',
    lastMessage: 'I need to speak with a human agent please',
    lastMessageAt: '8 min ago',
    unreadCount: 1,
    aiMode: 'OFF',
    status: 'NEEDS_AGENT',
    flaggedForAgent: true,
    qualification: { budget: 'SAR 2.5M+', city: 'Jeddah', purpose: 'End-use', timeline: 'Immediate', score: 88 },
    messages: [
      { id: 'm1', role: 'user', content: 'Hi, I saw your ad for the Al-Nakheel compound in Jeddah', timestamp: '9:45 AM', status: 'read' },
      { id: 'm2', role: 'ai', content: 'Hello! I\'m Sara from Tamleeq 😊 Great to hear you\'re interested in Al-Nakheel Compound! It\'s one of our premium gated communities in North Jeddah.\n\nWhat budget range are you considering?', timestamp: '9:45 AM', status: 'read' },
      { id: 'm3', role: 'user', content: 'Budget is around 2.5 to 3 million. Looking for a villa for the family', timestamp: '9:47 AM', status: 'read' },
      { id: 'm4', role: 'ai', content: 'Excellent! We have beautiful 4-bedroom and 5-bedroom villas within your budget starting from SAR 2.4M 🏘️\n\nAre you looking to move in immediately, or is a 6-12 month timeline okay?', timestamp: '9:47 AM', status: 'read' },
      { id: 'm5', role: 'user', content: 'We want to move in within 3 months maximum', timestamp: '9:50 AM', status: 'read' },
      { id: 'm6', role: 'ai', content: 'Perfect! We have ready villas available for immediate handover. Let me check the exact availability for you.\n\nWould you like to schedule a site visit this week? Our show unit is available Thursday and Friday. 📅', timestamp: '9:51 AM', status: 'read' },
      { id: 'm7', role: 'user', content: 'Yes but I need to speak with a human agent please, I have specific questions about the compound rules', timestamp: '9:53 AM', status: 'read' },
      { id: 'm8', role: 'agent', content: '✋ AI handed over to agent. Connecting you with our specialist now.', timestamp: '9:53 AM' },
      { id: 'm9', role: 'user', content: 'I need to speak with a human agent please', timestamp: '9:55 AM', status: 'delivered' },
    ],
  },
  {
    id: '3',
    phone: '+966 54 456 7890',
    name: 'Ahmed Khalid',
    lastMessage: 'شكراً، سأتواصل معكم لاحقاً',
    lastMessageAt: '25 min ago',
    unreadCount: 0,
    aiMode: 'MONITORING',
    status: 'QUALIFIED',
    flaggedForAgent: false,
    qualification: { budget: 'SAR 800K – 1.1M', city: 'Dammam', purpose: 'End-use', timeline: '3–6 months', score: 75 },
    messages: [
      { id: 'm1', role: 'user', content: 'مرحبا، أبحث عن شقة في الدمام', timestamp: '9:00 AM', status: 'read' },
      { id: 'm2', role: 'ai', content: 'أهلاً بك! أنا سارة من تمليك 🏠 الدمام مدينة رائعة!\n\nما الميزانية التي تفكر بها؟', timestamp: '9:00 AM', status: 'read' },
      { id: 'm3', role: 'user', content: 'حوالي 900 ألف إلى مليون ريال', timestamp: '9:02 AM', status: 'read' },
      { id: 'm4', role: 'ai', content: 'ممتاز! لدينا مجموعة جميلة من الشقق في هذا النطاق في الدمام والخبر.\n\nهل للسكن الشخصي؟', timestamp: '9:02 AM', status: 'read' },
      { id: 'm5', role: 'user', content: 'نعم للسكن، أخطط خلال 3-6 أشهر', timestamp: '9:04 AM', status: 'read' },
      { id: 'm6', role: 'ai', content: 'ممتاز! تم تسجيل متطلباتك ✅ سيتواصل معك متخصصنا خلال 24 ساعة بأفضل الخيارات المتاحة في الدمام ضمن ميزانيتك 📞', timestamp: '9:04 AM', status: 'read' },
      { id: 'm7', role: 'user', content: 'شكراً، سأتواصل معكم لاحقاً', timestamp: '9:06 AM', status: 'read' },
    ],
  },
  {
    id: '4',
    phone: '+966 50 111 2233',
    name: 'Faisal Al-Otaibi',
    lastMessage: 'New message received',
    lastMessageAt: '1 hr ago',
    unreadCount: 0,
    aiMode: 'ON',
    status: 'NEW',
    flaggedForAgent: false,
    qualification: { budget: null, city: null, purpose: null, timeline: null, score: 0 },
    messages: [
      { id: 'm1', role: 'user', content: 'Hello', timestamp: '8:30 AM', status: 'read' },
      { id: 'm2', role: 'ai', content: 'Hello! I\'m Sara from Tamleeq 👋 How can I help you today? Are you looking to buy or invest in real estate in Saudi Arabia?', timestamp: '8:30 AM', status: 'read' },
      { id: 'm3', role: 'user', content: 'Yes I saw your ad', timestamp: '8:32 AM', status: 'read' },
    ],
  },
  {
    id: '5',
    phone: '+966 58 222 3344',
    name: 'Noura Al-Zahrani',
    lastMessage: 'Thank you! Looking forward to the site visit',
    lastMessageAt: '2 hr ago',
    unreadCount: 0,
    aiMode: 'OFF',
    status: 'CLOSED',
    flaggedForAgent: false,
    qualification: { budget: 'SAR 1.5M', city: 'Riyadh', purpose: 'End-use', timeline: 'Immediate', score: 95 },
    messages: [
      { id: 'm1', role: 'user', content: 'Hi, I want to book a site visit for Nad Al Shiba project', timestamp: '7:00 AM', status: 'read' },
      { id: 'm2', role: 'ai', content: 'Hi Noura! Absolutely, we\'d love to have you visit. Let me connect you with our team to schedule the most convenient time for you 📅', timestamp: '7:00 AM', status: 'read' },
      { id: 'm3', role: 'agent', content: 'Hi Noura! This is Khaled from Tamleeq. I\'ve booked your site visit for Saturday 10 AM. I\'ll send you the location and details now.', timestamp: '7:05 AM' },
      { id: 'm4', role: 'user', content: 'Thank you! Looking forward to the site visit', timestamp: '7:06 AM', status: 'read' },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function AiModeBadge({ mode }: { mode: AiMode }) {
  const config = {
    ON:         { label: 'AI: ON',          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
    MONITORING: { label: 'AI: Monitoring',  bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   dot: 'bg-amber-400' },
    OFF:        { label: 'AI: OFF',          bg: 'bg-surface-700/50 text-surface-400 border-surface-600', dot: 'bg-surface-500' },
  }[mode];
  return (
    <span className={clsx('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border', config.bg)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}

function StatusBadge({ status }: { status: ConvStatus }) {
  const config: Record<ConvStatus, { label: string; className: string }> = {
    NEW:         { label: 'New',          className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    QUALIFYING:  { label: 'Qualifying',   className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    QUALIFIED:   { label: 'Qualified ✓',  className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    NEEDS_AGENT: { label: '⚡ Needs Agent', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    CLOSED:      { label: 'Closed',       className: 'bg-surface-600/50 text-surface-400 border-surface-600' },
  };
  const c = config[status];
  return <span className={clsx('px-1.5 py-0.5 rounded-md text-[10px] font-bold border', c.className)}>{c.label}</span>;
}

function QualScore({ score }: { score: number }) {
  const color = score >= 75 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-surface-500';
  const ring = score >= 75 ? 'stroke-emerald-400' : score >= 40 ? 'stroke-amber-400' : 'stroke-surface-600';
  const r = 14; const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-surface-700" />
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="2.5" className={ring}
          strokeDasharray={circ} strokeDashoffset={circ - (circ * score / 100)} strokeLinecap="round" />
      </svg>
      <span className={clsx('text-[11px] font-black relative z-10', color)}>{score}</span>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  const isAgent = msg.role === 'agent';
  const isAi = msg.role === 'ai';

  if (isAgent) {
    return (
      <div className="flex items-center gap-2 my-3">
        <div className="flex-1 h-px bg-surface-700" />
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full text-xs text-blue-400 font-medium shrink-0">
          <UserCheck className="w-3 h-3" />
          {msg.content}
        </div>
        <div className="flex-1 h-px bg-surface-700" />
      </div>
    );
  }

  return (
    <div className={clsx('flex items-end gap-2 mb-3', isUser ? 'flex-row' : 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={clsx(
        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-1',
        isUser ? 'bg-surface-700 text-surface-300' : 'bg-primary-600/20 text-primary-400'
      )}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Bubble */}
      <div className={clsx(
        'max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
        isUser
          ? 'bg-surface-800 text-surface-100 rounded-bl-sm border border-surface-700'
          : 'bg-primary-600 text-white rounded-br-sm'
      )}>
        <p className="whitespace-pre-wrap">{msg.content}</p>
        <div className={clsx('flex items-center gap-1 mt-1', isUser ? 'justify-start' : 'justify-end')}>
          <span className={clsx('text-[10px]', isUser ? 'text-surface-500' : 'text-primary-200')}>
            {msg.timestamp}
          </span>
          {!isUser && msg.status && (
            msg.status === 'read'
              ? <CheckCheck className="w-3 h-3 text-primary-200" />
              : <Check className="w-3 h-3 text-primary-200" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WhatsAppInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string>(MOCK_CONVERSATIONS[0].id);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showMobileThread, setShowMobileThread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selected = conversations.find(c => c.id === selectedId);

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);
  const needsAgent = conversations.filter(c => c.flaggedForAgent).length;

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedId, conversations]);

  // Mark as read when selecting
  function selectConv(id: string) {
    setSelectedId(id);
    setShowMobileThread(true);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
  }

  // Toggle AI mode
  function toggleAiMode(mode: AiMode) {
    setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, aiMode: mode } : c));
  }

  // Send agent reply (demo)
  async function sendReply() {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    const newMsg: Message = {
      id: `m${Date.now()}`,
      role: 'agent',
      content: replyText.trim(),
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };
    setConversations(prev => prev.map(c =>
      c.id === selectedId
        ? { ...c, messages: [...c.messages, newMsg], lastMessage: replyText.trim(), lastMessageAt: 'just now' }
        : c
    ));
    setReplyText('');
    setSending(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  // Flag for agent
  function flagForAgent() {
    setConversations(prev => prev.map(c =>
      c.id === selectedId
        ? { ...c, flaggedForAgent: !c.flaggedForAgent, status: !c.flaggedForAgent ? 'NEEDS_AGENT' : 'QUALIFYING', aiMode: !c.flaggedForAgent ? 'OFF' : c.aiMode }
        : c
    ));
  }

  const filtered = conversations.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col h-screen bg-[#0f1117] overflow-hidden">
      <CrmTopBar
        title="WhatsApp Inbox"
        subtitle={`${totalUnread} unread · ${needsAgent} need agent`}
      />

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Conversation List ───────────────────────── */}
        <div className={clsx(
          'w-full md:w-80 lg:w-96 flex flex-col border-r border-surface-800 bg-[#12151e] shrink-0',
          showMobileThread ? 'hidden md:flex' : 'flex'
        )}>
          {/* Header */}
          <div className="p-4 border-b border-surface-800 space-y-3">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total', value: conversations.length, color: 'text-white' },
                { label: 'Unread', value: totalUnread, color: 'text-amber-400' },
                { label: 'Needs Agent', value: needsAgent, color: 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="bg-surface-800/50 rounded-xl p-2 text-center">
                  <div className={clsx('text-lg font-black', s.color)}>{s.value}</div>
                  <div className="text-[10px] text-surface-500 font-medium">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
              <input
                className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-9 pr-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:border-primary-500/50"
                placeholder="Search name or number…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {/* Status filter */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: 'All', value: '' },
                { label: '⚡ Agent', value: 'NEEDS_AGENT' },
                { label: 'Qualifying', value: 'QUALIFYING' },
                { label: 'Qualified', value: 'QUALIFIED' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilterStatus(f.value)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                    filterStatus === f.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-800 text-surface-400 hover:bg-surface-700'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto divide-y divide-surface-800/50">
            {filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => selectConv(conv.id)}
                className={clsx(
                  'w-full text-left px-4 py-3.5 transition-all hover:bg-surface-800/50 relative group',
                  selectedId === conv.id && 'bg-primary-600/10 border-r-2 border-primary-500'
                )}
              >
                {/* Flagged indicator */}
                {conv.flaggedForAgent && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}

                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={clsx(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-black',
                      conv.status === 'NEEDS_AGENT' ? 'bg-red-500/20 text-red-400' :
                      conv.status === 'QUALIFIED' ? 'bg-emerald-500/20 text-emerald-400' :
                      'bg-primary-600/20 text-primary-400'
                    )}>
                      {conv.name.charAt(0)}
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary-500 text-white text-[10px] font-black flex items-center justify-center">
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={clsx('text-sm font-bold truncate', conv.unreadCount > 0 ? 'text-white' : 'text-surface-200')}>
                        {conv.name}
                      </span>
                      <span className="text-[10px] text-surface-500 shrink-0 ml-2">{conv.lastMessageAt}</span>
                    </div>
                    <div className="text-[11px] text-surface-500 truncate mb-1.5">{conv.phone}</div>
                    <p className={clsx('text-xs truncate mb-1.5', conv.unreadCount > 0 ? 'text-surface-300' : 'text-surface-500')}>
                      {conv.lastMessage}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <AiModeBadge mode={conv.aiMode} />
                      <StatusBadge status={conv.status} />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Thread View ────────────────────────────── */}
        {selected ? (
          <div className={clsx(
            'flex-1 flex flex-col overflow-hidden',
            !showMobileThread && 'hidden md:flex'
          )}>

            {/* Thread Header */}
            <div className="bg-[#12151e] border-b border-surface-800 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMobileThread(false)}
                  className="md:hidden p-1.5 text-surface-400 hover:text-white"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <div className={clsx(
                  'w-9 h-9 rounded-full flex items-center justify-center font-black text-sm',
                  selected.status === 'NEEDS_AGENT' ? 'bg-red-500/20 text-red-400' :
                  selected.status === 'QUALIFIED' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-primary-600/20 text-primary-400'
                )}>
                  {selected.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{selected.name}</span>
                    <StatusBadge status={selected.status} />
                  </div>
                  <div className="text-[11px] text-surface-500 flex items-center gap-2">
                    <Phone className="w-3 h-3" />
                    {selected.phone}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* AI Mode Toggle */}
                <div className="flex items-center bg-surface-800 rounded-xl p-1 gap-1 border border-surface-700">
                  {([['ON', Zap, 'text-emerald-400 bg-emerald-500/10'], ['MONITORING', BrainCircuit, 'text-amber-400 bg-amber-500/10'], ['OFF', ZapOff, 'text-surface-300 bg-surface-700']] as [AiMode, any, string][]).map(([mode, Icon, activeClass]) => (
                    <button
                      key={mode}
                      onClick={() => toggleAiMode(mode)}
                      className={clsx(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all',
                        selected.aiMode === mode ? activeClass : 'text-surface-500 hover:text-surface-300'
                      )}
                      title={`Set AI to ${mode}`}
                    >
                      <Icon className="w-3 h-3" />
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Flag for agent */}
                <button
                  onClick={flagForAgent}
                  className={clsx(
                    'p-2 rounded-xl transition-all border text-xs font-bold',
                    selected.flaggedForAgent
                      ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                      : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-amber-400'
                  )}
                  title={selected.flaggedForAgent ? 'Remove agent flag' : 'Flag for agent takeover'}
                >
                  <AlertCircle className="w-4 h-4" />
                </button>

                {/* Open WhatsApp */}
                <a
                  href={`https://wa.me/${selected.phone.replace(/\s+/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-surface-800 text-surface-400 border border-surface-700 hover:text-emerald-400 transition-all"
                  title="Open in WhatsApp"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">

              {/* Messages */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
                  {selected.messages.map(msg => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Box */}
                <div className="bg-[#12151e] border-t border-surface-800 p-4">
                  {selected.aiMode === 'ON' && (
                    <div className="mb-3 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/15 rounded-xl px-3 py-2">
                      <Bot className="w-3.5 h-3.5 shrink-0" />
                      <span><strong>AI is handling this conversation.</strong> Type here to override — your reply will be sent as agent and AI will pause.</span>
                    </div>
                  )}
                  {selected.aiMode === 'MONITORING' && (
                    <div className="mb-3 flex items-center gap-2 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/15 rounded-xl px-3 py-2">
                      <BrainCircuit className="w-3.5 h-3.5 shrink-0" />
                      <span><strong>AI is monitoring.</strong> Replies are drafted but await your approval before sending.</span>
                    </div>
                  )}
                  <div className="flex items-end gap-3">
                    <textarea
                      ref={textareaRef}
                      className="flex-1 bg-surface-800 border border-surface-700 rounded-2xl px-4 py-3 text-sm text-surface-100 placeholder-surface-500 resize-none focus:outline-none focus:border-primary-500/50 min-h-[44px] max-h-[120px] leading-relaxed"
                      placeholder="Type a message as agent…"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                      rows={1}
                    />
                    <button
                      onClick={sendReply}
                      disabled={!replyText.trim() || sending}
                      className="w-11 h-11 rounded-2xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── RIGHT SIDEBAR: Qualification Card ────── */}
              <div className="hidden xl:flex w-72 shrink-0 flex-col bg-[#12151e] border-l border-surface-800 overflow-y-auto">
                <div className="p-4 space-y-4">

                  {/* Lead Score */}
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-surface-500 mb-3">Qualification Score</div>
                    <div className="flex items-center gap-3">
                      <QualScore score={selected.qualification.score} />
                      <div>
                        <div className="text-sm font-bold text-white">
                          {selected.qualification.score >= 75 ? 'Hot Lead 🔥' :
                           selected.qualification.score >= 40 ? 'Warm Lead 🌡️' : 'Cold Lead ❄️'}
                        </div>
                        <div className="text-[11px] text-surface-500">AI confidence score</div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-surface-800" />

                  {/* Qualification details */}
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-surface-500 mb-3">Extracted Info</div>
                    <div className="space-y-2.5">
                      {[
                        { icon: Banknote,     label: 'Budget',   value: selected.qualification.budget },
                        { icon: MapPin,       label: 'City',     value: selected.qualification.city },
                        { icon: Home,         label: 'Purpose',  value: selected.qualification.purpose },
                        { icon: CalendarClock,label: 'Timeline', value: selected.qualification.timeline },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-lg bg-surface-800 flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className="w-3 h-3 text-primary-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[10px] text-surface-500 font-medium">{label}</div>
                            <div className={clsx('text-xs font-bold', value ? 'text-surface-100' : 'text-surface-600')}>
                              {value || 'Not captured yet'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-surface-800" />

                  {/* Message stats */}
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-surface-500 mb-3">Conversation</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Messages', value: selected.messages.length },
                        { label: 'AI replies', value: selected.messages.filter(m => m.role === 'ai').length },
                        { label: 'Agent replies', value: selected.messages.filter(m => m.role === 'agent').length },
                        { label: 'AI Mode', value: selected.aiMode },
                      ].map(s => (
                        <div key={s.label} className="bg-surface-800/50 rounded-xl p-2.5">
                          <div className="text-sm font-black text-white">{s.value}</div>
                          <div className="text-[10px] text-surface-500">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-surface-800" />

                  {/* Actions */}
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-surface-500 mb-3">Quick Actions</div>
                    <div className="space-y-2">
                      <button
                        onClick={flagForAgent}
                        className={clsx(
                          'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border',
                          selected.flaggedForAgent
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-surface-800 text-surface-300 border-surface-700 hover:border-red-500/30 hover:text-red-400'
                        )}
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        {selected.flaggedForAgent ? 'Remove Agent Flag' : 'Flag for Agent Takeover'}
                      </button>
                      <button
                        onClick={() => toggleAiMode('OFF')}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-surface-800 text-surface-300 border border-surface-700 hover:border-amber-500/30 hover:text-amber-400 transition-all"
                      >
                        <HandMetal className="w-3.5 h-3.5" />
                        Take Manual Control
                      </button>
                      <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                        <Star className="w-3.5 h-3.5" />
                        Mark as Qualified
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-surface-500 hidden md:flex">
            <div className="text-center space-y-3">
              <MessageCircle className="w-12 h-12 mx-auto opacity-20" />
              <p className="font-medium">Select a conversation</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
