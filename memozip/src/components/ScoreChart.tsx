import type { QuizAttempt } from '@/types';
import { formatShortDate } from '@/utils/format';

/** Simple SVG line chart of scores across attempts (oldest on the left). */
export function ScoreChart({ attempts }: { attempts: QuizAttempt[] }) {
  const data = [...attempts].sort((a, b) => +new Date(a.completedAt) - +new Date(b.completedAt));
  if (data.length < 2) return null;

  const W = 560, H = 190, padL = 36, padR = 20, padT = 20, padB = 34;
  const x = (i: number) => padL + (i * (W - padL - padR)) / (data.length - 1);
  const y = (v: number) => padT + ((100 - v) * (H - padT - padB)) / 100;
  const line = data.map((a, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(a.score)}`).join(' ');
  const summary = data.map((a) => `${formatShortDate(a.completedAt)}: ${a.score}%`).join(', ');

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Score by attempt. ${summary}`} className="h-auto w-full">
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} className="stroke-border" strokeDasharray={g === 0 ? undefined : '3 5'} />
            <text x={padL - 8} y={y(g) + 4} textAnchor="end" className="fill-subtle text-[11px]">{g}%</text>
          </g>
        ))}
        <path d={line} fill="none" className="stroke-accent" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((a, i) => (
          <g key={a.id}>
            <circle cx={x(i)} cy={y(a.score)} r="5" className="fill-surface stroke-accent" strokeWidth="2.5" />
            <text x={x(i)} y={y(a.score) - 12} textAnchor="middle" className="fill-fg text-[12px] font-semibold">{a.score}%</text>
            <text x={x(i)} y={H - 10} textAnchor="middle" className="fill-subtle text-[11px]">{formatShortDate(a.completedAt)}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
