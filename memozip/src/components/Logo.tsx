import { cn } from '@/utils/cn';
import logo from '@/assets/nobglogo.png';

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 m-2 font-semibold tracking-tight', className)}>
      <img src={logo} alt="MemoZip" className="h-7 w-7 m-2 rounded-md" />
      <span className="text-[17px]">MemoZip</span>
    </span>
  );
}