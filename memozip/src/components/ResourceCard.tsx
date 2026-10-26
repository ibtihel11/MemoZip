import { Link } from 'react-router-dom';
import { Brain, FileText, Folder as FolderIcon, MoreHorizontal, StickyNote, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Dropdown, type MenuItem } from '@/components/ui/Dropdown';
import type { Resource, ResourceType } from '@/types';
import { resourceMeta, resourcePath, typeLabel } from '@/utils/resources';

export const typeIcon: Record<ResourceType, LucideIcon> = {
  document: FileText,
  quiz: Brain,
  summary: StickyNote,
};

interface Props {
  resource: Resource;
  menu?: MenuItem[];
  folderName?: string;
}

export function ResourceCard({ resource, menu, folderName }: Props) {
  const Icon = typeIcon[resource.type];
  return (
    <Card
      interactive
      className="relative flex items-center gap-4 p-4 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-accent"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent-text">
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[0.9375rem] font-semibold">
          <Link to={resourcePath(resource)} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {resource.title}
          </Link>
        </h3>
        <p className="truncate text-sm text-muted">
          {typeLabel[resource.type]}
          {resource.sourceTitle ? ` · ${resource.sourceTitle}` : ''}
        </p>
        <p className="mt-0.5 truncate text-sm text-subtle">{resourceMeta(resource)}</p>
      </div>
      {folderName && (
        <Badge className="relative hidden shrink-0 sm:inline-flex" icon={<FolderIcon size={12} aria-hidden="true" />}>
          {folderName}
        </Badge>
      )}
      {menu && (
        <div className="relative shrink-0">
          <Dropdown
            label={`Actions for ${resource.title}`}
            items={menu}
            triggerClassName="grid h-9 w-9 place-items-center rounded-lg text-subtle transition hover:bg-surface2 hover:text-fg"
          >
            <MoreHorizontal size={18} aria-hidden="true" />
          </Dropdown>
        </div>
      )}
    </Card>
  );
}
