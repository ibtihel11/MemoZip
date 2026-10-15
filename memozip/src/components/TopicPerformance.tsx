import { AlertTriangle, Check } from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import type { TopicScore } from '@/types';
import { masteryTone } from '@/utils/scoring';
import { cn } from '@/utils/cn';

/**
 * Strong topics use mint, weak topics use orange.
 * Every row also carries an icon and a word, so color is never the only signal.
 */
export function TopicPerformance({ topics }: { topics: TopicScore[] }) {
  const sorted = [...topics].sort((a, b) => b.score - a.score);
  return (
    <ul className="divide-y divide-border">
      {sorted.map((t) => {
        const tone = masteryTone(t.score);
        return (
          <li key={t.topicId} className="py-3.5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="font-medium">{t.topicName}</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-medium',
                    tone === 'strong' && 'text-mint-text',
                    tone === 'weak' && 'text-warn-text',
                    tone === 'good' && 'text-subtle',
                  )}
                >
                  {tone === 'strong' && <Check size={14} aria-hidden="true" />}
                  {tone === 'weak' && <AlertTriangle size={14} aria-hidden="true" />}
                  {tone === 'strong' ? 'Strong' : tone === 'weak' ? 'Needs review' : 'Getting there'}
                </span>
              </div>
              <span className="tabular-nums font-semibold">{t.score}%</span>
            </div>
            <ProgressBar value={t.score} tone={tone === 'strong' ? 'mint' : tone === 'weak' ? 'warn' : 'accent'} label={`${t.topicName} mastery`} />
          </li>
        );
      })}
    </ul>
  );
}
