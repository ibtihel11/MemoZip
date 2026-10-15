import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FolderPlus, Folder as FolderIcon, Pencil, Trash2 } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { PageHeader } from '@/components/PageHeader';
import { ResourceCard } from '@/components/ResourceCard';
import { useResourceActions } from '@/components/ResourceActions';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog, NameDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useQuery } from '@/hooks/useQuery';
import { api } from '@/services/api';
import type { Resource } from '@/types';
import { typeLabel } from '@/utils/resources';

export default function FolderPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const folder = useQuery(() => api.folders.get(id), [id]);
  const inFolder = useQuery(() => api.resources.list({ folderId: id }), [id]);
  const { getMenu, dialogs } = useResourceActions();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adding, setAdding] = useState(false);
  usePageTitle(folder.data?.name ?? 'Folder');

  if (folder.loading) return <LoadingState label="Opening folder…" />;
  if (folder.error || !folder.data) {
    return <ErrorState message="We couldn't find that folder. It may have been deleted." onRetry={() => navigate('/folders')} />;
  }
  const f = folder.data;

  return (
    <div>
      <PageHeader
        back={{ to: '/folders', label: 'All folders' }}
        title={f.name}
        subtitle={`${f.itemCount ?? 0} ${f.itemCount === 1 ? 'item' : 'items'}`}
        actions={
          <>
            <Button icon={<FolderPlus size={16} aria-hidden="true" />} onClick={() => setAdding(true)}>Add resources</Button>
            <Button variant="secondary" icon={<Pencil size={16} aria-hidden="true" />} onClick={() => setRenaming(true)}>Rename</Button>
            <Button variant="danger" icon={<Trash2 size={16} aria-hidden="true" />} onClick={() => setDeleting(true)}>Delete</Button>
          </>
        }
      />

      {inFolder.loading && <LoadingState label="Loading…" className="py-10" />}
      {inFolder.data && inFolder.data.length === 0 && (
        <EmptyState icon={FolderIcon} title="This folder is empty" description="Add courses, quizzes or summaries to keep them together.">
          <Button onClick={() => setAdding(true)}>Add resources</Button>
        </EmptyState>
      )}
      {inFolder.data && inFolder.data.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {inFolder.data.map((r) => (
            <li key={`${r.type}-${r.id}`}><ResourceCard resource={r} menu={getMenu(r)} /></li>
          ))}
        </ul>
      )}

      <AddResourcesModal folderId={id} open={adding} onClose={() => setAdding(false)} />
      <NameDialog open={renaming} title="Rename folder" label="Folder name" initialValue={f.name} onSubmit={(v) => api.folders.rename(id, v)} onClose={() => setRenaming(false)} />
      <ConfirmDialog
        open={deleting}
        destructive
        title={`Delete “${f.name}”?`}
        description="The folder is removed, but everything inside it stays in your library."
        confirmLabel="Delete folder"
        onConfirm={async () => {
          await api.folders.remove(id);
          navigate('/folders', { replace: true });
        }}
        onClose={() => setDeleting(false)}
      />
      {dialogs}
    </div>
  );
}

function AddResourcesModal({ folderId, open, onClose }: { folderId: string; open: boolean; onClose: () => void }) {
  const all = useQuery(() => api.resources.list(), []);
  const [selected, setSelected] = useState<Resource[]>([]);
  const [busy, setBusy] = useState(false);
  const candidates = (all.data ?? []).filter((r) => r.folderId !== folderId);
  const isSelected = (r: Resource) => selected.some((s) => s.type === r.type && s.id === r.id);

  const close = () => {
    setSelected([]);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add resources"
      description="Pick what belongs in this folder. Items already in another folder will be moved."
      footer={
        <>
          <Button variant="secondary" onClick={close}>Cancel</Button>
          <Button
            loading={busy}
            disabled={selected.length === 0}
            onClick={async () => {
              setBusy(true);
              await Promise.all(selected.map((r) => api.resources.move(r, folderId)));
              setBusy(false);
              close();
            }}
          >
            {selected.length > 0 ? `Add ${selected.length}` : 'Add'}
          </Button>
        </>
      }
    >
      {candidates.length === 0 ? (
        <p className="text-muted">Everything in your library is already in this folder.</p>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {candidates.map((r) => (
            <li key={`${r.type}-${r.id}`}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-surface2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-accent"
                  checked={isSelected(r)}
                  onChange={() => setSelected((s) => (isSelected(r) ? s.filter((x) => !(x.type === r.type && x.id === r.id)) : [...s, r]))}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.title}</span>
                  <span className="block text-xs text-subtle">{typeLabel[r.type]}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
