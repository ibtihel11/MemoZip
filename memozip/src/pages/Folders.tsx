import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Folder as FolderIcon, FolderPlus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog, NameDialog } from '@/components/ui/ConfirmDialog';
import { Dropdown } from '@/components/ui/Dropdown';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/services/api';
import type { Folder } from '@/types';

export default function Folders() {
  usePageTitle('Folders');
  const folders = useQuery(() => api.folders.list(), []);
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState<Folder | null>(null);
  const [deleting, setDeleting] = useState<Folder | null>(null);

  return (
    <div>
      <PageHeader
        title="Folders"
        subtitle="Group your courses, quizzes and summaries your way."
        actions={<Button icon={<FolderPlus size={16} aria-hidden="true" />} onClick={() => setCreating(true)}>New folder</Button>}
      />

      {folders.loading && <LoadingState label="Loading folders…" />}
      {folders.error && <ErrorState message={folders.error.message} onRetry={folders.refetch} />}

      {folders.data && folders.data.length === 0 && (
        <EmptyState icon={FolderIcon} title="No folders yet" description="Create a folder for each semester or subject to keep things tidy.">
          <Button onClick={() => setCreating(true)}>Create your first folder</Button>
        </EmptyState>
      )}

      {folders.data && folders.data.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {folders.data.map((f) => (
            <li key={f.id}>
              <Card interactive className="relative flex items-center gap-4 p-4 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-accent">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent-text">
                  <FolderIcon size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[15px] font-semibold">
                    <Link to={`/folders/${f.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">{f.name}</Link>
                  </h2>
                  <p className="text-sm text-muted">{f.itemCount ?? 0} {f.itemCount === 1 ? 'item' : 'items'}</p>
                </div>
                <div className="relative shrink-0">
                  <Dropdown
                    label={`Actions for ${f.name}`}
                    triggerClassName="grid h-9 w-9 place-items-center rounded-lg text-subtle transition hover:bg-surface2 hover:text-fg"
                    items={[
                      { label: 'Rename', icon: <Pencil size={16} />, onSelect: () => setRenaming(f) },
                      { label: 'Delete', icon: <Trash2 size={16} />, tone: 'danger', separatorBefore: true, onSelect: () => setDeleting(f) },
                    ]}
                  >
                    <MoreHorizontal size={18} aria-hidden="true" />
                  </Dropdown>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <NameDialog open={creating} title="New folder" label="Folder name" initialValue="" submitLabel="Create" onSubmit={(v) => api.folders.create(v).then(() => undefined)} onClose={() => setCreating(false)} />
      <NameDialog open={!!renaming} title="Rename folder" label="Folder name" initialValue={renaming?.name ?? ''} onSubmit={(v) => api.folders.rename(renaming!.id, v)} onClose={() => setRenaming(null)} />
      <ConfirmDialog
        open={!!deleting}
        destructive
        title={`Delete “${deleting?.name ?? ''}”?`}
        description="The folder is removed, but everything inside it stays in your library."
        confirmLabel="Delete folder"
        onConfirm={() => api.folders.remove(deleting!.id)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
