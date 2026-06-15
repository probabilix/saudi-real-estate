'use client';
import clsx from 'clsx';

const SOURCE_CONFIG = {
  META_ADS:  { label: 'Meta',      bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',   dot: '#1877F2' },
  SNAPCHAT:  { label: 'Snapchat',  bg: 'bg-yellow-50',  text: 'text-yellow-700', border: 'border-yellow-300', dot: '#FFFC00' },
  TIKTOK:    { label: 'TikTok',    bg: 'bg-rose-50',    text: 'text-rose-700',   border: 'border-rose-200',   dot: '#fe2c55' },
  WHATSAPP:  { label: 'WhatsApp',  bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200',dot: '#25D366' },
  MANUAL:    { label: 'Manual',    bg: 'bg-surface-100',text: 'text-surface-600',border: 'border-surface-200',dot: '#94a3b8' },
} as const;

type Source = keyof typeof SOURCE_CONFIG;

interface SourceBadgeProps {
  source: string;
  compact?: boolean;
}

export default function SourceBadge({ source, compact = false }: SourceBadgeProps) {
  const cfg = SOURCE_CONFIG[source as Source] ?? SOURCE_CONFIG.MANUAL;

  if (compact) {
    return (
      <div className={clsx('inline-flex items-center justify-center w-5 h-5 rounded-full border shrink-0', cfg.bg, cfg.border)} title={cfg.label}>
        <div className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
      </div>
    );
  }

  return (
    <span className={clsx('badge border', cfg.bg, cfg.text, cfg.border)}>
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}
