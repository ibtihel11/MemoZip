import { useState, type ReactNode } from 'react';
import { FolderInput, FolderMinus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, NameDialog } from '@/components/ui/ConfirmDialog';
import type { MenuItem } from '@/components/ui/Dropdown';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/services/api';
import { useQuery } from '@/hooks/useQuery';
import type { Resource } from '@/types';
import { cn } from '@/utils/cn';
import { typeLabel } from '@/utils/resources';

/**
 * Shared menu + dialogs for renaming, moving and deleting a resource.
 * Usage: const { getMenu, dialogs } = useResourceActions(); render {dialogs} once.
 */
export function useResourceActions(options: { onDeleted?: (r: Resource) => void } = {}): {
  getMenu: (r: Resource) => MenuItem[];
  dialogs: ReactNode;
} {
  const [renaming, setRenaming] = useState<Resource | null>(null);
  const [moving, setMoving] = useState<Resource | null>(null);
  const [deleting, setDeleting] = useState<Resource | null>(null);

  const getMenu = (r: Resource): MenuItem[] => [
    { label: 'Rename', icon: <Pencil size={16} />, onSelect: () => setRenaming(r) },
    { label: 'Move to folder', icon: <FolderInput size={16} />, onSelect: () => setMoving(r) },
    ...(r.folderId
      ? [{ label: 'Remove from folder', icon: <FolderMinus size={16} />, onSelect: () => void api.resources.move(r, null) }]
      : []),
    { label: 'Delete', icon: <Trash2 size={16} />, tone: 'danger' as const, separatorBefore: true, onSelect: () => setDeleting(r) },
  ];

  const dialogs = (
    <>
      <NameDialog
        open={!!renaming}
        title={`Rename ${renaming ? typeLabel[renaming.type].toLowerCase() : ''}`}
        label="Name"
        initialValue={renaming?.title ?? ''}
        onSubmit={(v) => api.resources.rename(renaming!, v)}
        onClose={() => setRenaming(null)}
      />
      <MoveDialog resource={moving} onClose={() => setMoving(null)} />
      <ConfirmDialog
        open={!!deleting}
        destructive
        title={`Delete “${deleting?.title ?? ''}”?`}
        description={
          deleting?.type === 'document'
            ? 'This also deletes the quizzes, results and summaries created from this document. This can’t be undone.'
            : deleting?.type === 'quiz'
              ? 'The quiz and all of its attempts will be deleted. This can’t be undone.'
              : 'This summary will be deleted. This can’t be undone.'
        }
        confirmLabel="Delete"
        onConfirm={async () => {
          await api.resources.remove(deleting!);
          options.onDeleted?.(deleting!);
        }}
        onClose={() => setDeleting(null)}
      />
    </>
  );

  return { getMenu, dialogs };
}

function MoveDialog({ resource, onClose }: { resource: Resource | null; onClose: () => void }) {
  const folders = useQuery(() => api.folders.list(), []);
  const [target, setTarget] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const selected = target === undefined ? resource?.folderId ?? null : target;

  const close = () => {
    setTarget(undefined);
    onClose();
  };

  const options: { id: string | null; name: string }[] = [{ id: null, name: 'No folder' }, ...(folders.data ?? []).map((f) => ({ id: f.id, name: f.name }))];

  return (
    <Modal
      open={!!resource}
      onClose={close}
      title="Move to folder"
      description={resource ? `Choose where “${resource.title}” should live.` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              await api.resources.move(resource!, selected);
              setBusy(false);
              close();
            }}
          >
            Move
          </Button>
        </>
      }
    >
      <div role="radiogroup" aria-label="Folder" className="max-h-64 space-y-1 overflow-y-auto">
        {options.map((o) => (
          <label key={o.id ?? 'none'} className="relative block">
            <input type="radio" name="folder" className="peer sr-only" checked={selected === o.id} onChange={() => setTarget(o.id)} />
            <span
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition',
                'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent',
                selected === o.id ? 'border-accent bg-accent/10' : 'border-border hover:bg-surface2',
              )}
            >
              <span className={cn('grid h-4 w-4 place-items-center rounded-full border', selected === o.id ? 'border-accent' : 'border-border-strong')}>
                {selected === o.id && <span className="h-2 w-2 rounded-full bg-accent" />}
              </span>
              {o.name}
            </span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
