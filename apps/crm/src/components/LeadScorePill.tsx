'use client';
import clsx from 'clsx';
import { Star } from 'lucide-react';

interface LeadScorePillProps {
  score: number;
  compact?: boolean;
  editable?: boolean;
  onScoreChange?: (score: number) => void;
}

export default function LeadScorePill({ score, compact = false, editable = false, onScoreChange }: LeadScorePillProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);

  if (compact) {
    if (score === 0) return null;
    return (
      <div className="flex items-center gap-0.5">
        {stars.slice(0, score).map(s => (
          <Star key={s} className="w-2.5 h-2.5 fill-gold text-gold" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {stars.map(s => (
        <button
          key={s}
          type="button"
          disabled={!editable}
          onClick={() => editable && onScoreChange?.(s === score ? 0 : s)}
          className={clsx(
            'transition-transform',
            editable ? 'hover:scale-125 cursor-pointer' : 'cursor-default'
          )}
          title={editable ? `Rate ${s} star${s !== 1 ? 's' : ''}` : undefined}
        >
          <Star className={clsx(
            'w-3.5 h-3.5',
            s <= score ? 'fill-gold text-gold' : 'text-surface-300'
          )} />
        </button>
      ))}
    </div>
  );
}
