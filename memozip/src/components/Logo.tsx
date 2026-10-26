import { cn } from '@/utils/cn';

/**
 * MemoZip mark: an "M" whose centre closes like a zipper, with the pull hanging from it
 * (memory, compressed). It is drawn with theme tokens, so it recolors with the active theme:
 * primary fill, and the glyph in the theme's on-primary color.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className={cn('shrink-0', className)}>
      <rect width="48" height="48" rx="14" className="fill-accent" />
      <path
        d="M12.5 33V14L24 25.5L35.5 14V33"
        fill="none"
        className="stroke-on-accent"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="21.5" y="26" width="5" height="9.5" rx="2.5" className="fill-on-accent" />
      <circle cx="24" cy="31.5" r="1.3" className="fill-accent" />
    </svg>
  );
}

export function Logo({
  className,
  size = 28,
  showWordmark = true,
  hideWordmarkOnMobile = false,
}: {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  /** Mark only below 640px, for tight bars. */
  hideWordmarkOnMobile?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 font-bold tracking-tight', className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className={cn('text-[1.25rem] leading-none', hideWordmarkOnMobile && 'hidden sm:inline')}>
          Memo<span className="text-accent-text">Zip</span>
        </span>
      )}
    </span>
  );
}
