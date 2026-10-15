import { Compass } from 'lucide-react';
import { EmptyState } from '@/components/States';
import { ButtonLink } from '@/components/ui/Button';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Page not found');
  return (
    <EmptyState icon={Compass} title="We can't find that page" description="The link may be old, or the item may have been deleted.">
      <ButtonLink to="/">Back to home</ButtonLink>
      <ButtonLink to="/library" variant="secondary">Open library</ButtonLink>
    </EmptyState>
  );
}
