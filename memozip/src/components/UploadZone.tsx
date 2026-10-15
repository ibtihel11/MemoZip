import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { MAX_FILE_MB } from '@/utils/validation';

interface Props {
  onFile: (file: File) => void;
  error?: string | null;
  className?: string;
}

export function UploadZone({ onFile, error, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  const browse = () => inputRef.current?.click();

  return (
    <div className={className}>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          depth.current += 1;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          depth.current = 0;
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
        className={cn(
          'flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition duration-150 sm:py-14',
          dragging ? 'border-accent bg-accent/10' : 'border-border-strong bg-surface hover:border-accent/60',
          error && !dragging && 'border-warn/60',
        )}
      >
        <span className="grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent-text">
          <UploadCloud size={26} aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-semibold">Upload your course</h2>
        <p className="mt-1.5 text-muted">
          {dragging ? 'Drop your PDF to start' : 'Drop a PDF here or browse files'}
        </p>
        <Button size="lg" className="mt-6" onClick={browse}>
          Upload document
        </Button>
        <p className="mt-4 text-sm text-subtle">PDF only, up to {MAX_FILE_MB} MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          aria-label="Choose a PDF file"
          tabIndex={-1}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onFile(file);
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-3 text-center text-sm text-warn-text">
          {error}
        </p>
      )}
    </div>
  );
}
